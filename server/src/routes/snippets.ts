import { Router } from 'express';
import { Types } from 'mongoose';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { Snippet } from '../models/Snippet';
import { snippetCreateSchema, snippetUpdateSchema } from '../utils/validators';
import { ydocUpdater, ydocs, getOrLoadDoc } from '../index';
import { redis } from '../db/redis';
import * as Y from 'yjs';

const router = Router();

function arraysEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let index = 0; index < a.length; index++) {
    if (a[index] !== b[index]) return false;
  }
  return true;
}

function parseSnippetId(id: string) {
  return Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;
}

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = snippetCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
  let { title, html, css, js, isPublic } = parsed.data;

  // Auto-number duplicate titles
  const baseTitle = title;
  let counter = 1;
  while (await Snippet.findOne({ owner: new Types.ObjectId(req.user!.id), title })) {
    title = `${baseTitle} ${counter}`;
    counter++;
  }

  const snippet = await Snippet.create({
    title,
    owner: new Types.ObjectId(req.user!.id),
    html: html || '',
    css: css || '',
    js: js || '',
    isPublic: isPublic !== undefined ? isPublic : true,
  });
  res.status(201).json(snippet);
});

router.get('/:id', optionalAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const snippetId = parseSnippetId(id);
  if (!snippetId) return res.status(400).json({ message: 'Invalid snippet ID' });
  const snippet = await Snippet.findById(snippetId);
  if (!snippet) return res.status(404).json({ message: 'Snippet not found' });

  // Authorization: only owner can access private snippets
  // Public snippets are readable by anyone
  if (!snippet.isPublic) {
    if (!req.user || snippet.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }

  snippet.views += 1;
  await snippet.save();
  res.json(snippet);
});

router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const snippetId = parseSnippetId(id);
  if (!snippetId) return res.status(400).json({ message: 'Invalid snippet ID' });
  const parsed = snippetUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
  const snippet = await Snippet.findById(snippetId);
  if (!snippet) return res.status(404).json({ message: 'Snippet not found' });
  if (snippet.owner.toString() !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
  
  // Optimistic concurrency: capture Yjs state before update
  const docName = `snippet-${id}`;
  const doc = await getOrLoadDoc(docName);
  let prevStateVector: Uint8Array | null = null;
  let prevContentHash: string | null = null;
  
  if (doc && (parsed.data.html !== undefined || parsed.data.css !== undefined || parsed.data.js !== undefined)) {
    // Capture state vector for optimistic concurrency check
    prevStateVector = Y.encodeStateVector(doc);
    // Capture content hash for additional safety
    const currentHtml = doc.getText('html').toString();
    const currentCss = doc.getText('css').toString();
    const currentJs = doc.getText('js').toString();
    prevContentHash = `${currentHtml.length}:${currentCss.length}:${currentJs.length}`;
  }
  
  Object.assign(snippet, parsed.data);
  await snippet.save();

  // Update Redis with the new code content for Yjs sync
  if (parsed.data.html !== undefined || parsed.data.css !== undefined || parsed.data.js !== undefined) {
    if (doc) {
      // Check for concurrent modifications using state vector
      const currentStateVector = Y.encodeStateVector(doc);
      const stateChanged = !arraysEqual(prevStateVector!, currentStateVector);
      
      // Additional content check
      const currentHtml = doc.getText('html').toString();
      const currentCss = doc.getText('css').toString();
      const currentJs = doc.getText('js').toString();
      const currentContentHash = `${currentHtml.length}:${currentCss.length}:${currentJs.length}`;
      const contentChanged = prevContentHash !== currentContentHash;
      
      if (stateChanged || contentChanged) {
        // Document was modified by another client concurrently
        console.warn(`Concurrent modification detected for ${docName}, rejecting REST update`);
        return res.status(409).json({ 
          message: 'Conflict: Document was modified by another user. Please refresh and try again.',
          conflict: true
        });
      }
      
      await ydocUpdater.update(docName, {
        html: parsed.data.html,
        css: parsed.data.css,
        js: parsed.data.js,
      });
    }
  }

  res.json(snippet);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const snippetId = parseSnippetId(id);
  if (!snippetId) return res.status(400).json({ message: 'Invalid snippet ID' });
  const snippet = await Snippet.findById(snippetId);
  if (!snippet) return res.status(404).json({ message: 'Snippet not found' });
  if (snippet.owner.toString() !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
  await snippet.deleteOne();
  res.status(204).send();
});

router.post('/:id/fork', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const snippetId = parseSnippetId(id);
  if (!snippetId) return res.status(400).json({ message: 'Invalid snippet ID' });
  const source = await Snippet.findById(snippetId);
  if (!source) return res.status(404).json({ message: 'Snippet not found' });
  if (!source.isPublic) {
    if (source.owner.toString() !== req.user!.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }
  }
  const fork = await Snippet.create({
    title: source.title + ' (fork)',
    owner: req.user!.id,
    html: source.html,
    css: source.css,
    js: source.js,
    isPublic: true,
  });
  source.forks += 1;
  await source.save();
  res.status(201).json(fork);
});

router.get('/', async (req, res) => {
  const requestedPage = Number.parseInt((req.query.page as string) || '1', 10);
  const requestedLimit = Number.parseInt((req.query.limit as string) || '10', 10);
  const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
  const limit = Number.isFinite(requestedLimit) ? Math.min(50, Math.max(1, requestedLimit)) : 10;
  const skip = (page - 1) * limit;
  const filter: any = { isPublic: true };
  if (req.query.owner) {
    // Validate ObjectId format before conversion
    if (Types.ObjectId.isValid(req.query.owner as string)) {
      filter.owner = new Types.ObjectId(req.query.owner as string);
    } else {
      return res.status(400).json({ message: 'Invalid owner ID format' });
    }
  }

  const [items, total] = await Promise.all([
    Snippet.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Snippet.countDocuments(filter),
  ]);
  res.json({ items, total, page, limit });
});

export default router;

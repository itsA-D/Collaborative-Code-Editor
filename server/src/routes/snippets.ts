import { Router } from 'express';
import { Types } from 'mongoose';
import { requireAuth, optionalAuth, AuthRequest } from '../middleware/auth';
import { Snippet } from '../models/Snippet';
import { snippetCreateSchema, snippetUpdateSchema } from '../utils/validators';
import { ydocUpdater, ydocs } from '../index';
import { redis } from '../db/redis';
import * as Y from 'yjs';

const router = Router();

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
  Object.assign(snippet, parsed.data);
  await snippet.save();

  // Update Redis with the new code content for Yjs sync
  if (parsed.data.html !== undefined || parsed.data.css !== undefined || parsed.data.js !== undefined) {
    const docName = `snippet-${id}`;
    const doc = ydocs.get(docName);

    if (doc) {
      // If Yjs doc exists in memory, use it and persist to Redis
      ydocUpdater.update(docName, {
        html: parsed.data.html,
        css: parsed.data.css,
        js: parsed.data.js,
      });
    } else {
      // No active Yjs connection - create a temp doc and save to Redis directly
      const tempDoc = new Y.Doc();
      if (parsed.data.html !== undefined) {
        tempDoc.getText('html').insert(0, parsed.data.html || '');
      }
      if (parsed.data.css !== undefined) {
        tempDoc.getText('css').insert(0, parsed.data.css || '');
      }
      if (parsed.data.js !== undefined) {
        tempDoc.getText('js').insert(0, parsed.data.js || '');
      }
      const state = Y.encodeStateAsUpdate(tempDoc);
      await redis.set(`yjs:${docName}`, Buffer.from(state));
      tempDoc.destroy();
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

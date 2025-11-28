import { Router } from 'express';
import { Types } from 'mongoose';
import { requireAuth, AuthRequest } from '../middleware/auth';
import { Snippet } from '../models/Snippet';
import { snippetCreateSchema, snippetUpdateSchema } from '../utils/validators';

const router = Router();

router.post('/', requireAuth, async (req: AuthRequest, res) => {
  const parsed = snippetCreateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
  const { title, html, css, js, isPublic } = parsed.data;
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

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const snippet = await Snippet.findById(id);
  if (!snippet) return res.status(404).json({ message: 'Snippet not found' });
  snippet.views += 1;
  await snippet.save();
  res.json(snippet);
});

router.put('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const parsed = snippetUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ message: 'Invalid input', errors: parsed.error.flatten() });
  const snippet = await Snippet.findById(id);
  if (!snippet) return res.status(404).json({ message: 'Snippet not found' });
  if (snippet.owner.toString() !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
  Object.assign(snippet, parsed.data);
  await snippet.save();
  res.json(snippet);
});

router.delete('/:id', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const snippet = await Snippet.findById(id);
  if (!snippet) return res.status(404).json({ message: 'Snippet not found' });
  if (snippet.owner.toString() !== req.user!.id) return res.status(403).json({ message: 'Forbidden' });
  await snippet.deleteOne();
  res.status(204).send();
});

router.post('/:id/fork', requireAuth, async (req: AuthRequest, res) => {
  const { id } = req.params;
  const source = await Snippet.findById(id);
  if (!source) return res.status(404).json({ message: 'Snippet not found' });
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
  const page = parseInt((req.query.page as string) || '1', 10);
  const limit = parseInt((req.query.limit as string) || '10', 10);
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    Snippet.find({ isPublic: true }).sort({ updatedAt: -1 }).skip(skip).limit(limit),
    Snippet.countDocuments({ isPublic: true }),
  ]);
  res.json({ items, total, page, limit });
});

export default router;

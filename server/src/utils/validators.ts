import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(100),
});

export const snippetCreateSchema = z.object({
  title: z.string().min(1).max(200),
  html: z.string().optional().default(''),
  css: z.string().optional().default(''),
  js: z.string().optional().default(''),
  isPublic: z.boolean().optional().default(true),
});

export const snippetUpdateSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  html: z.string().optional(),
  css: z.string().optional(),
  js: z.string().optional(),
  isPublic: z.boolean().optional(),
});

import { z } from 'zod';
export const loginSchema = z.object({ email: z.string().email(), password: z.string().min(1) });
export const registerSchema = z.object({
  name: z.string().min(1).max(100), email: z.string().email(),
  password: z.string().min(10, 'At least 10 characters').regex(/[a-zA-Z]/, 'Needs a letter').regex(/\d/, 'Needs a digit'),
});
export const workspaceSchema = z.object({ name: z.string().min(2).max(80), timezone: z.string().min(1) });
export const inviteSchema = z.object({ email: z.string().email(), role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']) });

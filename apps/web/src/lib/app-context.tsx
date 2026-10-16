'use client';
import { createContext, useContext } from 'react';
import type { User, Workspace } from './api';
export interface Ctx { user: User; workspace: Workspace | null; workspaces: Workspace[]; select: (id: string) => void }
export const AppCtx = createContext<Ctx | null>(null);
export const useApp = () => useContext(AppCtx)!;

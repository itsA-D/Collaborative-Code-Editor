import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type TempFileKey = 'html' | 'css' | 'js';

export interface TempFiles {
  html: string;
  css: string;
  js: string;
}

export const TEMP_FILES: Record<TempFileKey, string> = {
  html: '<h1>Hello</h1>\n',
  css: 'h1 {\n  color: #8b5cf6;\n}\n',
  js: "console.log('hello');\n",
};

/** Namespaced so it can never collide with the auth token in localStorage. */
const STORAGE_KEY = 'collab-coder:temporary-session';
const STORAGE_VERSION = 1;

interface StoredSession {
  version: number;
  files: TempFiles;
  /** Editor state at session start (and after a save) — the dirty baseline. */
  baseline: TempFiles;
  activeFile: TempFileKey;
}

interface TemporarySessionValue {
  /** A temporary session exists (nothing is persisted to the database yet). */
  active: boolean;
  /** Real comparison between the current files and the session baseline. */
  dirty: boolean;
  files: TempFiles;
  activeFile: TempFileKey;
  /** Creates a session when none exists (idempotent — keeps existing work). */
  startSession: () => void;
  setFile: (key: TempFileKey, value: string) => void;
  setActiveFile: (key: TempFileKey) => void;
  /** Discard: forget the work and drop the unsaved-changes warning. */
  discard: () => void;
  /** Save: the draft became a real snippet, so stop tracking it. */
  markSaved: () => void;
}

const TemporarySessionContext = createContext<TemporarySessionValue | undefined>(undefined);

function starterFiles(): TempFiles {
  return { ...TEMP_FILES };
}

function sameFiles(a: TempFiles, b: TempFiles) {
  return a.html === b.html && a.css === b.css && a.js === b.js;
}

function readStoredSession(): StoredSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredSession>;
    if (!parsed || parsed.version !== STORAGE_VERSION) return null;
    const files = parsed.files;
    const baseline = parsed.baseline;
    if (!files || !baseline) return null;
    if (typeof files.html !== 'string' || typeof files.css !== 'string' || typeof files.js !== 'string') return null;
    if (typeof baseline.html !== 'string' || typeof baseline.css !== 'string' || typeof baseline.js !== 'string') return null;
    const activeFile = parsed.activeFile === 'css' || parsed.activeFile === 'js' ? parsed.activeFile : 'html';
    return { version: STORAGE_VERSION, files, baseline, activeFile };
  } catch {
    return null;
  }
}

export function TemporarySessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<StoredSession | null>(() => readStoredSession());

  const active = session !== null;
  const dirty = session !== null && !sameFiles(session.files, session.baseline);

  // Persist across reloads and in-app navigation for the life of the tab only.
  useEffect(() => {
    try {
      if (session) sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
      else sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      // Private mode / quota: the session still works in memory.
    }
  }, [session]);

  // Browser-level leaving (refresh, close, another site) — native dialog only.
  // Registered exactly once and only while there is something to lose.
  useEffect(() => {
    if (!active || !dirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [active, dirty]);

  const startSession = useCallback(() => {
    setSession((prev) => {
      if (prev) return prev;
      const files = starterFiles();
      return { version: STORAGE_VERSION, files, baseline: { ...files }, activeFile: 'html' };
    });
  }, []);

  const setFile = useCallback((key: TempFileKey, value: string) => {
    setSession((prev) => (prev ? { ...prev, files: { ...prev.files, [key]: value } } : prev));
  }, []);

  const setActiveFile = useCallback((key: TempFileKey) => {
    setSession((prev) => (prev && prev.activeFile !== key ? { ...prev, activeFile: key } : prev));
  }, []);

  const discard = useCallback(() => setSession(null), []);

  const markSaved = useCallback(() => setSession(null), []);

  const value = useMemo<TemporarySessionValue>(
    () => ({ active, dirty, files: session ? session.files : starterFiles(), activeFile: session ? session.activeFile : 'html', startSession, setFile, setActiveFile, discard, markSaved }),
    [active, dirty, session, startSession, setFile, setActiveFile, discard, markSaved]
  );

  return <TemporarySessionContext.Provider value={value}>{children}</TemporarySessionContext.Provider>;
}

export function useTemporarySession() {
  const context = useContext(TemporarySessionContext);
  if (!context) {
    throw new Error('useTemporarySession must be used within TemporarySessionProvider');
  }
  return context;
}
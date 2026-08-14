import { createContext, useContext, useState, ReactNode, useRef } from 'react';

interface SnippetContextType {
  snippetName: string;
  setSnippetName: (name: string) => void;
  renameSnippet?: (newName: string) => Promise<void>;
  registerRenameHandler: (handler: (newName: string) => Promise<void>) => void;
}

const SnippetContext = createContext<SnippetContextType | undefined>(undefined);

export function SnippetProvider({ children }: { children: ReactNode }) {
  const [snippetName, setSnippetName] = useState<string>('');
  const renameHandlerRef = useRef<((newName: string) => Promise<void>) | null>(null);

  const registerRenameHandler = (handler: (newName: string) => Promise<void>) => {
    renameHandlerRef.current = handler;
  };

  const renameSnippet = async (newName: string) => {
    if (renameHandlerRef.current) {
      await renameHandlerRef.current(newName);
    }
  };

  return (
    <SnippetContext.Provider value={{ snippetName, setSnippetName, renameSnippet, registerRenameHandler }}>
      {children}
    </SnippetContext.Provider>
  );
}

export function useSnippet() {
  const context = useContext(SnippetContext);
  if (!context) {
    throw new Error('useSnippet must be used within SnippetProvider');
  }
  return context;
}

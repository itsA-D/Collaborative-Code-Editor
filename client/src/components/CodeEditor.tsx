import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
import * as Y from 'yjs';

interface Props {
  language: 'html' | 'css' | 'javascript';
  yText: Y.Text | null;
  awareness: any;
  readOnly?: boolean;
  onCursor?: (pos: { lineNumber: number; column: number }) => void;
  onChange?: () => void;
}

export default function CodeEditor({ language, yText, awareness, readOnly, onCursor, onChange }: Props) {
  const monacoRef = useRef<any>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [theme, setTheme] = useState<'vs' | 'vs-dark'>(() => (document.documentElement.getAttribute('data-theme') === 'light' ? 'vs' : 'vs-dark'));

  // Observe theme changes
  useEffect(() => {
    const update = () => setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'vs' : 'vs-dark');
    const obs = new MutationObserver((m) => {
      if (m.some((x) => x.attributeName === 'data-theme')) update();
    });
    obs.observe(document.documentElement, { attributes: true });
    return () => obs.disconnect();
  }, []);

  // Ctrl+S handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        const ev = new CustomEvent('save-request');
        window.dispatchEvent(ev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Emit cursor changes
  useEffect(() => {
    if (!monacoRef.current || !onCursor) return;
    const { editor } = monacoRef.current;
    const sub = editor.onDidChangeCursorPosition((e: any) => {
      const p = e.position;
      onCursor({ lineNumber: p.lineNumber, column: p.column });
    });
    return () => sub?.dispose?.();
  }, [onCursor, isEditorReady]);

  // Bind Yjs text to Monaco editor
  useEffect(() => {
    if (!monacoRef.current || !yText || !awareness) return;

    const { editor, monaco } = monacoRef.current;

    // Clean up previous binding
    if (bindingRef.current) {
      bindingRef.current.destroy();
    }

    // Create new MonacoBinding
    const binding = new MonacoBinding(
      yText,
      editor.getModel()!,
      new Set([editor]),
      awareness
    );
    bindingRef.current = binding;

    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [yText, awareness, isEditorReady]);

  return (
    <div style={{ height: '100%' }}>
      <Editor
        theme={theme}
        defaultLanguage={language}
        options={{ readOnly, fontSize: 14, minimap: { enabled: false }, automaticLayout: true }}
        onMount={(editor, monaco) => {
          monacoRef.current = { editor, monaco };
          setIsEditorReady(true);
        }}
      />
    </div>
  );
}

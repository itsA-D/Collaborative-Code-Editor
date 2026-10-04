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
  /**
   * Local (non-collaborative) mode: seed the Monaco model and report edits.
   * Used by the temporary session, which has no Yjs document behind it.
   */
  defaultValue?: string;
  onLocalChange?: (value: string) => void;
}

export default function CodeEditor({ language, yText, awareness, readOnly, onCursor, onChange, defaultValue, onLocalChange }: Props) {
  const monacoRef = useRef<any>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [theme, setTheme] = useState<'vs' | 'vs-dark' | 'ide-dark'>(() => (document.documentElement.getAttribute('data-theme') === 'light' ? 'vs' : 'ide-dark'));

  // Define custom dark theme for IDE
  const defineCustomTheme = (monaco: any) => {
    monaco.editor.defineTheme('ide-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: '', background: '08090D', foreground: 'E8E5ED' },
        { token: 'comment', foreground: '96909F', fontStyle: 'italic' },
        { token: 'keyword', foreground: '9B5CFF' },
        { token: 'string', foreground: '10B981' },
        { token: 'number', foreground: 'F59E0B' },
        { token: 'tag', foreground: '7C3AED' },
        { token: 'attribute.name', foreground: '9B5CFF' },
        { token: 'attribute.value', foreground: '10B981' },
        { token: 'delimiter', foreground: '96909F' },
      ],
      colors: {
        'editor.background': '#08090D',
        'editor.foreground': '#E8E5ED',
        'editor.lineHighlightBackground': '#17101F',
        'editorLineNumber.foreground': '#6B7280',
        'editorLineNumber.activeForeground': '#E8E5ED',
        'editor.selectionBackground': '#7C3AED33',
        'editor.inactiveSelectionBackground': '#7C3AED1A',
        'editorCursor.foreground': '#9B5CFF',
        'editorIndentGuide.background': '#1F2937',
        'editorIndentGuide.activeBackground': '#374151',
        'editorSuggestWidget.background': '#17101F',
        'editorSuggestWidget.border': '#1F2937',
        'editorSuggestWidget.foreground': '#E8E5ED',
        'editorSuggestWidget.selectedBackground': '#7C3AED33',
      }
    });
  };

  // Observe theme changes
  useEffect(() => {
    const update = () => setTheme(document.documentElement.getAttribute('data-theme') === 'light' ? 'vs' : 'ide-dark');
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
    <div className="ide-code-panel ph-no-capture" style={{ height: '100%' }}>
      <Editor
        theme={theme}
        defaultLanguage={language}
        defaultValue={defaultValue}
        onChange={(value) => onLocalChange?.(value ?? '')}
        options={{
          readOnly,
          fontSize: 13,
          fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
          minimap: { enabled: false },
          automaticLayout: true,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          renderLineHighlight: 'all',
          padding: { top: 8, bottom: 8 },
          scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            useShadows: false,
            verticalScrollbarSize: 10,
            horizontalScrollbarSize: 10,
          }
        }}
        beforeMount={defineCustomTheme}
        onMount={(editor, monaco) => {
          monacoRef.current = { editor, monaco };
          setIsEditorReady(true);
        }}
      />
    </div>
  );
}

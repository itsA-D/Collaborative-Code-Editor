import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';

interface Props {
  language: 'html'|'css'|'javascript';
  value: string;
  onChange: (v: string) => void;
  readOnly?: boolean;
  onCursor?: (pos: { lineNumber: number; column: number }) => void;
  others?: { id: string; name: string; color: string; position: { lineNumber: number; column: number } }[];
}

export default function CodeEditor({ language, value, onChange, readOnly, onCursor, others = [] }: Props) {
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);
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
  }, [onCursor]);

  // Render collaborative cursors (line decorations in gutter + border)
  useEffect(() => {
    if (!monacoRef.current) return;
    const { editor, monaco } = monacoRef.current;
    const decos = (others || []).map((u) => {
      const cls = `remote-line-${u.id}`;
      if (!document.getElementById(cls)) {
        const style = document.createElement('style');
        style.id = cls;
        style.textContent = `
          .monaco-editor .${cls} { border-left: 3px solid ${u.color}; }
        `;
        document.head.appendChild(style);
      }
      const line = Math.max(1, u.position?.lineNumber || 1);
      return {
        range: new monaco.Range(line, 1, line, 1),
        options: {
          isWholeLine: true,
          linesDecorationsClassName: cls,
          hoverMessage: { value: `${u.name}` },
          overviewRuler: { color: u.color, position: monaco.editor.OverviewRulerLane.Center },
        },
      };
    });
    decorationsRef.current = editor.deltaDecorations(decorationsRef.current, decos as any);
  }, [others]);

  return (
    <div style={{ height: '100%' }}>
      <Editor
        theme={theme}
        defaultLanguage={language}
        value={value}
        onChange={(v) => onChange(v || '')}
        options={{ readOnly, fontSize: 14, minimap: { enabled: false } }}
        onMount={(editor, monaco) => { monacoRef.current = { editor, monaco }; }}
      />
    </div>
  );
}

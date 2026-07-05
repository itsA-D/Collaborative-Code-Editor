import { useEffect, useRef, useState } from 'react';
import Editor from '@monaco-editor/react';
import { MonacoBinding } from 'y-monaco';
import * as Y from 'yjs';
import { useFollowUser } from '../hooks/useFollowUser';

interface RemoteCursor {
  userId: string;
  name: string;
  color: string;
  position: { lineNumber: number; column: number };
}

interface Props {
  language: 'html' | 'css' | 'javascript';
  yText: Y.Text | null;
  awareness: any | null;
  readOnly?: boolean;
  remoteCursors?: RemoteCursor[];
  followId?: string | null;
  onCursor?: (pos: { lineNumber: number; column: number }) => void;
  onChange?: () => void;
}

export default function CodeEditor({ language, yText, awareness, readOnly, remoteCursors, followId, onCursor, onChange }: Props) {
  const monacoRef = useRef<any>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [theme, setTheme] = useState<'vs' | 'vs-dark'>(() => (document.documentElement.getAttribute('data-theme') === 'light' ? 'vs' : 'vs-dark'));
  const [hoveredLineInfo, setHoveredLineInfo] = useState<{ y: number, x: number, line: number, cursors: RemoteCursor[] } | null>(null);

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
    if (!monacoRef.current || !yText) return;

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
      awareness || undefined
    );
    bindingRef.current = binding;

    return () => {
      binding.destroy();
      bindingRef.current = null;
    };
  }, [yText, awareness, isEditorReady]);

  // Handle remote line highlights and hover messages
  const decorationsCollectionRef = useRef<any>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    const el = document.createElement('style');
    document.head.appendChild(el);
    styleRef.current = el;
    return () => {
      document.head.removeChild(el);
      if (decorationsCollectionRef.current) {
        const { editor, widgets } = decorationsCollectionRef.current;
        if (widgets) {
          Object.values(widgets).forEach((w: any) => editor.removeContentWidget(w));
        }
        decorationsCollectionRef.current.collection.set([]);
      }
    };
  }, []);

  // Render actual custom carets and dynamic inline nametags using Monaco APIs
  useEffect(() => {
    if (!monacoRef.current || !isEditorReady || !styleRef.current) return;
    const { editor, monaco } = monacoRef.current;

    const styles = (remoteCursors || []).map(c => `
      .remote-line-${c.userId}-${language} {
        background-color: ${c.color}22 !important;
      }
      .remote-caret-${c.userId}-${language} {
        border-left: 2px solid ${c.color} !important;
        margin-left: -1px;
        box-sizing: border-box;
      }
    `).join('\n');
    styleRef.current.innerHTML = styles;

    const currentWidgets = decorationsCollectionRef.current?.widgets || {};
    const newWidgets: any = {};

    const decorations = (remoteCursors || []).map(c => {
      // 1. Maintain content widget
      let widget = currentWidgets[c.userId];
      if (!widget) {
        const domNode = document.createElement('div');
        domNode.style.backgroundColor = c.color;
        domNode.style.color = '#fff';
        domNode.style.padding = '0px 4px';
        domNode.style.borderRadius = '3px 3px 3px 0';
        domNode.style.fontSize = '10px';
        domNode.style.fontWeight = '600';
        domNode.style.whiteSpace = 'nowrap';
        domNode.style.pointerEvents = 'none';
        domNode.textContent = c.name;

        widget = {
          getId: () => `cursor-widget-${c.userId}-${language}`,
          getDomNode: () => domNode,
          getPosition: () => ({
            position: { lineNumber: c.position.lineNumber, column: c.position.column },
            preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE]
          })
        };
        editor.addContentWidget(widget);
      } else {
        // Update existing widget position
        widget.getPosition = () => ({
          position: { lineNumber: c.position.lineNumber, column: c.position.column },
          preference: [monaco.editor.ContentWidgetPositionPreference.ABOVE]
        });
        editor.layoutContentWidget(widget);
      }
      newWidgets[c.userId] = widget;

      // 2. Return line and caret decoration configuration
      return [
        {
          range: {
            startLineNumber: c.position.lineNumber,
            startColumn: 1,
            endLineNumber: c.position.lineNumber,
            endColumn: 1,
          },
          options: {
            isWholeLine: true,
            className: `remote-line-${c.userId}-${language}`,
          }
        },
        {
          range: {
            startLineNumber: c.position.lineNumber,
            startColumn: c.position.column,
            endLineNumber: c.position.lineNumber,
            endColumn: c.position.column,
          },
          options: {
            className: `remote-caret-${c.userId}-${language}`,
          }
        }
      ];
    }).flat();

    // Remove stale widgets
    Object.keys(currentWidgets).forEach(userId => {
      if (!newWidgets[userId]) {
        editor.removeContentWidget(currentWidgets[userId]);
      }
    });

    if (!decorationsCollectionRef.current) {
      decorationsCollectionRef.current = { 
        editor, // Keep reference for cleanup
        collection: editor.createDecorationsCollection([]),
        widgets: {}
      };
    }
    decorationsCollectionRef.current.widgets = newWidgets;
    decorationsCollectionRef.current.collection.set(decorations);
  }, [remoteCursors, isEditorReady, language]);

  // Follow Mode Scroll
  useFollowUser(monacoRef.current?.editor, followId || null, Object.fromEntries((remoteCursors || []).map(c => [c.userId, c])), isEditorReady);

  return (
    <div style={{ height: '100%', position: 'relative' }}>
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

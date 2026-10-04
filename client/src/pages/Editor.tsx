import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import CodeEditor from '../components/CodeEditor';
import UserPresence from '../components/UserPresence';
import Modal from '../components/Modal';
import { IDEWorkspace } from '../components/ide';
import { useAuth } from '../state/AuthContext';
import { useSnippet } from '../state/SnippetContext';
import { useSocket } from '../hooks/useSocket';
import api from '../api/client';

export default function EditorPage() {
  const { snippetId } = useParams();
  const { token, user } = useAuth();
  const { setSnippetName, registerRenameHandler } = useSnippet();
  const { socket, status } = useSocket(token);
  const [snippet, setSnippet] = useState<any>(null);
  const [tab, setTab] = useState<'html' | 'css' | 'js'>('html');
  const [users, setUsers] = useState<any[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [showAutosaveToast, setShowAutosaveToast] = useState(false);
  const [typing, setTyping] = useState<{ [K in 'html' | 'css' | 'js']: Record<string, { id: string; name: string; color: string; ts: number }> }>({ html: {}, css: {}, js: {} });
  const [deleteModal, setDeleteModal] = useState(false);
  const nav = useNavigate();
  const hasSetNameRef = useRef(false);
  const doRenameRef = useRef<(newTitle: string) => Promise<void>>();

  // Yjs state
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [isYjsReady, setIsYjsReady] = useState(false);
  const [htmlText, setHtmlText] = useState('');
  const [cssText, setCssText] = useState('');
  const [jsText, setJsText] = useState('');

  // Get Yjs text types
  const yHtml = useMemo(() => isYjsReady ? ydocRef.current?.getText('html') || null : null, [isYjsReady]);
  const yCss = useMemo(() => isYjsReady ? ydocRef.current?.getText('css') || null : null, [isYjsReady]);
  const yJs = useMemo(() => isYjsReady ? ydocRef.current?.getText('js') || null : null, [isYjsReady]);

  // Initialize Yjs connection
  useEffect(() => {
    if (!snippetId || !token) return;

    const ydoc = new Y.Doc();
    let wsUrl = (import.meta as any).env.VITE_YJS_URL;
    if (!wsUrl) {
      wsUrl = window.location.protocol === 'https:'
        ? 'wss://collaborative-editor-backend-472m.onrender.com/yjs'
        : 'ws://localhost:4000/yjs';
    }
    const wsProvider = new WebsocketProvider(wsUrl, `snippet-${snippetId}?token=${token}`, ydoc);

    ydocRef.current = ydoc;
    providerRef.current = wsProvider;
    setIsYjsReady(true);

    // Set user info in awareness
    const userColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#926fe4', '#ec4899', '#14b8a6', '#84cc16'];
    const colorIdx = (user?.id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % userColors.length;
    const color = userColors[colorIdx];
    wsProvider.awareness.setLocalStateField('user', {
      name: user?.name || 'Anonymous',
      color,
    });

    // Subscribe to Yjs updates for preview
    const updateHandler = () => {
      setHtmlText(ydoc.getText('html').toString());
      setCssText(ydoc.getText('css').toString());
      setJsText(ydoc.getText('js').toString());
    };
    ydoc.on('update', updateHandler);

    // Initial text load
    updateHandler();

    return () => {
      ydoc.off('update', updateHandler);
      wsProvider.destroy();
      ydoc.destroy();
      setIsYjsReady(false);
    };
  }, [snippetId, token]);

  // load snippet via REST for metadata
  useEffect(() => {
    // Reset the flag when snippetId changes
    hasSetNameRef.current = false;

    (async () => {
      try {
        const res = await api.get(`/api/snippets/${snippetId}`);
        setSnippet(res.data);
        // Only set snippet name if not already set (to avoid overwriting renames)
        if (!hasSetNameRef.current) {
          setSnippetName(res.data.title || res.data.name || 'new snippet');
          hasSetNameRef.current = true;
        }
      } catch { }
    })();
  }, [snippetId, setSnippetName]);

  // socket events for presence (still use socket.io for users list)
  useEffect(() => {
    if (!socket || !snippetId) return;
    socket.emit('join-snippet', { snippetId });

    const onActive = (u: any[]) => setUsers(u);
    const onJoined = (_: any) => { };
    const onLeft = (_: any) => { };

    const onTyping = (p: any) => {
      const { userId, name, language, ts } = p || {};
      if (!userId || !language) return;
      const u = users.find(x => x.id === userId);
      const color = u?.color || 'var(--accent)';
      setTyping(prev => ({
        ...prev,
        [language]: { ...prev[language as 'html' | 'css' | 'js'], [userId]: { id: userId, name, color, ts: ts || Date.now() } }
      }));
      setTimeout(() => {
        setTyping(prev => {
          const next = { html: { ...prev.html }, css: { ...prev.css }, js: { ...prev.js } } as typeof prev;
          const map = { ...(next as any)[language] };
          delete map[userId];
          (next as any)[language] = map;
          return next;
        });
      }, 1600);
    };

    socket.on('active-users', onActive);
    socket.on('user-joined', onJoined);
    socket.on('user-left', onLeft);
    socket.on('user-typing', onTyping);

    return () => {
      socket.emit('leave-snippet', { snippetId });
      socket.off('active-users', onActive);
      socket.off('user-joined', onJoined);
      socket.off('user-left', onLeft);
      socket.off('user-typing', onTyping);
    };
  }, [socket, snippetId]);

  // Autosave and Ctrl+S handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        doSave(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [snippetId, user]);

  // Autosave every 10 seconds
  useEffect(() => {
    if (!snippetId || !user) return;
    const interval = setInterval(() => {
      doSave(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [snippetId, user]);

  async function doSave(isAutoSave: any = false) {
    const isAuto = isAutoSave === true;
    if (!user) { nav('/login'); return; }
    if (!ydocRef.current) return;
    try {
      if (isAuto) {
        setShowAutosaveToast(true);
        setTimeout(() => setShowAutosaveToast(false), 2000);
      }
      const doc = ydocRef.current;
      await api.put(`/api/snippets/${snippetId}`, {
        html: doc.getText('html').toString(),
        css: doc.getText('css').toString(),
        js: doc.getText('js').toString(),
      });
      if (!isAuto) {
        setBanner('Saved');
        setTimeout(() => setBanner(null), 1500);
      }
    } catch (e: any) {
      if (!isAuto) {
        setBanner(e?.response?.data?.message || 'Save failed');
        setTimeout(() => setBanner(null), 2000);
      }
    }
  }

  async function doFork() {
    if (!user) { nav('/login'); return; }
    try { const res = await api.post(`/api/snippets/${snippetId}/fork`); nav(`/editor/${res.data._id}`); } catch { }
  }

  function doShare() {
    navigator.clipboard.writeText(window.location.href);
    setBanner('Link copied'); setTimeout(() => setBanner(null), 1000);
  }

  async function doRename(newTitle: string) {
    if (!user) { nav('/login'); return; }
    try {
      await api.put(`/api/snippets/${snippetId}`, { title: newTitle });
      setSnippet((prev: any) => ({ ...prev, title: newTitle }));
      setSnippetName(newTitle); // Update context to sync with top bar
      setBanner('Renamed'); setTimeout(() => setBanner(null), 1500);
    } catch (e: any) {
      setBanner(e?.response?.data?.message || 'Rename failed');
    }
  }

  // Store doRename in ref
  doRenameRef.current = doRename;

  // Register rename handler for when snippet is renamed from top bar
  useEffect(() => {
    registerRenameHandler(async (newName: string) => {
      if (doRenameRef.current) {
        await doRenameRef.current(newName);
      }
    });
  }, [registerRenameHandler]);

  async function doDelete() {
    if (!user) { nav('/login'); return; }
    try {
      await api.delete(`/api/snippets/${snippetId}`);
      nav('/explore');
    } catch (e: any) {
      setBanner(e?.response?.data?.message || 'Delete failed');
    }
  }

  // Handle typing indicator via socket (separate from Yjs)
  function handleTyping() {
    if (!socket || !snippetId) return;
    socket.emit('typing', { snippetId, language: tab });
  }

  // Get current Yjs text and awareness for active tab
  const currentYText = tab === 'html' ? yHtml : tab === 'css' ? yCss : yJs;
  const awareness = providerRef.current?.awareness || null;

  // Tab data
  const tabs = [
    { id: 'html', name: 'index.html', type: 'html' as const, icon: '🌐' },
    { id: 'css', name: 'styles.css', type: 'css' as const, icon: '🎨' },
    { id: 'js', name: 'script.js', type: 'js' as const, icon: '📜' },
  ];

  // Cursor position state for status bar
  const [cursorPosition, setCursorPosition] = useState<{ line: number; column: number }>({ line: 1, column: 1 });

  const getLanguageName = (tab: string) => {
    switch (tab) {
      case 'html': return 'HTML';
      case 'css': return 'CSS';
      case 'js': return 'JavaScript';
      default: return 'Plain Text';
    }
  };

  return (
    <>
      <IDEWorkspace
        tabs={tabs}
        activeTab={tab}
        onTabChange={(tabId) => setTab(tabId as 'html' | 'css' | 'js')}
        isConnected={status === 'connected'}
        userCount={users.length}
        onSave={() => doSave(false)}
        onShare={doShare}
        title={snippet?.title}
        onRename={doRename}
        preview={{ html: htmlText, css: cssText, js: jsText }}
        status={{
          isConnected: status === 'connected',
          language: getLanguageName(tab),
          cursorPosition,
        }}
      >
        <div className="ide-typing-indicators">
          {Object.values(typing[tab] || {}).filter((u: any) => u.id !== user?.id).slice(0, 3).map((u: any) => (
            <span key={u.id} className="ide-typing-pill" style={{ borderColor: u.color, color: u.color }}>{u.name} typing…</span>
          ))}
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <div style={{ display: tab === 'html' ? 'block' : 'none', height: '100%' }}>
            <CodeEditor
              language="html"
              yText={yHtml}
              awareness={awareness}
              onCursor={(pos) => {
                setCursorPosition({ line: pos.lineNumber, column: pos.column });
                socket?.emit('cursor-move', { snippetId, language: 'html', position: pos });
              }}
              onChange={handleTyping}
            />
          </div>
          <div style={{ display: tab === 'css' ? 'block' : 'none', height: '100%' }}>
            <CodeEditor
              language="css"
              yText={yCss}
              awareness={awareness}
              onCursor={(pos) => {
                setCursorPosition({ line: pos.lineNumber, column: pos.column });
                socket?.emit('cursor-move', { snippetId, language: 'css', position: pos });
              }}
              onChange={handleTyping}
            />
          </div>
          <div style={{ display: tab === 'js' ? 'block' : 'none', height: '100%' }}>
            <CodeEditor
              language="javascript"
              yText={yJs}
              awareness={awareness}
              onCursor={(pos) => {
                setCursorPosition({ line: pos.lineNumber, column: pos.column });
                socket?.emit('cursor-move', { snippetId, language: 'js', position: pos });
              }}
              onChange={handleTyping}
            />
          </div>
        </div>
      </IDEWorkspace>
      {banner && (
        <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9999, padding: 8 }}>
          <div className="banner">
            <span>{banner}</span>
          </div>
        </div>
      )}
      <UserPresence
        users={users}
        isAutosaving={showAutosaveToast}
        onBack={() => {
          const canGoBack = (window.history.state && (window.history.state as any).idx > 0);
          if (canGoBack) nav(-1);
          else nav('/explore', { replace: true } as any);
        }}
      />
      <Modal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={doDelete}
        title="Delete Snippet"
        message={`Are you sure you want to delete "${snippet?.title || 'this snippet'}"? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        isDanger={true}
      />
    </>
  );
}

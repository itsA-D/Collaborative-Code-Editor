import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import CodeEditor from '../components/CodeEditor';
import LivePreview from '../components/LivePreview';
import UserPresence from '../components/UserPresence';
import Toolbar from '../components/Toolbar';
import Modal from '../components/Modal';
import { useAuth } from '../state/AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../api/client';

export default function EditorPage() {
  const { snippetId } = useParams();
  const { token, user } = useAuth();
  const { socket, status } = useSocket(token);
  const [snippet, setSnippet] = useState<any>(null);
  const [tab, setTab] = useState<'html' | 'css' | 'js'>('html');
  const [users, setUsers] = useState<any[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [typing, setTyping] = useState<{ [K in 'html' | 'css' | 'js']: Record<string, { id: string; name: string; color: string; ts: number }> }>({ html: {}, css: {}, js: {} });
  const [deleteModal, setDeleteModal] = useState(false);
  const nav = useNavigate();

  // Yjs state
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const [htmlText, setHtmlText] = useState('');
  const [cssText, setCssText] = useState('');
  const [jsText, setJsText] = useState('');

  // Get Yjs text types
  const yHtml = useMemo(() => ydocRef.current?.getText('html') || null, [ydocRef.current]);
  const yCss = useMemo(() => ydocRef.current?.getText('css') || null, [ydocRef.current]);
  const yJs = useMemo(() => ydocRef.current?.getText('js') || null, [ydocRef.current]);

  // Initialize Yjs connection
  useEffect(() => {
    if (!snippetId || !token) return;

    const ydoc = new Y.Doc();
    const wsUrl = (import.meta as any).env.VITE_YJS_URL || 'ws://localhost:1234';
    const wsProvider = new WebsocketProvider(wsUrl, `snippet-${snippetId}`, ydoc);

    ydocRef.current = ydoc;
    providerRef.current = wsProvider;

    // Set user info in awareness
    const userColors = ['#ef4444','#f59e0b','#10b981','#3b82f6','#926fe4','#ec4899','#14b8a6','#84cc16'];
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
    };
  }, [snippetId, token]);

  // load snippet via REST for metadata
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/snippets/${snippetId}`);
        setSnippet(res.data);
      } catch { }
    })();
  }, [snippetId]);

  // socket events for presence (still use socket.io for users list)
  useEffect(() => {
    if (!socket || !snippetId) return;
    socket.emit('join-snippet', { snippetId });

    const onActive = (u: any[]) => setUsers(u);
    const onJoined = (_: any) => {};
    const onLeft = (_: any) => {};

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

  // save via Ctrl+S global event
  useEffect(() => {
    const handler = () => { doSave(); };
    window.addEventListener('save-request', handler as any);
    return () => window.removeEventListener('save-request', handler as any);
  }, [snippetId, htmlText, cssText, jsText]);

  async function doSave() {
    if (!user) { nav('/login'); return; }
    if (!ydocRef.current) return;
    try {
      const doc = ydocRef.current;
      await api.put(`/api/snippets/${snippetId}`, {
        html: doc.getText('html').toString(),
        css: doc.getText('css').toString(),
        js: doc.getText('js').toString(),
      });
      setBanner('Saved'); setTimeout(() => setBanner(null), 1500);
    } catch (e: any) {
      setBanner(e?.response?.data?.message || 'Save failed');
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
      setBanner('Renamed'); setTimeout(() => setBanner(null), 1500);
    } catch (e: any) {
      setBanner(e?.response?.data?.message || 'Rename failed');
    }
  }

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

  return (
    <div className="editor-layout">
      <Toolbar
        title={snippet?.title || 'Snippet'}
        onSave={doSave}
        onFork={doFork}
        onShare={doShare}
        onRename={user && snippet?.owner?.toString() === user.id ? doRename : undefined}
        onDelete={user && snippet?.owner?.toString() === user.id ? () => setDeleteModal(true) : undefined}
        status={`Socket: ${status} · Users: ${users.length}`}
      />
      <div className="editor-main">
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="tabs">
            <button className={`tab ${tab === 'html' ? 'active' : ''}`} onClick={() => setTab('html')}>HTML</button>
            <button className={`tab ${tab === 'css' ? 'active' : ''}`} onClick={() => setTab('css')}>CSS</button>
            <button className={`tab ${tab === 'js' ? 'active' : ''}`} onClick={() => setTab('js')}>JS</button>
          </div>
          <div className="typing-indicators">
            {Object.values(typing[tab] || {}).filter((u: any) => u.id !== user?.id).slice(0, 3).map((u: any) => (
              <span key={u.id} className="typing-pill" style={{ borderColor: u.color, color: u.color }}>{u.name} typing…</span>
            ))}
          </div>
          <div style={{ flex: 1, minHeight: 0 }}>
            {tab === 'html' && (
              <CodeEditor
                language="html"
                yText={yHtml}
                awareness={awareness}
                onCursor={(pos) => socket?.emit('cursor-move', { snippetId, language: 'html', position: pos })}
                onChange={handleTyping}
              />
            )}
            {tab === 'css' && (
              <CodeEditor
                language="css"
                yText={yCss}
                awareness={awareness}
                onCursor={(pos) => socket?.emit('cursor-move', { snippetId, language: 'css', position: pos })}
                onChange={handleTyping}
              />
            )}
            {tab === 'js' && (
              <CodeEditor
                language="javascript"
                yText={yJs}
                awareness={awareness}
                onCursor={(pos) => socket?.emit('cursor-move', { snippetId, language: 'js', position: pos })}
                onChange={handleTyping}
              />
            )}
          </div>
        </div>
        <div className="card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ marginBottom: 6 }}>Live Preview</div>
          <div style={{ flex: 1, minHeight: 0 }}>
            <LivePreview html={htmlText} css={cssText} js={jsText} />
          </div>
        </div>
      </div>
      {banner && (
        <div style={{ padding: 8 }}>
          <div className="banner">
            <span>{banner}</span>
          </div>
        </div>
      )}
      <UserPresence
        users={users}
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
    </div>
  );
}

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Y from 'yjs';
import { UndoManager } from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import CodeEditor from '../components/CodeEditor';
import LivePreview from '../components/LivePreview';
import UserPresence from '../components/UserPresence';
import Toolbar from '../components/Toolbar';
import Modal from '../components/Modal';
import { useAuth } from '../state/AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../api/client';

interface SnippetData {
  _id: string;
  title: string;
  html: string;
  css: string;
  js: string;
  owner: string | { _id: string; name: string };
  isPublic: boolean;
}

interface UserPresenceData {
  id: string;
  name: string;
  color: string;
  currentTab?: string;
}

interface CursorData {
  userId: string;
  name: string;
  color: string;
  position: { lineNumber: number; column: number };
  ts: number;
}

interface TypingData {
  id: string;
  name: string;
  color: string;
  ts: number;
}

export default function EditorPage() {
  const { snippetId } = useParams();
  const { token, user } = useAuth();
  const { socket, status } = useSocket(token);
  const [snippet, setSnippet] = useState<SnippetData | null>(null);
  const [tab, setTab] = useState<'html' | 'css' | 'js'>('html');
  const [users, setUsers] = useState<UserPresenceData[]>([]);
  const [banner, setBanner] = useState<string | null>(null);
  const [showAutosaveToast, setShowAutosaveToast] = useState(false);
  const [typing, setTyping] = useState<{ [K in 'html' | 'css' | 'js']: Record<string, TypingData> }>({ html: {}, css: {}, js: {} });
  const [remoteCursors, setRemoteCursors] = useState<{ [K in 'html' | 'css' | 'js']: Record<string, CursorData> }>({ html: {}, css: {}, js: {} });
  const [deleteModal, setDeleteModal] = useState(false);
  const [followId, setFollowId] = useState<string | null>(null);
  const nav = useNavigate();

  // Yjs state
  const ydocRef = useRef<Y.Doc | null>(null);
  const providerRef = useRef<WebsocketProvider | null>(null);
  const indexeddbProviderRef = useRef<IndexeddbPersistence | null>(null);
  const undoManagerRef = useRef<UndoManager | null>(null);
  const isSyncedRef = useRef(false);
  const [isYjsReady, setIsYjsReady] = useState(false);
  const [isSynced, setIsSynced] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [htmlText, setHtmlText] = useState('');
  const [cssText, setCssText] = useState('');
  const [jsText, setJsText] = useState('');

  const yHtml = useMemo(() => isYjsReady ? ydocRef.current?.getText('html') || null : null, [isYjsReady]);
  const yCss = useMemo(() => isYjsReady ? ydocRef.current?.getText('css') || null : null, [isYjsReady]);
  const yJs = useMemo(() => isYjsReady ? ydocRef.current?.getText('js') || null : null, [isYjsReady]);

  const userColorRef = useRef<string>('#3b82f6');

  function updatePresence(updates: any) {
    if (!providerRef.current?.awareness) return;
    const current = providerRef.current.awareness.getLocalState()?.presence || {};
    providerRef.current.awareness.setLocalStateField('presence', {
      user: { id: user?.id, name: user?.name || 'Anonymous', color: userColorRef.current },
      tab,
      lastActiveAt: Date.now(),
      ...current,
      ...updates
    });
  }

  // Update presence tab on switch
  useEffect(() => {
    if (isYjsReady) updatePresence({ tab });
  }, [tab, isYjsReady]);

  // Initialize Yjs connection with offline support
  useEffect(() => {
    if (!snippetId || !token) return;

    const ydoc = new Y.Doc({ gc: true });
    const docName = `snippet-${snippetId}`;
    
    // Initialize IndexedDB persistence for offline support
    const indexeddbProvider = new IndexeddbPersistence(docName, ydoc);
    indexeddbProviderRef.current = indexeddbProvider;
    
    // Track offline status
    indexeddbProvider.whenSynced.then(() => {
      console.log('IndexedDB data loaded');
    });
    
    // Initialize UndoManager for local undo/redo
    const undoManager = new UndoManager([ydoc.getText('html'), ydoc.getText('css'), ydoc.getText('js')]);
    undoManagerRef.current = undoManager;
    
    // Track undo/redo availability
    const updateUndoRedoState = () => {
      setCanUndo(undoManager.canUndo());
      setCanRedo(undoManager.canRedo());
    };
    undoManager.on('stack-item-added', updateUndoRedoState);
    undoManager.on('stack-item-popped', updateUndoRedoState);
    undoManager.on('stack-cleared', updateUndoRedoState);
    
    // Initialize WebSocket provider
    let wsUrl = (import.meta as any).env.VITE_YJS_URL;
    if (!wsUrl) {
      wsUrl = window.location.protocol === 'https:'
        ? `wss://${window.location.hostname}:1234`
        : 'ws://localhost:1234';
    }
    const wsProvider = new WebsocketProvider(wsUrl, `${docName}?token=${token}`, ydoc, {
      // Enable offline mode - continue working when disconnected
      connect: true
    });

    ydocRef.current = ydoc;
    providerRef.current = wsProvider;
    setIsYjsReady(true);

    // Track connection status for offline detection
    const handleStatus = (event: { status: 'connecting' | 'connected' | 'disconnected' }) => {
      setIsOffline(event.status === 'disconnected');
    };
    wsProvider.on('status', handleStatus);

    const userColors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#926fe4', '#ec4899', '#14b8a6', '#84cc16'];
    const colorIdx = (user?.id || '').split('').reduce((a, c) => a + c.charCodeAt(0), 0) % userColors.length;
    userColorRef.current = userColors[colorIdx];

    wsProvider.awareness.setLocalStateField('presence', {
      user: { id: user?.id, name: user?.name || 'Anonymous', color: userColorRef.current },
      tab: 'html',
      lastActiveAt: Date.now()
    });

    const handleAwarenessChange = () => {
      const awareness = wsProvider.awareness;
      const states = Array.from(awareness.getStates().entries());
      const nextRemoteCursors: any = { html: {}, css: {}, js: {} };
      const nextTyping: any = { html: {}, css: {}, js: {} };
      const activeUsers: UserPresenceData[] = [];
      const seenUsers = new Set<string>();

      const currentTime = Date.now();
      states.forEach(([clientId, state]: [number, any]) => {
        if (!state.presence || !state.presence.user) return;

        const { user: u, tab: currentTab, cursor, isTyping, lastActiveAt } = state.presence;

        if (!seenUsers.has(u.id)) {
          seenUsers.add(u.id);
          activeUsers.push({ ...u, currentTab });
        }

        if (state.presence.user.id === user?.id && clientId === awareness.clientID) return; // skip self

        if (currentTab && cursor) {
          nextRemoteCursors[currentTab][u.id] = {
            userId: u.id,
            name: u.name,
            color: u.color,
            position: cursor,
            ts: lastActiveAt
          };
        }

        if (currentTab && isTyping && currentTime - lastActiveAt < 3500) {
          nextTyping[currentTab][u.id] = { id: u.id, name: u.name, color: u.color, ts: lastActiveAt };
        }
      });
      setRemoteCursors(nextRemoteCursors);
      setTyping(nextTyping);
      setUsers(activeUsers);
    };

    wsProvider.awareness.on('change', handleAwarenessChange);
    // Trigger initial calculation
    handleAwarenessChange();

    // Subscribe to Yjs updates for preview
    const updateHandler = () => {
      setHtmlText(ydoc.getText('html').toString());
      setCssText(ydoc.getText('css').toString());
      setJsText(ydoc.getText('js').toString());
    };
    ydoc.on('update', updateHandler);

    // Track sync state
    const syncHandler = (s: boolean) => {
      setIsSynced(s);
      isSyncedRef.current = s;
    };
    wsProvider.on('sync', syncHandler);
    
    // Check initial sync state
    if (wsProvider.synced) {
      setIsSynced(true);
      isSyncedRef.current = true;
    }

    return () => {
      ydoc.off('update', updateHandler);
      wsProvider.off('sync', syncHandler);
      wsProvider.off('status', handleStatus);
      undoManager.off('stack-item-added', updateUndoRedoState);
      undoManager.off('stack-item-popped', updateUndoRedoState);
      undoManager.off('stack-cleared', updateUndoRedoState);
      undoManager.destroy();
      wsProvider.destroy();
      indexeddbProvider.destroy();
      ydoc.destroy();
      setIsYjsReady(false);
      setIsSynced(false);
      setIsOffline(false);
      setCanUndo(false);
      setCanRedo(false);
      isSyncedRef.current = false;
    };
  }, [snippetId, token]);

  // load snippet via REST for metadata
  useEffect(() => {
    (async () => {
      if (!snippetId) return;
      try {
        const res = await api.get(`/api/snippets/${snippetId}`);
        setSnippet(res.data);
      } catch { }
    })();
  }, [snippetId]);

  // socket events for non-presence metadata (socket.io cleanup)
  useEffect(() => {
    if (!socket || !snippetId) return;
    socket.emit('join-snippet', { snippetId });

    return () => {
      socket.emit('leave-snippet', { snippetId });
    };
  }, [socket, snippetId]);

  // Autosave every 10 seconds
  useEffect(() => {
    if (!snippetId || !user) return;
    const interval = setInterval(() => {
      doSave(true);
    }, 10000);
    return () => clearInterval(interval);
  }, [snippetId, user]);

  // Ctrl+S handler and undo/redo shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        doSave(false);
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        if (undoManagerRef.current && canUndo) {
          undoManagerRef.current.undo();
        }
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        if (undoManagerRef.current && canRedo) {
          undoManagerRef.current.redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [user, snippetId, canUndo, canRedo]); // Rebind if session/snippet or undo state changes

  const doSave = async (isAutoSave: boolean = false) => {
    if (!user) { nav('/login'); return; }
    if (!ydocRef.current || !snippetId) return;
    
    // Use ref to avoid stale closure in interval
    if (!isSyncedRef.current) {
      if (!isAutoSave) console.warn('Save blocked: Synchronization in progress');
      return;
    }

    try {
      if (isAutoSave) {
        setShowAutosaveToast(true);
        setTimeout(() => setShowAutosaveToast(false), 2000);
      }
      const doc = ydocRef.current;
      
      const html = doc.getText('html').toString();
      const css = doc.getText('css').toString();
      const js = doc.getText('js').toString();

      // Safeguard: Don't autosave if empty (to prevent accidental overwrite)
      if (isAutoSave && !html && !css && !js) {
        return;
      }

      await api.put(`/api/snippets/${snippetId}`, {
        html,
        css,
        js,
      });
      if (!isAutoSave) {
        setBanner('Saved');
        setTimeout(() => setBanner(null), 1500);
      }
    } catch (e: any) {
      if (!isAutoSave) {
        setBanner(e?.response?.data?.message || 'Save failed');
        setTimeout(() => setBanner(null), 2000);
      }
    }
  };

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

  // Handle typing indicator via Yjs awareness
  function handleTyping() {
    updatePresence({ isTyping: true });
    
    // Clear typing indicator after 3 seconds of inactivity
    if ((window as any).typingTimeout) clearTimeout((window as any).typingTimeout);
    (window as any).typingTimeout = setTimeout(() => {
      updatePresence({ isTyping: false });
    }, 3000);
  }

  const currentYText = tab === 'html' ? yHtml : tab === 'css' ? yCss : yJs;
  // We stop passing awareness directly to y-monaco to bypass its built-in remote cursors.
  // This allows us to strictly manage custom decorations via our CodeEditor component!
  const awareness = null;

  // Follow Mode Logic: Sync Tab and Scroll
  useEffect(() => {
    if (!followId) return;
    const followedUser = users.find(u => u.id === followId);
    if (!followedUser) return;
    
    // Sync tab if different
    if (followedUser.currentTab && followedUser.currentTab !== tab) {
      setTab(followedUser.currentTab as 'html' | 'css' | 'js');
    }
  }, [followId, users]); // Remove 'tab' from dependencies to fix race condition loop

  return (
    <div className="editor-layout">
      <Toolbar
        title={snippet?.title || 'Snippet'}
        onSave={doSave}
        onFork={doFork}
        onShare={doShare}
        onRename={user && snippet?.owner?.toString() === user.id ? doRename : undefined}
        onDelete={user && snippet?.owner?.toString() === user.id ? () => setDeleteModal(true) : undefined}
        status={`Socket: ${status} · Users: ${users.length}${isOffline ? ' · OFFLINE' : ''}`}
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
          <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
            {!isSynced && (
              <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backdropFilter: 'blur(4px)',
                backgroundColor: 'rgba(0,0,0,0.4)',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: '500',
                gap: '8px'
              }}>
                <div className="pulse-dot" style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#3b82f6' }}></div>
                Establishing lossless sync...
              </div>
            )}
            <div style={{ display: tab === 'html' ? 'block' : 'none', height: '100%' }}>
              <CodeEditor
                language="html"
                yText={yHtml}
                awareness={awareness}
                remoteCursors={Object.values(remoteCursors['html'])}
                followId={followId}
                onCursor={(pos) => updatePresence({ cursor: pos })}
                onChange={handleTyping}
              />
            </div>
            <div style={{ display: tab === 'css' ? 'block' : 'none', height: '100%' }}>
              <CodeEditor
                language="css"
                yText={yCss}
                awareness={awareness}
                remoteCursors={Object.values(remoteCursors['css'])}
                followId={followId}
                onCursor={(pos) => updatePresence({ cursor: pos })}
                onChange={handleTyping}
              />
            </div>
            <div style={{ display: tab === 'js' ? 'block' : 'none', height: '100%' }}>
              <CodeEditor
                language="javascript"
                yText={yJs}
                awareness={awareness}
                remoteCursors={Object.values(remoteCursors['js'])}
                followId={followId}
                onCursor={(pos) => updatePresence({ cursor: pos })}
                onChange={handleTyping}
              />
            </div>
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
        isAutosaving={showAutosaveToast}
        followId={followId}
        onFollowUser={setFollowId}
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

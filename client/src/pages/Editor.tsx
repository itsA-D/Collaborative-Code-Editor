import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import CodeEditor from '../components/CodeEditor';
import UserPresence from '../components/UserPresence';
import Modal from '../components/Modal';
import { IDEWorkspace } from '../components/ide';
import { useAuth } from '../state/AuthContext';
import { useSnippet } from '../state/SnippetContext';
import api from '../api/client';
import { analytics } from '../analytics/events';

const USER_COLORS = [
  '#8B5CF6',
  '#22C55E',
  '#38BDF8',
  '#F59E0B',
  '#F43F5E',
  '#14B8A6',
  '#A855F7',
  '#FB7185',
];

function getColorForUser(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) >>> 0;
  return USER_COLORS[h % USER_COLORS.length];
}

interface Collaborator {
  clientId: number;
  user: { id: string; name: string; color: string };
  cursor?: { anchor: number; head: number };
  activeFile?: string;
  status?: string;
}

export default function EditorPage() {
  const { snippetId } = useParams();
  const { token, user } = useAuth();
  const { setSnippetName, registerRenameHandler } = useSnippet();
  const [snippet, setSnippet] = useState<any>(null);
  const [tab, setTab] = useState<'html' | 'css' | 'js'>('html');
  const [banner, setBanner] = useState<string | null>(null);
  const [showAutosaveToast, setShowAutosaveToast] = useState(false);
  const [deleteModal, setDeleteModal] = useState(false);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const nav = useNavigate();
  const hasSetNameRef = useRef(false);
  const doRenameRef = useRef<(newTitle: string) => Promise<void>>();
  const localClientIdRef = useRef<number | null>(null);
  const tabRef = useRef(tab);
  const collaboratorsCountRef = useRef(0);

  tabRef.current = tab;

  // Reported at most once per 15s so continuous typing yields a single signal.
  const reportLocalEdit = useMemo(
    () =>
      analytics.codeEditedThrottled(() => ({
        language: tabRef.current === 'js' ? 'javascript' : tabRef.current,
        editor: 'snippet_ide',
        collaborative: true,
      })),
    []
  );

  const reportCollaboration = useMemo(() => {
    let sent = false;
    return () => {
      if (sent) return;
      sent = true;
      const language = tabRef.current === 'js' ? 'javascript' : tabRef.current;
      // Others already in the room means this client joined an existing session.
      if (collaboratorsCountRef.current > 0) analytics.collaborationJoined({ language });
      else analytics.collaborationStarted({ language });
    };
  }, []);

  useEffect(() => {
    if (!snippetId || snippetId === 'temp') return;
    analytics.snippetOpened({ authenticated: !!user });
  }, [snippetId, user]);

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

    // Store local client ID for filtering self
    localClientIdRef.current = wsProvider.awareness.clientID;

    // Set user info in awareness
    const color = getColorForUser(user?.id || 'anonymous');
    wsProvider.awareness.setLocalStateField('user', {
      id: user?.id || 'anonymous',
      name: user?.name || 'Anonymous',
      color,
    });

    // Subscribe to awareness changes
    const awareness = wsProvider.awareness;
    const onAwarenessChange = () => {
      const states = awareness.getStates();
      const collabs: Collaborator[] = [];
      states.forEach((state, clientId) => {
        if (clientId === localClientIdRef.current) return;
        if (state.user) {
          collabs.push({
            clientId,
            user: state.user,
            cursor: state.cursor,
            activeFile: state.activeFile,
            status: state.status,
          });
        }
      });
      setCollaborators(collabs);
      collaboratorsCountRef.current = collabs.length;
    };

    awareness.on('change', onAwarenessChange);
    // Initial sync
    onAwarenessChange();

    // Subscribe to Yjs updates for preview
    const updateHandler = (_update?: Uint8Array, origin?: unknown) => {
      // Remote traffic arrives with the provider as its origin, so this cleanly
      // separates the user's own typing from collaborators' edits.
      if (origin !== wsProvider) reportLocalEdit();
      setHtmlText(ydoc.getText('html').toString());
      setCssText(ydoc.getText('css').toString());
      setJsText(ydoc.getText('js').toString());
    };
    ydoc.on('update', updateHandler);
    updateHandler(undefined, wsProvider);

    // Report collaboration once the socket is actually live.
    wsProvider.on('status', ({ status }: { status: string }) => {
      if (status === 'connected') reportCollaboration();
    });

    return () => {
      awareness.off('change', onAwarenessChange);
      ydoc.off('update', updateHandler);
      wsProvider.destroy();
      ydoc.destroy();
      setIsYjsReady(false);
      setCollaborators([]);
    };
  }, [snippetId, token, user?.id, user?.name, reportLocalEdit, reportCollaboration]);

  // Update awareness when active tab changes
  useEffect(() => {
    const awareness = providerRef.current?.awareness;
    if (awareness) {
      const tabNames: Record<string, string> = { html: 'index.html', css: 'styles.css', js: 'script.js' };
      awareness.setLocalStateField('activeFile', tabNames[tab]);
    }
  }, [tab]);

  // load snippet via REST for metadata
  useEffect(() => {
    hasSetNameRef.current = false;
    (async () => {
      try {
        const res = await api.get(`/api/snippets/${snippetId}`);
        setSnippet(res.data);
        if (!hasSetNameRef.current) {
          setSnippetName(res.data.title || res.data.name || 'new snippet');
          hasSetNameRef.current = true;
        }
      } catch { }
    })();
  }, [snippetId, setSnippetName]);

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
    const interval = setInterval(() => doSave(true), 10000);
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
        analytics.snippetSaved({ authenticated: !!user, source: 'ide' });
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
      setSnippetName(newTitle);
      setBanner('Renamed'); setTimeout(() => setBanner(null), 1500);
    } catch (e: any) {
      setBanner(e?.response?.data?.message || 'Rename failed');
    }
  }

  doRenameRef.current = doRename;

  useEffect(() => {
    registerRenameHandler(async (newName: string) => {
      if (doRenameRef.current) await doRenameRef.current(newName);
    });
  }, [registerRenameHandler]);

  async function doDelete() {
    if (!user) { nav('/login'); return; }
    try {
      await api.delete(`/api/snippets/${snippetId}`);
      analytics.snippetDeleted({ authenticated: !!user, source: 'ide' });
      nav('/explore');
    } catch (e: any) {
      setBanner(e?.response?.data?.message || 'Delete failed');
    }
  }

  // Get current Yjs text and awareness for active tab
  const currentYText = tab === 'html' ? yHtml : tab === 'css' ? yCss : yJs;
  const awareness = providerRef.current?.awareness || null;

  // Tab data
  const tabs = [
    { id: 'html', name: 'index.html', type: 'html' as const, icon: '🌐' },
    { id: 'css', name: 'styles.css', type: 'css' as const, icon: '🎨' },
    { id: 'js', name: 'script.js', type: 'js' as const, icon: '🎯' },
  ];

  const [cursorPosition, setCursorPosition] = useState<{ line: number; column: number }>({ line: 1, column: 1 });

  const getLanguageName = (tab: string) => {
    switch (tab) {
      case 'html': return 'HTML';
      case 'css': return 'CSS';
      case 'js': return 'JavaScript';
      default: return 'Plain Text';
    }
  };

  // Determine connection status from provider
  const isConnected = providerRef.current?.wsconnected === true;

  // Fires once when the saved-snippet IDE becomes usable.
  useEffect(() => {
    analytics.ideOpened({ authenticated: !!user, language: getLanguageName(tab) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <IDEWorkspace
        tabs={tabs}
        activeTab={tab}
        onTabChange={(tabId) => setTab(tabId as 'html' | 'css' | 'js')}
        isConnected={isConnected}
        userCount={collaborators.length + 1}
        onSave={() => doSave(false)}
        onShare={doShare}
        title={snippet?.title}
        onRename={doRename}
        preview={{ html: htmlText, css: cssText, js: jsText }}
        status={{
          isConnected,
          language: getLanguageName(tab),
          cursorPosition,
        }}
        collaborators={collaborators.map(c => ({
          id: c.user.id,
          name: c.user.name,
          color: c.user.color,
          currentTab: c.activeFile,
        }))}
      >
        <div style={{ flex: 1, minHeight: 0 }}>
          <div style={{ display: tab === 'html' ? 'block' : 'none', height: '100%' }}>
            <CodeEditor
              language="html"
              yText={yHtml}
              awareness={awareness}
              onCursor={(pos) => setCursorPosition({ line: pos.lineNumber, column: pos.column })}
            />
          </div>
          <div style={{ display: tab === 'css' ? 'block' : 'none', height: '100%' }}>
            <CodeEditor
              language="css"
              yText={yCss}
              awareness={awareness}
              onCursor={(pos) => setCursorPosition({ line: pos.lineNumber, column: pos.column })}
            />
          </div>
          <div style={{ display: tab === 'js' ? 'block' : 'none', height: '100%' }}>
            <CodeEditor
              language="javascript"
              yText={yJs}
              awareness={awareness}
              onCursor={(pos) => setCursorPosition({ line: pos.lineNumber, column: pos.column })}
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
        users={collaborators.map(c => ({
          id: c.user.id,
          name: c.user.name,
          color: c.user.color,
          currentTab: c.activeFile,
        }))}
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
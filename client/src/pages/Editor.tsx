import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import CodeEditor from '../components/CodeEditor';
import LivePreview from '../components/LivePreview';
import UserPresence from '../components/UserPresence';
import Toolbar from '../components/Toolbar';
import { useAuth } from '../state/AuthContext';
import { useSocket } from '../hooks/useSocket';
import api from '../api/client';

export default function EditorPage() {
  const { snippetId } = useParams();
  const { token, user } = useAuth();
  const { socket, status } = useSocket(token);
  const [snippet, setSnippet] = useState<any>(null);
  const [tab, setTab] = useState<'html'|'css'|'js'>('html');
  const [html, setHtml] = useState('');
  const [css, setCss] = useState('');
  const [js, setJs] = useState('');
  const [users, setUsers] = useState<any[]>([]);
  const [remoteCursors, setRemoteCursors] = useState<{ [K in 'html'|'css'|'js']: Record<string, { id: string; name: string; color: string; position: { lineNumber: number; column: number } }>}>({ html: {}, css: {}, js: {} });
  const [banner, setBanner] = useState<string | null>(null);
  const [typing, setTyping] = useState<{ [K in 'html'|'css'|'js']: Record<string, { id: string; name: string; color: string; ts: number }> }>({ html: {}, css: {}, js: {} });
  const nav = useNavigate();

  const draftKey = useMemo(() => `draft:${snippetId}`, [snippetId]);

  // load snippet via REST for metadata and initial code if Redis empty
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/api/snippets/${snippetId}`);
        setSnippet(res.data);
      } catch {}
    })();
  }, [snippetId]);

  // socket joins and events
  useEffect(() => {
    if (!socket || !snippetId) return;
    socket.emit('join-snippet', { snippetId });

    const onActive = (u: any[]) => {
      setUsers(u);
      // prune cursors for users not active
      setRemoteCursors(prev => {
        const activeIds = new Set(u.map(x=>x.id));
        const next = { html: { ...prev.html }, css: { ...prev.css }, js: { ...prev.js } } as typeof prev;
        (['html','css','js'] as const).forEach(lang => {
          Object.keys(next[lang]).forEach(uid => { if (!activeIds.has(uid)) delete next[lang][uid]; });
        });
        return next;
      });
    };
    const onJoined = (_: any) => {};
    const onLeft = (p: any) => {
      const uid = p?.id;
      if (!uid) return;
      setRemoteCursors(prev => {
        const next = { html: { ...prev.html }, css: { ...prev.css }, js: { ...prev.js } } as typeof prev;
        (['html','css','js'] as const).forEach(lang => { delete next[lang][uid]; });
        return next;
      });
    };

    const onCode = (p: any) => {
      if (p.language === 'all') {
        setHtml(p.html || ''); setCss(p.css || ''); setJs(p.js || '');
        const draft = localStorage.getItem(draftKey);
        if (draft) {
          try {
            const d = JSON.parse(draft);
            if (d.html !== p.html || d.css !== p.css || d.js !== p.js) setBanner('Unsaved local changes detected. Keep local or discard?');
          } catch {}
        }
        return;
      }
      if (p.language === 'html') setHtml(p.code);
      if (p.language === 'css') setCss(p.code);
      if (p.language === 'js') setJs(p.code);
    };

    const onCursor = (p: any) => {
      const { userId, name, color, position, language } = p || {};
      if (!userId || !language) return;
      setRemoteCursors(prev => ({
        ...prev,
        [language]: { ...prev[language as 'html'|'css'|'js'], [userId]: { id: userId, name, color, position } }
      }));
    };

    const onTyping = (p: any) => {
      const { userId, name, language, ts } = p || {};
      if (!userId || !language) return;
      // infer color from presence if possible
      const u = users.find(x => x.id === userId);
      const color = u?.color || 'var(--accent)';
      setTyping(prev => ({
        ...prev,
        [language]: { ...prev[language as 'html'|'css'|'js'], [userId]: { id: userId, name, color, ts: ts || Date.now() } }
      }));
      // auto-remove after 1.6s
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
    socket.on('code-updated', onCode);
    socket.on('cursor-updated', onCursor);
    socket.on('user-typing', onTyping);

    return () => {
      socket.emit('leave-snippet', { snippetId });
      socket.off('active-users', onActive);
      socket.off('user-joined', onJoined);
      socket.off('user-left', onLeft);
      socket.off('code-updated', onCode);
      socket.off('cursor-updated', onCursor);
      socket.off('user-typing', onTyping);
    };
  }, [socket, snippetId, draftKey]);

  // debounced preview writing handled inside LivePreview

  // broadcast local changes with timestamp (LWW)
  function broadcast(lang: 'html'|'css'|'js', code: string) {
    if (!socket || !snippetId) return;
    socket.emit('code-change', { snippetId, language: lang, code, ts: Date.now() });
  }

  // save via Ctrl+S global event
  useEffect(() => {
    const handler = () => { doSave(); };
    window.addEventListener('save-request', handler as any);
    return () => window.removeEventListener('save-request', handler as any);
  }, [snippetId, html, css, js]);

  // offline draft
  useEffect(() => {
    const draft = { html, css, js, at: Date.now() };
    localStorage.setItem(draftKey, JSON.stringify(draft));
  }, [html, css, js, draftKey]);

  async function doSave() {
    if (!user) { nav('/login'); return; }
    try {
      await api.put(`/api/snippets/${snippetId}`, { html, css, js });
      setBanner('Saved'); setTimeout(()=>setBanner(null), 1500);
    } catch (e: any) {
      setBanner(e?.response?.data?.message || 'Save failed');
    }
  }

  async function doFork() {
    if (!user) { nav('/login'); return; }
    try { const res = await api.post(`/api/snippets/${snippetId}/fork`); nav(`/editor/${res.data._id}`); } catch {}
  }

  function doShare() {
    navigator.clipboard.writeText(window.location.href);
    setBanner('Link copied'); setTimeout(()=>setBanner(null), 1000);
  }

  function keepLocal() {
    // resend local draft as latest
    broadcast('html', html); broadcast('css', css); broadcast('js', js); setBanner(null);
  }
  function discardLocal() {
    localStorage.removeItem(draftKey); setBanner(null);
  }

  return (
    <div className="editor-layout">
      <Toolbar title={snippet?.title || 'Snippet'} onSave={doSave} onFork={doFork} onShare={doShare} status={`Socket: ${status} · Users: ${users.length}`} />
      <div className="editor-main">
        <div className="card" style={{ display:'flex', flexDirection:'column' }}>
          <div className="tabs">
            <button className={`tab ${tab==='html' ? 'active' : ''}`} onClick={()=>setTab('html')}>HTML</button>
            <button className={`tab ${tab==='css' ? 'active' : ''}`} onClick={()=>setTab('css')}>CSS</button>
            <button className={`tab ${tab==='js' ? 'active' : ''}`} onClick={()=>setTab('js')}>JS</button>
          </div>
          <div className="typing-indicators">
            {Object.values(typing[tab] || {}).filter((u:any)=>u.id!==user?.id).slice(0,3).map((u:any)=> (
              <span key={u.id} className="typing-pill" style={{ borderColor: u.color, color: u.color }}>{u.name} typing…</span>
            ))}
          </div>
          <div style={{ flex:1, minHeight:0 }}>
            {tab==='html' && (
              <CodeEditor
                language="html"
                value={html}
                onChange={(v)=>{setHtml(v); broadcast('html', v); socket?.emit('typing', { snippetId, language: 'html' });}}
                onCursor={(pos)=> socket?.emit('cursor-move', { snippetId, language: 'html', position: pos })}
                others={Object.values(remoteCursors.html || {}).filter((u: any) => u.id !== user?.id) as { id: string; name: string; color: string; position: { lineNumber: number; column: number } }[]}
              />
            )}
            {tab==='css' && (
              <CodeEditor
                language="css"
                value={css}
                onChange={(v)=>{setCss(v); broadcast('css', v); socket?.emit('typing', { snippetId, language: 'css' });}}
                onCursor={(pos)=> socket?.emit('cursor-move', { snippetId, language: 'css', position: pos })}
                others={Object.values(remoteCursors.css || {}).filter((u: any) => u.id !== user?.id) as { id: string; name: string; color: string; position: { lineNumber: number; column: number } }[]}
              />
            )}
            {tab==='js' && (
              <CodeEditor
                language="javascript"
                value={js}
                onChange={(v)=>{setJs(v); broadcast('js', v); socket?.emit('typing', { snippetId, language: 'js' });}}
                onCursor={(pos)=> socket?.emit('cursor-move', { snippetId, language: 'js', position: pos })}
                others={Object.values(remoteCursors.js || {}).filter((u: any) => u.id !== user?.id) as { id: string; name: string; color: string; position: { lineNumber: number; column: number } }[]}
              />
            )}
          </div>
        </div>
        <div className="card" style={{ display:'flex', flexDirection:'column' }}>
          <div style={{ marginBottom: 6 }}>Live Preview</div>
          <div style={{ flex:1, minHeight:0 }}>
            <LivePreview html={html} css={css} js={js} />
          </div>
        </div>
      </div>
      {banner && (
        <div style={{ padding: 8 }}>
          <div className="banner">
            <span>{banner}</span>
            {banner?.includes('Unsaved') && (
              <>
                <button className="btn" onClick={discardLocal}>Discard</button>
                <button className="btn primary" onClick={keepLocal}>Keep Local</button>
              </>
            )}
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
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../state/AuthContext';

export default function Explore() {
  const [items, setItems] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [title, setTitle] = useState('New Snippet');
  const [q, setQ] = useState('');
  const { user } = useAuth();
  const nav = useNavigate();

  async function load(p = 1) {
    const res = await api.get(`/api/snippets?page=${p}&limit=12`);
    setItems(res.data.items); setTotal(res.data.total); setPage(res.data.page);
  }
  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return items;
    return items.filter((it) => (it.title || '').toLowerCase().includes(term));
  }, [items, q]);

  async function createSnippet() {
    if (!user) { nav('/login'); return; }
    const res = await api.post('/api/snippets', { title, html: '<h1>Hello</h1>', css: 'h1{color:#3b82f6;}', js: "console.log('Hello')", isPublic: true });
    nav(`/editor/${res.data._id}`);
  }

  const pages = Math.ceil(total / 12) || 1;

  return (
    <div className="explore-wrap">
      <section className="explore-hero">
        <div className="hero-content">
          <div>
            <h1 className="hero-title">Create. Fork. Collaborate.</h1>
            <p className="hero-sub">A CodePen-like space for HTML/CSS/JS with real-time collab.</p>
          </div>
          {user && (
            <div className="explore-actions">
              <input className="input input-lg" value={title} onChange={e => setTitle(e.target.value)} placeholder="New snippet title" />
              <button className="btn primary btn-lg" onClick={createSnippet}>New Pen</button>
            </div>
          )}
        </div>
      </section>

      <div className="explore-toolbar">
        <input className="input" placeholder="Search snippets" value={q} onChange={e => setQ(e.target.value)} />
        <div className="pager">
          <button className="btn" disabled={page <= 1} onClick={() => load(page - 1)}>Prev</button>
          <span className="status">Page {page} / {pages}</span>
          <button className="btn" disabled={page >= pages} onClick={() => load(page + 1)}>Next</button>
        </div>
      </div>

      <div className="pen-grid">
        {visible.map(it => (
          <div className="pen-card" key={it._id}>
            <div className="pen-header">
              <h4 className="pen-title">{it.title}</h4>
              <span className="pen-meta">Views {it.views} · Forks {it.forks}</span>
            </div>
            <div className="pen-actions">
              <Link className="btn" to={`/editor/${it._id}`}>Open</Link>
              <button className="btn" onClick={() => nav(`/editor/${it._id}`)}>Edit</button>
            </div>
          </div>
        ))}
        {visible.length === 0 && (
          <div className="empty-note">No results. Try a different title.</div>
        )}
      </div>
    </div>
  );
}

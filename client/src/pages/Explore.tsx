import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/client';
import Modal from '../components/Modal';
import { useAuth } from '../state/AuthContext';
import { useTemporarySession } from '../state/TemporarySessionContext';

const PER_PAGE = 12;

interface BoardSnippet {
  _id: string;
  title: string;
  views?: number;
  forks?: number;
  updatedAt?: string;
}

function formatWhen(iso?: string) {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const minutes = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

/**
 * The signed-in user's own snippet workspace. There is no public/community
 * feed: the list is always scoped to the current owner.
 */
export default function Explore() {
  const { user } = useAuth();
  const { startSession } = useTemporarySession();
  const nav = useNavigate();

  const [items, setItems] = useState<BoardSnippet[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [query, setQuery] = useState('');
  const [loadError, setLoadError] = useState('');
  const [actionError, setActionError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(
    async (p = 1) => {
      if (!user) {
        setItems([]);
        setTotal(0);
        setPage(1);
        return;
      }
      try {
        const res = await api.get(`/api/snippets?page=${p}&limit=${PER_PAGE}&owner=${user.id}`);
        setItems(res.data.items || []);
        setTotal(res.data.total || 0);
        setPage(res.data.page || p);
        setLoadError('');
      } catch (e: any) {
        setItems([]);
        setTotal(0);
        setLoadError(e?.response?.data?.message || 'Could not load your snippets.');
      }
    },
    [user]
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => (item.title || '').toLowerCase().includes(term));
  }, [items, query]);

  const pages = Math.ceil(total / PER_PAGE) || 1;

  function goToPage(next: number) {
    if (next < 1 || next > pages || next === page) return;
    load(next);
  }

  /** Same temporary-session entry point as the homepage. */
  function startNew() {
    if (!user) {
      nav('/login');
      return;
    }
    startSession();
    nav('/editor/temp');
  }

  async function deleteSnippet() {
    if (!deleteTarget) return;
    setDeleting(true);
    setActionError('');
    try {
      await api.delete(`/api/snippets/${deleteTarget.id}`);
      setDeleteTarget(null);
      setDeleting(false);
      load(page);
    } catch (e: any) {
      setDeleting(false);
      setActionError(e?.response?.data?.message || 'Delete failed.');
    }
  }

  if (!user) {
    return (
      <div className="home-page board-page">
        <main className="home-container board__inner">
          <div className="board__head">
            <h1 className="home-h2">Your snippets</h1>
          </div>
          <div className="board__empty">
            <p className="board__empty-title">Nothing here yet</p>
            <p className="board__empty-text">Log in to see your own stuff....</p>
            <div className="board__empty-actions">
              <Link className="home-btn home-btn--ghost" to="/login">
                Login
              </Link>
              <Link className="home-btn home-btn--primary" to="/">
                Back to home
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="home-page board-page">
      <main className="home-container board__inner">
        <div className="board__head">
          <div>
            <h1 className="home-h2">Your snippets</h1>
            <p className="board__sub">
              {total} {total === 1 ? 'snippet' : 'snippets'} saved to your account.
            </p>
          </div>
          <button type="button" className="home-btn home-btn--primary home-btn--sm" onClick={startNew}>
            New snippet
          </button>
        </div>

        <div className="board__toolbar">
          <label className="board__search">
            <span className="board__search-icon" aria-hidden="true">
              ⌕
            </span>
            <span className="visually-hidden">Search your snippets</span>
            <input
              className="board__search-input"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search your snippets"
            />
          </label>

          <div className="board__pager">
            <button type="button" className="home-btn home-btn--ghost home-btn--sm" disabled={page <= 1} onClick={() => goToPage(page - 1)}>
              Prev
            </button>
            <span className="board__pager-status">
              Page {page} / {pages}
            </span>
            <button type="button" className="home-btn home-btn--ghost home-btn--sm" disabled={page >= pages} onClick={() => goToPage(page + 1)}>
              Next
            </button>
          </div>
        </div>

        {actionError && (
          <p className="board__error" role="alert">
            {actionError}
          </p>
        )}

        {loadError ? (
          <div className="board__empty" role="status">
            <p className="board__empty-title">{loadError}</p>
            <button type="button" className="home-btn home-btn--ghost" onClick={() => load(page)}>
              Try again
            </button>
          </div>
        ) : visible.length === 0 ? (
          <div className="board__empty">
            <p className="board__empty-title">{query ? 'No matching snippets' : 'No snippets yet'}</p>
            <p className="board__empty-text">
              {query
                ? 'Try a different name, or clear the search to see everything.'
                : 'Start a temporary session and save it when you are ready.'}
            </p>
            <button type="button" className="home-btn home-btn--primary" onClick={query ? () => setQuery('') : startNew}>
              {query ? 'Clear search' : 'Start coding free'}
            </button>
          </div>
        ) : (
          <ul className="board__grid">
            {visible.map((item) => (
              <li className="board-card" key={item._id}>
                <div className="board-card__head">
                  <h2 className="board-card__title">{item.title}</h2>
                  <span className="board-card__meta">
                    {item.views || 0} views · {item.forks || 0} forks
                  </span>
                </div>
                <p className="board-card__meta board-card__updated">{formatWhen(item.updatedAt)}</p>
                <div className="board-card__actions">
                  <Link className="home-btn home-btn--ghost home-btn--sm" to={`/editor/${item._id}`}>
                    Open
                  </Link>
                  <button
                    type="button"
                    className="home-btn home-btn--danger home-btn--sm"
                    onClick={() => setDeleteTarget({ id: item._id, title: item.title })}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>

      <Modal
        isOpen={deleteTarget !== null}
        onClose={() => !deleting && setDeleteTarget(null)}
        onConfirm={deleteSnippet}
        title="Delete Snippet"
        message={`Are you sure you want to delete "${deleteTarget?.title || 'this snippet'}"? This action cannot be undone.`}
        confirmText={deleting ? 'Deleting…' : 'Delete'}
        cancelText="Cancel"
        isDanger={true}
      />
    </div>
  );
}
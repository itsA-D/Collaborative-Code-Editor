import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Explore from './pages/Explore';
import Editor from './pages/Editor';
import { useAuth } from './state/AuthContext';
import { SnippetProvider, useSnippet } from './state/SnippetContext';

function AppContent() {
  const { user, logout } = useAuth();
  const { snippetName, setSnippetName, renameSnippet } = useSnippet();
  const [isLight, setIsLight] = useState(false);
  const location = useLocation();
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';
  const isEditorRoute = location.pathname.startsWith('/editor/');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editName, setEditName] = useState('');

  // Clear snippet name when not on editor route
  useEffect(() => {
    if (!isEditorRoute && snippetName) {
      setSnippetName('');
    }
  }, [isEditorRoute, snippetName, setSnippetName]);

  const handleRename = async () => {
    if (!editName.trim()) return;
    try {
      if (renameSnippet) {
        await renameSnippet(editName.trim());
      }
      setSnippetName(editName.trim());
      setIsEditingName(false);
    } catch (err) {
      console.error('Failed to rename snippet:', err);
    }
  };

  const handleNameClick = () => {
    if (user && snippetName) {
      setEditName(snippetName);
      setIsEditingName(true);
    }
  };

  useEffect(() => {
    const stored = localStorage.getItem('theme') || 'dark';
    if (stored === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
      setIsLight(true);
    } else {
      document.documentElement.removeAttribute('data-theme');
      setIsLight(false);
    }
  }, []);

  const toggleTheme = () => {
    if (isLight) {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'dark');
      setIsLight(false);
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
      setIsLight(true);
    }
  };
  return (
    <div className="app">
      {!isAuthRoute && (
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Link to="/explore" className="brand">Collab Coder</Link>
            {snippetName && (
              <>
                <span style={{ color: 'var(--muted)', fontSize: '14px' }}>/</span>
                {isEditingName ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    onBlur={handleRename}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    autoFocus
                    style={{
                      background: 'var(--control-bg)',
                      border: '1px solid var(--accent)',
                      color: 'var(--text)',
                      fontSize: '13px',
                      fontWeight: 500,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      outline: 'none'
                    }}
                  />
                ) : (
                  <span
                    style={{
                      color: 'var(--text)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: user ? 'pointer' : 'default'
                    }}
                    onClick={handleNameClick}
                    title={user ? 'Click to rename' : ''}
                  >
                    {snippetName}
                  </span>
                )}
              </>
            )}
          </div>
          <div className="spacer" />
          <button className="btn" onClick={toggleTheme}>{isLight ? 'Dark' : 'Light'}</button>
          {user ? (
            <>
              <span className="user">{user.name}</span>
              <button className="btn" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link className="btn" to="/login">Login</Link>
              <Link className="btn" to="/register">Register</Link>
            </>
          )}
        </header>
      )}
      <Routes>
        <Route path="/" element={<Navigate to="/explore" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/editor/:snippetId" element={<Editor />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <SnippetProvider>
      <AppContent />
    </SnippetProvider>
  );
}

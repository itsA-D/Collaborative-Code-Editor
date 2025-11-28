import { Routes, Route, Navigate, Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Explore from './pages/Explore';
import Editor from './pages/Editor';
import { useAuth } from './state/AuthContext';

export default function App() {
  const { user, logout } = useAuth();
  const [isLight, setIsLight] = useState(false);

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
      <header className="topbar">
        <Link to="/explore" className="brand">Collab Editor</Link>
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

import { Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login';
import Register from './pages/Register';
import Explore from './pages/Explore';
import Home from './pages/Home';
import HowItWorks from './pages/HowItWorks';
import Editor from './pages/Editor';
import TemporaryEditor from './pages/TemporaryEditor';
import SessionGuard, { TEMP_EDITOR_PATH } from './components/session/SessionGuard';
import { SnippetProvider, useSnippet } from './state/SnippetContext';
import { ThemeProvider } from './state/ThemeContext';
import { TemporarySessionProvider } from './state/TemporarySessionContext';
import Navbar from './components/header/Navbar';

function AppContent() {
  const { snippetName, setSnippetName } = useSnippet();
  const location = useLocation();
  const isAuthRoute = location.pathname === '/login' || location.pathname === '/register';
  const isHomeRoute = location.pathname === '/';
  const isBoardRoute = location.pathname === '/explore';
  const isEditorRoute = location.pathname.startsWith('/editor/');

  // Marketing + board surfaces: flat background and no app-wide cursor glow.
  useEffect(() => {
    const useSurface = isHomeRoute || isBoardRoute;
    document.body.classList.toggle('home-body', useSurface);
    return () => document.body.classList.remove('home-body');
  }, [isHomeRoute, isBoardRoute]);

  // In-app anchors (e.g. "How it works") need an explicit scroll target.
  useEffect(() => {
    if (!location.hash) return;
    const el = document.getElementById(location.hash.slice(1));
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
  }, [location.pathname, location.hash]);

  // Clear snippet name when not on editor route
  useEffect(() => {
    if (!isEditorRoute && snippetName) {
      setSnippetName('');
    }
  }, [isEditorRoute, snippetName, setSnippetName]);

  return (
    <div className={`app ${isAuthRoute ? 'auth-route' : 'app-surface'}`}>
      {!isAuthRoute && <Navbar variant={isHomeRoute ? 'home' : 'app'} />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/explore" element={<Explore />} />
        <Route path={TEMP_EDITOR_PATH} element={<TemporaryEditor />} />
        <Route path="/editor/:snippetId" element={<Editor />} />
      </Routes>
      <SessionGuard />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <SnippetProvider>
        <TemporarySessionProvider>
          <AppContent />
        </TemporarySessionProvider>
      </SnippetProvider>
    </ThemeProvider>
  );
}

import { Link } from 'react-router-dom';
import type { SessionUser } from './types';

interface HomeFooterProps {
  user: SessionUser | null;
  onLogout: () => void;
}

export default function HomeFooter({ user, onLogout }: HomeFooterProps) {
  return (
    <footer className="home-footer">
      <div className="home-container home-footer__inner">
        <span className="home-footer__brand">Collab Coder</span>
        <div className="home-footer__links">
          <Link to="/explore">Explore</Link>
          <a href="#how-it-works">How it works</a>
          {user ? (
            <button type="button" className="home-footer__action" onClick={onLogout}>
              Log out
            </button>
          ) : (
            <Link to="/login">Login</Link>
          )}
        </div>
      </div>
    </footer>
  );
}

import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuth } from '../../state/AuthContext';
import { LogOutIcon } from '../Icons';
import ThemeToggle from '../ThemeToggle';
import '../home/home.css';
import '../theme-toggle.css';

interface NavbarProps {
  variant?: 'home' | 'app';
}

export default function Navbar({ variant = 'app' }: NavbarProps) {
  const { user, logout } = useAuth();
  const [isScrolled, setIsScrolled] = useState(false);
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header className={`home-nav home-nav--${variant} glass-scope${isScrolled ? ' scrolled' : ''}`}>
      <div className="home-container home-nav__inner">
        <div className="home-nav__brand-wrap">
          <Link to="/" className="home-nav__brand">
            Collab Coder
          </Link>
        </div>

        <nav className="home-nav__links" aria-label="Main">
          <Link to="/explore">IDE</Link>
          <Link to="/how-it-works">How it works</Link>
        </nav>

        <div className="home-nav__actions">
          <ThemeToggle />

          {user ? (
            <>
              <span className="home-nav__user">{user.name}</span>
              <button
                type="button"
                className="home-btn home-btn--ghost home-btn--sm home-nav__logout"
                onClick={logout}
                aria-label="Log out"
              >
                <LogOutIcon />
                <span className="home-nav__logout-label">Log out</span>
              </button>
            </>
          ) : (
            <Link to="/login" className="home-btn home-btn--ghost home-btn--sm home-nav__login">
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

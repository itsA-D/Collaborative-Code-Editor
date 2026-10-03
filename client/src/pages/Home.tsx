import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FeatureSection,
  FinalCTA,
  HeroSection,
  HomeFooter,
  ProductPreview,
} from '../components/home';
import { useAuth } from '../state/AuthContext';
import { useTemporarySession } from '../state/TemporarySessionContext';

export default function HomePage() {
  const { user, logout } = useAuth();
  const { startSession } = useTemporarySession();
  const nav = useNavigate();

  /**
   * "Start coding free" never creates a database record: it opens a temporary
   * session in the existing IDE. One implementation, shared with the navbar and
   * the final CTA.
   */
  const startCoding = useCallback(() => {
    startSession();
    nav('/editor/temp');
  }, [nav, startSession]);

  return (
    <div className="home-page">
      {/* Global navbar handled in App shell */}
      <main>
        <HeroSection onStart={startCoding} />

        <section className="home-section home-preview-section">
          <div className="home-container">
            <ProductPreview />
          </div>
        </section>

        <FeatureSection />

        <FinalCTA onStart={startCoding} />
      </main>

      <HomeFooter user={user} onLogout={logout} />
    </div>
  );
}
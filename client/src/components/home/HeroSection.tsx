import { Link } from 'react-router-dom';
import { ArrowRightIcon } from '../Icons';

interface HeroSectionProps {
  onStart: () => void;
}

export default function HeroSection({ onStart }: HeroSectionProps) {
  return (
    <section className="home-hero">
      <div className="home-container home-hero__inner">
        <p className="home-eyebrow">
          <span className="home-eyebrow__dot" aria-hidden="true" />
          Real-time web collaboration
        </p>

        <h1 className="home-hero__title">Create. Fork. Collaborate.</h1>

        <p className="home-hero__sub">
          Build and experiment with HTML, CSS, and JavaScript together in real time.
        </p>

        <div className="home-hero__cta">
          <button type="button" className="home-btn home-btn--primary" onClick={onStart}>
            Start coding free
            <ArrowRightIcon />
          </button>
          <Link className="home-btn home-btn--secondary" to="/explore">
            Explore snippets
          </Link>
        </div>
      </div>
    </section>
  );
}

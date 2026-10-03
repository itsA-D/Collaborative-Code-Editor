import { ArrowRightIcon } from '../Icons';

interface FinalCTAProps {
  onStart: () => void;
}

export default function FinalCTA({ onStart }: FinalCTAProps) {
  return (
    <section className="home-section home-cta">
      <div className="home-container">
        <h2 className="home-cta__title">Ready to build together?</h2>
        <p className="home-cta__text">Create your next snippet and start coding in real time.</p>
        <button type="button" className="home-btn home-btn--primary" onClick={onStart}>
          Start coding free
          <ArrowRightIcon />
        </button>
      </div>
    </section>
  );
}

import { Link, useNavigate } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
import { useTemporarySession } from '../state/TemporarySessionContext';
import { ArrowRightIcon } from '../components/Icons';
import '../components/home/home.css';
import './how-it-works.css';

export default function HowItWorksPage() {
  const { startSession } = useTemporarySession();
  const nav = useNavigate();
  const atmosphereRef = useRef<HTMLDivElement>(null);
  const [hasAtmosphere, setHasAtmosphere] = useState(false);

  const startCoding = () => {
    startSession();
    nav('/editor/temp');
  };

  useEffect(() => {
    const el = atmosphereRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setHasAtmosphere(true);
            obs.unobserve(el);
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -15% 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return (
    <div className="home-page how-it-works-page">
      <main className="how-page-frame">
        {/* HERO */}
        <section className="how-hero">
          <div className="home-container">
            <div className="how-hero__inner">
              <p className="how-eyebrow">
                <span className="how-eyebrow__dot" aria-hidden="true" />
                HOW IT WORKS
              </p>
              <h1 className="how-hero__title">How Collab Coder works</h1>
              <p className="how-hero__sub">
                Start coding in seconds, work together in real time, and keep the snippets you actually want to keep.
              </p>
              <div className="how-hero__cta">
                <button type="button" className="how-btn-primary" onClick={startCoding}>
                  Start coding
                  <ArrowRightIcon />
                </button>
                <Link className="how-btn-secondary" to="/explore">
                  Open IDE →
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 01 */}
        <section className="how-section">
          <div className="home-container">
            <div className="how-grid">
              <div className="how-col how-col--left">
                <div className="how-workflow">
                  <div className="how-workflow__label">01</div>
                  <h2 className="how-workflow__title">Start with a temporary workspace</h2>
                  <p className="how-workflow__body">
                    Open a temporary coding session and start experimenting immediately. Your work stays available
                    during the session until you save or discard it.
                  </p>
                </div>
              </div>
              <div className="how-divider">
                <div className="how-divider__hatch" />
              </div>
              <div className="how-col how-col--right">
                <div className="how-product-frame">
                  <div className="how-product__header">
                    <div className="how-dot" />
                    <div className="how-dot" />
                    <div className="how-dot" />
                    <span>Collab Coder — Temporary Session</span>
                  </div>
                  <div className="how-product__body">
                    <div className="how-product__files">
                      <div className="how-product__file active">index.html</div>
                      <div className="how-product__file">styles.css</div>
                      <div className="how-product__file">script.js</div>
                    </div>
                    <div className="how-product__editor">
                      <div className="how-line">{'<'}!DOCTYPE html{'>'}</div>
                      <div className="how-line">{'<'}html{'>'}</div>
                      <div className="how-line">  {'<'}body{'>'}Hello World{'<'}/body{'>'}</div>
                      <div className="how-line">{'<'}/html{'>'}</div>
                    </div>
                    <div className="how-product__preview">
                      <div className="how-preview-box">Hello World</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 02 */}
        <section className="how-section">
          <div className="home-container">
            <div className="how-grid">
              <div className="how-col how-col--left">
                <div className="how-product-frame">
                  <div className="how-product__header">
                    <div className="how-dot" />
                    <div className="how-dot" />
                    <div className="how-dot" />
                    <span>Collab Coder — Real-time collaboration</span>
                  </div>
                  <div className="how-product__collab">
                    <div className="how-collab-pane">
                      <div className="how-collab-header">User A</div>
                      <div className="how-collab-code">
                        <div>function hello() {'{'}</div>
                        <div className="how-cursor-line">  console.log("Hi");<span className="how-cursor-a"></span></div>
                        <div>{'}'}</div>
                      </div>
                    </div>
                    <div className="how-collab-pane">
                      <div className="how-collab-header">User B</div>
                      <div className="how-collab-code">
                        <div>function hello() {'{'}</div>
                        <div>  console.log("Hi");</div>
                        <div className="how-cursor-line">{'}'}<span className="how-cursor-b"></span></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="how-divider">
                <div className="how-divider__hatch" />
              </div>
              <div className="how-col how-col--right">
                <div className="how-workflow">
                  <div className="how-workflow__label">02</div>
                  <h2 className="how-workflow__title">Work together in real time</h2>
                  <p className="how-workflow__body">
                    Invite collaborators into the same workspace and make changes together without leaving the editor.
                    Code changes and presence stay synchronized in real time.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 03 */}
        <section className="how-section">
          <div className="home-container">
            <div className="how-grid">
              <div className="how-col how-col--left">
                <div className="how-workflow">
                  <div className="how-workflow__label">03</div>
                  <h2 className="how-workflow__title">Save what you want to keep</h2>
                  <p className="how-workflow__body">
                    When you're ready, save the temporary session as a named snippet and return to it later from your
                    own workspace.
                  </p>
                </div>
              </div>
              <div className="how-divider">
                <div className="how-divider__hatch" />
              </div>
              <div className="how-col how-col--right">
                <div className="how-product-frame">
                  <div className="how-product__header">
                    <div className="how-dot" />
                    <div className="how-dot" />
                    <div className="how-dot" />
                    <span>Collab Coder — Save snippet</span>
                  </div>
                  <div className="how-product__body" style={{ gridTemplateColumns: '1fr' }}>
                    <div style={{ padding: '40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 500 }}>Save your snippet</h3>
                      <input
                        type="text"
                        placeholder="Name your snippet..."
                        style={{
                          padding: '8px 10px',
                          borderRadius: '4px',
                          border: '1px solid var(--page-border)',
                          background: 'rgba(0,0,0,0.4)',
                          color: 'var(--page-text)',
                          width: 'min(240px, 80%)',
                        }}
                      />
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button className="how-btn-secondary">Cancel</button>
                        <button className="how-btn-primary">Save</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CAPABILITIES */}
        <section>
          <div className="home-container">
            <div className="how-capabilities">
              <div className="how-cap-item">
                <h3 className="how-cap__title">CREATE</h3>
                <p className="how-cap__body">Build from a blank temporary workspace.</p>
              </div>
              <div className="how-cap-item">
                <h3 className="how-cap__title">FORK</h3>
                <p className="how-cap__body">Start from a snippet you already own.</p>
              </div>
              <div className="how-cap-item">
                <h3 className="how-cap__title">COLLABORATE</h3>
                <p className="how-cap__body">Edit together in real time.</p>
              </div>
            </div>
          </div>
        </section>

        {/* TEAL SECTION */}
        <section className={`how-section how-section--teal ${hasAtmosphere ? 'has-atmosphere' : ''}`} ref={atmosphereRef}>
          <div className="home-container how-atmosphere">
            <div className="how-atmosphere__glow" aria-hidden="true" />
            <h2 className="how-control__title">Everything stays under your control.</h2>
            <p className="how-control__sub">
              Start with a temporary workspace, experiment freely, and save only what you want to keep.
            </p>
            <button type="button" className="how-btn-primary" onClick={startCoding}>
              Start coding
              <ArrowRightIcon />
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
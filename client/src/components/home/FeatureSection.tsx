import { CollaborateIcon, CreateIcon, ForkIcon } from '../Icons';

const FEATURES = [
  {
    key: 'create',
    title: 'Create',
    body: 'Turn ideas into working web snippets.',
    Icon: CreateIcon,
  },
  {
    key: 'fork',
    title: 'Fork',
    body: 'Start with existing code and build on it.',
    Icon: ForkIcon,
  },
  {
    key: 'collaborate',
    title: 'Collaborate',
    body: 'Edit together with real-time collaboration.',
    Icon: CollaborateIcon,
  },
];

export default function FeatureSection() {
  return (
    <section className="home-section home-features" id="how-it-works">
      <div className="home-container">
        <div className="home-features__head">
          <h2 className="home-h2">Everything you need to build together.</h2>
          <p className="home-features__sub">
            One workspace for writing web code, watching it render, and shipping it with other people
            in the same document.
          </p>
        </div>

        <div className="home-features__grid">
          {FEATURES.map(({ key, title, body, Icon }) => (
            <article className="home-feature" key={key}>
              <span className="home-feature__icon">
                <Icon />
              </span>
              <h3 className="home-feature__title">{title}</h3>
              <p className="home-feature__body">{body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

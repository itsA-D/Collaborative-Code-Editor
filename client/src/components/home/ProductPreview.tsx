import type { ReactNode } from 'react';

function CodeLine({ n, children, remote }: { n: number; children?: ReactNode; remote?: boolean }) {
  return (
    <div className={`mp-line${remote ? ' mp-line--remote' : ''}`}>
      <span className="mp-line__no">{n}</span>
      <span className="mp-line__code">{children}</span>
    </div>
  );
}

function Caret({ name, color }: { name: string; color: string }) {
  return (
    <i className="mp-caret" style={{ background: color }}>
      <span className="mp-caret__tag" style={{ background: color }}>
        {name}
      </span>
    </i>
  );
}

const P = (props: { c: string; children: ReactNode }) => <span className={`syn-${props.c}`}>{props.children}</span>;

export default function ProductPreview() {
  return (
    <figure className="home-preview-figure">
      <figcaption className="home-preview-figure__label">Your collaborative workspace</figcaption>
      <div
        className="home-preview"
        role="img"
        aria-label="Your collaborative workspace: a file list, an HTML document being edited together, and a live preview with two collaborators online."
      >
        <div className="home-preview__bar">
          <div className="home-preview__dots" aria-hidden="true">
            <span className="home-preview__dot" />
            <span className="home-preview__dot" />
            <span className="home-preview__dot" />
          </div>
          <span className="home-preview__name">Collab Coder</span>

          <div className="home-preview__bar-right" aria-hidden="true">
            <div className="home-preview__presence">
              <span className="mp-presence">
                <i style={{ background: '#34D399' }} />Ankan
              </span>
              <span className="mp-presence">
                <i style={{ background: '#60A5FA' }} />Ishita
              </span>
            </div>
            <span className="home-preview__action">Share</span>
            <span className="home-preview__action home-preview__action--run">Run</span>
          </div>
        </div>

        <div className="home-preview__scroll">
          <div className="home-preview__body">
            <div className="mp-panel">
              <div className="mp-panel__head">Files</div>
              <div className="mp-files">
                <div className="mp-file mp-file--active">
                  <span className="mp-file__dot" />
                  index.html
                </div>
                <div className="mp-file">
                  <span className="mp-file__dot" />
                style.css
              </div>
              <div className="mp-file">
                <span className="mp-file__dot" />
                script.js
              </div>
            </div>
          </div>

          <div className="mp-panel">
            <div className="mp-panel__head">index.html</div>
            <div className="mp-code">
              <CodeLine n={1}>
                <P c="comment">&lt;!-- shared document --&gt;</P>
              </CodeLine>
              <CodeLine n={2}>
                <P c="punct">&lt;</P>
                <P c="name">div</P> <P c="attr">class</P>
                <P c="punct">=</P>
                <P c="str">&quot;card&quot;</P>
                <P c="punct">&gt;</P>
              </CodeLine>
              <CodeLine n={3}>
                {'  '}
                <P c="punct">&lt;</P>
                <P c="name">h1</P>
                <P c="punct">&gt;</P>
                <P c="text">Hello World</P>
                <P c="punct">&lt;/</P>
                <P c="name">h1</P>
                <P c="punct">&gt;</P>
              </CodeLine>
              <CodeLine n={4}>
                {'  '}
                <P c="punct">&lt;</P>
                <P c="name">p</P>
                <P c="punct">&gt;</P>
                <P c="text">Built together, live.</P>
                <P c="punct">&lt;/</P>
                <P c="name">p</P>
                <P c="punct">&gt;</P>
              </CodeLine>
              <CodeLine n={5} />
              <CodeLine n={6} remote>
                {'  '}
                <P c="punct">&lt;</P>
                <P c="name">button</P> <P c="attr">id</P>
                <Caret name="Ishita" color="#60A5FA" />
                <P c="punct">=</P>
                <P c="str">&quot;run&quot;</P>
                <P c="punct">&gt;</P>
                <P c="text">Run</P>
                <P c="punct">&lt;/</P>
                <P c="name">button</P>
                <P c="punct">&gt;</P>
              </CodeLine>
              <CodeLine n={7}>
                <P c="punct">&lt;/</P>
                <P c="name">div</P>
                <P c="punct">&gt;</P>
              </CodeLine>
              <CodeLine n={8} />
              <CodeLine n={9}>
                <P c="punct">&lt;</P>
                <P c="name">footer</P> <P c="attr">class</P>
                <P c="punct">=</P>
                <P c="str">&quot;meta&quot;</P>
                <P c="punct">&gt;</P>
                <P c="text">Collab Coder</P>
                <P c="punct">&lt;/</P>
                <P c="name">footer</P>
                <P c="punct">&gt;</P>
              </CodeLine>
            </div>
          </div>

          <div className="mp-panel mp-panel--preview">
            <div className="mp-panel__head">Preview</div>
            <div className="mp-preview-body">
              <p className="mp-preview-kicker">Live output</p>
              <h3 className="mp-preview-h1">Hello World</h3>
              <p className="mp-preview-p">Built together, live.</p>
              <span className="mp-preview-btn">Run</span>
            </div>
          </div>
        </div>
      </div>
      </div>
    </figure>
  );
}

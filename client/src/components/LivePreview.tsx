import { useCallback, useEffect, useRef, useState } from 'react';
import PreviewThemeToggle, { type PreviewTheme } from './preview/PreviewThemeToggle';

const THEME_MESSAGE = 'PREVIEW_THEME_CHANGE';

/** Runs inside the preview iframe: paints the theme and listens for changes. */
function previewThemeBridge(theme: PreviewTheme, nonce: string) {
  const dark = theme === 'dark';
  return `<script nonce="${nonce}">(function(){var r=document.documentElement;var C={dark:{bg:'#0A0A0D',fg:'#E8E5ED'},light:{bg:'#FFFFFF',fg:'#16131D'}};function a(t){var c=C[t];if(!c)return;r.style.colorScheme=t;r.style.backgroundColor=c.bg;r.style.color=c.fg}function t(){var m=null;try{m=window.matchMedia('(prefers-reduced-motion: reduce)')}catch(e){}r.style.transition=m&&m.matches?'none':'background-color 200ms ease, color 200ms ease'}window.addEventListener('message',function(e){if(e.source!==window.parent)return;var d=e&&e.data;if(!d||d.type!=='PREVIEW_THEME_CHANGE')return;if(d.theme!=='dark'&&d.theme!=='light')return;a(d.theme)});t();a(${dark ? "'dark'" : "'light'"})})()<\/script>`;
}

function buildSrcDoc(html: string, css: string, js: string, theme: PreviewTheme) {
  // Generate a random nonce for the inline script to avoid using 'unsafe-inline' in CSP
  const nonce = btoa(String(Math.random())).substring(0, 16);
  const csp = `default-src 'none'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; img-src data: blob: http: https:; font-src data:; connect-src 'none'; frame-src 'none'`;
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="${csp}"><style>${css}</style>${previewThemeBridge(theme, nonce)}</head><body>${html}<script nonce="${nonce}">(function(){try{${js}\n}catch(e){console.error(e)}})()<\/script></body></html>`;
}

export default function LivePreview({ html, css, js }: { html: string; css: string; js: string }) {
  // Local-only preference: independent from the app theme, editor theme and the
  // collaborative document, and never persisted to the server.
  const [previewTheme, setPreviewTheme] = useState<PreviewTheme>('dark');
  const [srcDoc, setSrcDoc] = useState('');
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const themeRef = useRef<PreviewTheme>('dark');

  const postTheme = useCallback((theme: PreviewTheme) => {
    iframeRef.current?.contentWindow?.postMessage({ type: THEME_MESSAGE, theme }, '*');
  }, []);

  const handleToggleTheme = useCallback(() => {
    setPreviewTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  }, []);

  useEffect(() => {
    themeRef.current = previewTheme;
    postTheme(previewTheme);
  }, [previewTheme, postTheme]);

  // The iframe reloads on every compiled output change; re-apply the current
  // theme afterwards. Toggling the theme never touches srcDoc, so the frame is
  // never re-created by the toggle itself.
  const handleFrameLoad = useCallback(() => {
    postTheme(themeRef.current);
  }, [postTheme]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSrcDoc(buildSrcDoc(html, css, js, themeRef.current));
    }, 500);

    return () => clearTimeout(timer);
  }, [html, css, js]);

  return (
    <>
      <div className="ide-preview-header">
        <span className="ide-preview-header__label">Live Preview</span>
        <PreviewThemeToggle theme={previewTheme} onToggle={handleToggleTheme} />
      </div>
      <div className="ide-preview-content">
        <iframe
          ref={iframeRef}
          className="preview"
          sandbox="allow-scripts"
          srcDoc={srcDoc}
          onLoad={handleFrameLoad}
        />
      </div>
    </>
  );
}

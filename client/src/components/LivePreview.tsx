import { useEffect, useState } from 'react';

function buildSrcDoc(html: string, css: string, js: string) {
  // Relaxing CSP slightly to allow the preview to run its own scripts and styles inline
  const csp = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob: http: https:; font-src data:; connect-src 'none'; frame-src 'none'";
  return `<!doctype html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" content=\"${csp}\"><style>${css}</style></head><body>${html}<script>(function(){try{${js}\n}catch(e){console.error(e)}})()<\/script></body></html>`;
}

export default function LivePreview({ html, css, js }: { html: string; css: string; js: string }) {
  const [srcDoc, setSrcDoc] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => {
      setSrcDoc(buildSrcDoc(html, css, js));
    }, 500);

    return () => clearTimeout(timer);
  }, [html, css, js]);

  return (
    <iframe className="preview" sandbox="allow-scripts" srcDoc={srcDoc} />
  );
}

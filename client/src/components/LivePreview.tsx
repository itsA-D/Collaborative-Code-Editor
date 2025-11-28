import { useEffect, useRef } from 'react';

function buildSrcDoc(html: string, css: string, js: string) {
  const csp = "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: blob:; font-src data:; connect-src 'none'; frame-src 'none'";
  return `<!doctype html><html><head><meta charset=\"utf-8\"><meta http-equiv=\"Content-Security-Policy\" content=\"${csp}\"><style>${css}</style></head><body>${html}<script>(function(){try{${js}\n}catch(e){console.error(e)}})()<\/script></body></html>`;
}

export default function LivePreview({ html, css, js }: { html: string; css: string; js: string }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timerRef = useRef<number | null>(null);
  const urlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!iframeRef.current) return;
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      const doc = buildSrcDoc(html, css, js);
      const blob = new Blob([doc], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
      urlRef.current = url;
      iframeRef.current!.src = url;
    }, 500);

    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [html, css, js]);

  useEffect(() => {
    return () => { if (urlRef.current) URL.revokeObjectURL(urlRef.current); };
  }, []);

  return (
    <iframe ref={iframeRef} className="preview" sandbox="allow-scripts" />
  );
}

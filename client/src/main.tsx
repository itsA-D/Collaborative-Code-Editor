import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import { AuthProvider } from './state/AuthContext';

// global cursor glow driver (keeps UI logic intact)
let __raf = 0;
window.addEventListener('pointermove', (e) => {
  const x = e.clientX;
  const y = e.clientY;
  if (__raf) cancelAnimationFrame(__raf);
  __raf = requestAnimationFrame(() => {
    document.body.style.setProperty('--mx', x + 'px');
    document.body.style.setProperty('--my', y + 'px');
  });
}, { passive: true });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);

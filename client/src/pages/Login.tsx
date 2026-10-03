import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import AuthBrandPanel from '../components/AuthBrandPanel';
import { useAuth } from '../state/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || password.length < 8) {
      setError('Enter a valid email and a password with at least 8 characters.');
      return;
    }
    try {
      await login(email, password, rememberMe);
      nav('/explore');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          setError('Cannot reach the server. Start the backend on http://localhost:4000 and try again.');
        } else {
          setError(error.response.data?.message || `Login failed (${error.response.status}).`);
        }
      } else {
        setError('Login failed. Please try again.');
      }
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-frame">
        <AuthBrandPanel footerText="Your secure platform to code together, I guess..." />

        <section className="auth-panel auth-panel-form auth-panel-form-no-top">
          <div className="auth-form-wrap">
            <Link className="auth-back-link" to="/">
              <span className="auth-back-link__icon" aria-hidden="true">←</span>
              <span>Back to home</span>
            </Link>
            <h1 className="auth-title">Login</h1>
            {error && <div className="banner auth-banner-error">{error}</div>}
            <form className="auth-form-grid" onSubmit={submit}>
              <div className="auth-field">
                <label>Email</label>
                <input
                  type="email"
                  className="auth-line-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="auth-field">
                <label>Password</label>
                <input
                  type="password"
                  className="auth-line-input"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="auth-meta-row">
                <label className="auth-checkline">
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
                  <span>Remember me</span>
                </label>
                <span className="auth-muted-link">Forgot password?</span>
              </div>
              <div className="auth-actions">
                <button className="auth-submit" type="submit">Sign in</button>
              </div>
              <div className="auth-switch">
                <span>Need an account?</span> <Link to="/register">Sign up</Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

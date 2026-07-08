import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthBrandPanel from '../components/AuthBrandPanel';
import { useAuth } from '../state/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
      nav('/explore');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-frame">
        <AuthBrandPanel footerText="Collaborative editing for HTML, CSS, and JavaScript." />

        <section className="auth-panel auth-panel-form auth-panel-form-no-top">
          <div className="auth-form-wrap">
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
                  <input type="checkbox" />
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

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthBrandPanel from '../components/AuthBrandPanel';
import { useAuth } from '../state/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await register(name, email, password);
      nav('/explore');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Register failed');
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-frame">
        <AuthBrandPanel footerText="Secure digital asset management platform." />

        <section className="auth-panel auth-panel-form auth-panel-form-no-top">
          <div className="auth-form-wrap">
            <h1 className="auth-title">Create Account</h1>
            {error && <div className="banner auth-banner-error">{error}</div>}
            <form className="auth-form-grid auth-form-grid-stack" onSubmit={submit}>
              <div className="auth-field auth-field-full">
                <label>Name</label>
                <input
                  className="auth-line-input"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="auth-field auth-field-full">
                <label>Email</label>
                <input
                  type="email"
                  className="auth-line-input"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="auth-field auth-field-full">
                <label>Password</label>
                <input
                  type="password"
                  className="auth-line-input"
                  placeholder="Choose a password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="auth-actions">
                <button className="auth-submit" type="submit">Sign up</button>
              </div>
              <div className="auth-switch">
                <span>Already registered?</span> <Link to="/login">Sign in</Link>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  );
}

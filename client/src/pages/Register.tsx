import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
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
    if (!name.trim() || !email.trim() || password.length < 8) {
      setError('Enter your name, a valid email, and a password with at least 8 characters.');
      return;
    }
    try {
      await register(name, email, password);
      nav('/explore');
    } catch (error: unknown) {
      if (axios.isAxiosError(error)) {
        if (!error.response) {
          setError('Cannot reach the server. Start the backend on http://localhost:4000 and try again.');
        } else {
          setError(error.response.data?.message || `Registration failed (${error.response.status}).`);
        }
      } else {
        setError('Registration failed. Please try again.');
      }
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-frame">
        <AuthBrandPanel footerText="Hop in, besties....let’s go nuts with coding!" />

        <section className="auth-panel auth-panel-form auth-panel-form-no-top">
          <div className="auth-form-wrap">
            <Link className="auth-back-link" to="/">
              <span className="auth-back-link__icon" aria-hidden="true">←</span>
              <span>Back to home</span>
            </Link>
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

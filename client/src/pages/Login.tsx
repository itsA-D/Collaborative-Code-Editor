import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try { await login(email, password); nav('/explore'); } catch (e: any) { setError(e?.response?.data?.message || 'Login failed'); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-subtitle">Sign in to your account</p>
        {error && <div className="banner" style={{ borderColor: 'var(--danger)' }}>{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Email</label>
            <input type="email" className="input input-lg" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" className="input input-lg" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} />
            <div className="auth-footer" style={{ marginTop: 6 }}>
              <span />
              <a href="#">Forgot Password?</a>
            </div>
          </div>
          <div className="form-row">
            <button className="btn primary btn-lg btn-full btn-glow" type="submit">Sign in</button>
          </div>
          <div className="auth-footer">
            <span />
            <span>Don't have an account? <Link to="/register">Sign up</Link></span>
          </div>
        </form>
      </div>
    </div>
  );
}

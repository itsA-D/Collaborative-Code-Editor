import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../state/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setError('');
    try { await register(name, email, password); nav('/explore'); } catch (e: any) { setError(e?.response?.data?.message || 'Register failed'); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Join the collaborative editor</p>
        {error && <div className="banner" style={{ borderColor: 'var(--danger)' }}>{error}</div>}
        <form onSubmit={submit}>
          <div className="form-row">
            <label>Name</label>
            <input className="input input-lg" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Email</label>
            <input type="email" className="input input-lg" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} />
          </div>
          <div className="form-row">
            <label>Password</label>
            <input type="password" className="input input-lg" placeholder="••••••••" value={password} onChange={e=>setPassword(e.target.value)} />
          </div>
          <div className="form-row">
            <button className="btn primary btn-lg btn-full btn-glow" type="submit">Sign up</button>
          </div>
          <div className="auth-footer">
            <span>Already have an account?</span>
            <Link to="/login">Sign in</Link>
          </div>
        </form>
      </div>
    </div>
  );
}

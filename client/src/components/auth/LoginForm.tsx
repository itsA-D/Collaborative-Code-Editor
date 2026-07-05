import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

interface LoginFormProps {
  onSubmit?: (data: { email: string; password: string }) => void;
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onSwitchToRegister,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const validateForm = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Invalid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    
    try {
      await onSubmit?.({ email, password });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="w-full"
    >
      {/* Create account link at top right */}
      <div className="flex justify-end mb-12">
        <button
          onClick={onSwitchToRegister}
          className="text-sm text-white/60 hover:text-white transition-colors"
        >
          Create an account
        </button>
      </div>

      {/* Login heading */}
      <div className="mb-12">
        <h1 className="text-5xl font-light text-white tracking-tight">Login</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm text-white/60">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-transparent border-b border-white/20 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60 transition-colors"
              autoComplete="email"
              required
            />
            {errors.email && <p className="text-sm text-red-400">{errors.email}</p>}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-white/60">Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-transparent border-b border-white/20 py-3 text-white placeholder-white/30 focus:outline-none focus:border-white/60 transition-colors"
              autoComplete="current-password"
              required
            />
            {errors.password && <p className="text-sm text-red-400">{errors.password}</p>}
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-white/20 bg-transparent text-white focus:ring-white/20 focus:ring-offset-0"
              />
              <span className="text-sm text-white/60">Remember me</span>
            </label>

            <button
              type="button"
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Forgot?
            </button>
          </div>
        </div>

        {/* Circular sign-in button at bottom right */}
        <div className="flex justify-end pt-8">
          <button
            type="submit"
            disabled={loading}
            className="w-24 h-24 rounded-full bg-white text-black font-medium text-sm flex items-center justify-center hover:bg-white/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <span className="text-xs font-semibold">SIGN IN</span>
            )}
          </button>
        </div>
      </form>
    </motion.div>
  );
};

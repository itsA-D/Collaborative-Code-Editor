import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock } from 'lucide-react';
import { InputField } from './InputField';
import { PasswordField } from './PasswordField';
import { Button } from './Button';
import { SessionDurationSelector } from './SessionDurationSelector';
import { SocialLoginButtons } from './SocialLoginButtons';

interface LoginFormProps {
  onSubmit?: (data: { email: string; password: string; sessionDuration: string }) => void;
  onSwitchToRegister?: () => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onSubmit,
  onSwitchToRegister,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [sessionDuration, setSessionDuration] = useState('2hours');
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
      await onSubmit?.({ email, password, sessionDuration });
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
      className="space-y-6"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white tracking-tight">Welcome Back</h1>
        <p className="text-white/50 text-sm">Continue building together.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <InputField
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          icon={<Mail size={18} />}
          autoComplete="email"
          required
        />

        <PasswordField
          label="Password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
          autoComplete="current-password"
          required
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-white/20 bg-white/5 text-white focus:ring-white/20 focus:ring-offset-0"
            />
            <span className="text-sm text-white/60">Remember me</span>
          </label>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="button"
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Forgot password?
          </motion.button>
        </div>

        <SessionDurationSelector
          value={sessionDuration}
          onChange={setSessionDuration}
        />

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full"
        >
          Sign In
        </Button>
      </form>

      <SocialLoginButtons />

      <div className="text-center pt-4">
        <p className="text-white/50 text-sm">
          Don't have an account?{' '}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSwitchToRegister}
            className="text-white font-medium hover:underline relative inline-block"
          >
            Create Account
            <motion.div
              className="absolute bottom-0 left-0 h-px bg-white"
              initial={{ width: 0 }}
              whileHover={{ width: '100%' }}
              transition={{ duration: 0.2 }}
            />
          </motion.button>
        </p>
      </div>
    </motion.div>
  );
};

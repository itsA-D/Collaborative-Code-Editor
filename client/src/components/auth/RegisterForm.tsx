import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, User, Code, Building, Clock } from 'lucide-react';
import { InputField } from './InputField';
import { PasswordField } from './PasswordField';
import { Button } from './Button';
import { SessionDurationSelector } from './SessionDurationSelector';
import { SocialLoginButtons } from './SocialLoginButtons';

interface RegisterFormProps {
  onSubmit?: (data: {
    name: string;
    username: string;
    email: string;
    password: string;
    confirmPassword: string;
    preferredLanguage: string;
    experienceLevel: string;
    teamName?: string;
    timezone: string;
    sessionDuration: string;
    acceptTerms: boolean;
  }) => void;
  onSwitchToLogin?: () => void;
}

const LANGUAGES = [
  'JavaScript',
  'TypeScript',
  'Python',
  'Java',
  'C++',
  'Go',
  'Rust',
  'PHP',
  'Ruby',
  'Swift',
  'Kotlin',
  'Other',
];

const EXPERIENCE_LEVELS = [
  'Student',
  'Beginner',
  'Intermediate',
  'Professional',
];

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Asia/Singapore',
  'Australia/Sydney',
];

export const RegisterForm: React.FC<RegisterFormProps> = ({
  onSubmit,
  onSwitchToLogin,
}) => {
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    password: '',
    confirmPassword: '',
    preferredLanguage: 'JavaScript',
    experienceLevel: 'Beginner',
    teamName: '',
    timezone: 'UTC',
    sessionDuration: '2hours',
    acceptTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name) newErrors.name = 'Name is required';
    if (!formData.username) newErrors.username = 'Username is required';
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }
    if (!formData.acceptTerms) {
      newErrors.acceptTerms = 'You must accept the terms';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    
    try {
      await onSubmit?.(formData);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.3 }}
      className="space-y-5 max-h-[calc(100vh-4rem)] overflow-y-auto pr-2"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold text-white tracking-tight">Create Account</h1>
        <p className="text-white/50 text-sm">Start collaborating with developers worldwide.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <InputField
            label="Full Name"
            placeholder="John Doe"
            value={formData.name}
            onChange={(e) => handleChange('name', e.target.value)}
            error={errors.name}
            icon={<User size={18} />}
            required
          />
          <InputField
            label="Username"
            placeholder="johndoe"
            value={formData.username}
            onChange={(e) => handleChange('username', e.target.value)}
            error={errors.username}
            icon={<User size={18} />}
            required
          />
        </div>

        <InputField
          label="Email"
          type="email"
          placeholder="you@example.com"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          icon={<Mail size={18} />}
          autoComplete="email"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <PasswordField
            label="Password"
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => handleChange('password', e.target.value)}
            error={errors.password}
            autoComplete="new-password"
            required
          />
          <PasswordField
            label="Confirm Password"
            placeholder="••••••••"
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
            autoComplete="new-password"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/60">
              Preferred Language
            </label>
            <select
              value={formData.preferredLanguage}
              onChange={(e) => handleChange('preferredLanguage', e.target.value)}
              className="w-full bg-[#171717] border border-white/8 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-white/5 transition-all duration-200"
            >
              {LANGUAGES.map((lang) => (
                <option key={lang} value={lang} className="bg-[#171717]">
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium text-white/60">
              Experience Level
            </label>
            <select
              value={formData.experienceLevel}
              onChange={(e) => handleChange('experienceLevel', e.target.value)}
              className="w-full bg-[#171717] border border-white/8 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-white/5 transition-all duration-200"
            >
              {EXPERIENCE_LEVELS.map((level) => (
                <option key={level} value={level} className="bg-[#171717]">
                  {level}
                </option>
              ))}
            </select>
          </div>
        </div>

        <InputField
          label="Team Name (optional)"
          placeholder="Acme Corp"
          value={formData.teamName}
          onChange={(e) => handleChange('teamName', e.target.value)}
          icon={<Building size={18} />}
        />

        <div className="space-y-2">
          <label className="block text-sm font-medium text-white/60">
            Timezone
          </label>
          <select
            value={formData.timezone}
            onChange={(e) => handleChange('timezone', e.target.value)}
            className="w-full bg-[#171717] border border-white/8 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-white/5 transition-all duration-200"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz} className="bg-[#171717]">
                {tz}
              </option>
            ))}
          </select>
        </div>

        <SessionDurationSelector
          value={formData.sessionDuration}
          onChange={(value) => handleChange('sessionDuration', value)}
        />

        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.acceptTerms}
            onChange={(e) => handleChange('acceptTerms', e.target.checked)}
            className="w-4 h-4 mt-1 rounded border-white/20 bg-white/5 text-white focus:ring-white/20 focus:ring-offset-0"
          />
          <span className="text-sm text-white/60">
            I accept the{' '}
            <button type="button" className="text-white hover:underline">
              Terms of Service
            </button>{' '}
            and{' '}
            <button type="button" className="text-white hover:underline">
              Privacy Policy
            </button>
          </span>
        </label>
        {errors.acceptTerms && (
          <p className="text-sm text-red-400">{errors.acceptTerms}</p>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          loading={loading}
          className="w-full"
        >
          Create Account
        </Button>
      </form>

      <SocialLoginButtons />

      <div className="text-center pt-4">
        <p className="text-white/50 text-sm">
          Already have an account?{' '}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onSwitchToLogin}
            className="text-white font-medium hover:underline relative inline-block"
          >
            Login
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

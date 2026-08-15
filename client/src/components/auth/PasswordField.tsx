import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff } from 'lucide-react';
import { InputField } from './InputField';

interface PasswordFieldProps {
  label?: string;
  error?: string;
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  name?: string;
  autoComplete?: string;
  required?: boolean;
}

export const PasswordField: React.FC<PasswordFieldProps> = ({
  label,
  error,
  placeholder = '••••••••',
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <InputField
      label={label}
      error={error}
      type={showPassword ? 'text' : 'password'}
      placeholder={placeholder}
      icon={
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="hover:text-white/60 transition-colors"
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      }
      {...props}
    />
  );
};

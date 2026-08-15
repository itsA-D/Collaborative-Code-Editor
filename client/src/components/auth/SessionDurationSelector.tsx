import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

interface SessionDurationSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const DURATION_OPTIONS = [
  { value: '30min', label: '30 min', minutes: 30 },
  { value: '2hours', label: '2 hours', minutes: 120 },
  { value: '6hours', label: '6 hours', minutes: 360 },
  { value: '12hours', label: '12 hours', minutes: 720 },
  { value: '24hours', label: '24 hours', minutes: 1440 },
  { value: 'always', label: 'Always', minutes: null },
];

export const SessionDurationSelector: React.FC<SessionDurationSelectorProps> = ({
  value,
  onChange,
}) => {
  const [expiryTime, setExpiryTime] = useState<string>('');

  const selectedOption = DURATION_OPTIONS.find(opt => opt.value === value);

  useMemo(() => {
    if (selectedOption?.minutes) {
      const expiry = new Date(Date.now() + selectedOption.minutes * 60 * 1000);
      setExpiryTime(
        expiry.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        }) +
          ' ' +
          expiry.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          })
      );
    } else if (value === 'always') {
      setExpiryTime('until you sign out');
    } else {
      setExpiryTime('');
    }
  }, [value, selectedOption]);

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium text-white mb-1">Coding Session</p>
        <p className="text-xs text-white/50">Keep me signed in for</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {DURATION_OPTIONS.map((option) => (
          <motion.button
            key={option.value}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onChange(option.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              value === option.value
                ? 'bg-white text-black'
                : 'bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-white/10'
            }`}
          >
            {option.label}
          </motion.button>
        ))}
      </div>

      {expiryTime && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-white/40"
        >
          You'll remain signed in {expiryTime}
        </motion.p>
      )}
    </div>
  );
};

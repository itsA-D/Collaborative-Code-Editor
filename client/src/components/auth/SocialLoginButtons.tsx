import React from 'react';
import { motion } from 'framer-motion';
import { Search, Monitor, Apple } from 'lucide-react';

interface SocialLoginButtonsProps {
  onGithubClick?: () => void;
  onGoogleClick?: () => void;
  onMicrosoftClick?: () => void;
  onAppleClick?: () => void;
}

const GithubIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

export const SocialLoginButtons: React.FC<SocialLoginButtonsProps> = ({
  onGithubClick,
  onGoogleClick,
  onMicrosoftClick,
  onAppleClick,
}) => {
  const providers = [
    { name: 'GitHub', icon: GithubIcon, onClick: onGithubClick },
    { name: 'Google', icon: Search, onClick: onGoogleClick },
    { name: 'Microsoft', icon: Monitor, onClick: onMicrosoftClick },
    { name: 'Apple', icon: Apple, onClick: onAppleClick },
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-[#111111] text-white/40">or continue with</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {providers.map((provider) => (
          <motion.button
            key={provider.name}
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={provider.onClick}
            className="flex items-center justify-center p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200"
            aria-label={`Continue with ${provider.name}`}
          >
            <provider.icon size={20} className="text-white/80" />
          </motion.button>
        ))}
      </div>
    </div>
  );
};

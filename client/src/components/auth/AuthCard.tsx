import React from 'react';
import { motion } from 'framer-motion';

interface AuthCardProps {
  children: React.ReactNode;
}

export const AuthCard: React.FC<AuthCardProps> = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="relative bg-[#111111]/80 backdrop-blur-xl border border-white/10 rounded-[32px] p-8 md:p-12 shadow-2xl"
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05)',
      }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent rounded-[32px] pointer-events-none" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { BrandPanel } from './BrandPanel';
import { AuthCard } from './AuthCard';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export const AuthPage: React.FC = () => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);

  const handleLoginSubmit = (data: { email: string; password: string; sessionDuration: string }) => {
    console.log('Login submitted:', data);
  };

  const handleRegisterSubmit = (data: any) => {
    console.log('Register submitted:', data);
  };

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center p-4 md:p-8 lg:p-12">
      <div className="w-full max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* Left Panel - Brand */}
        <div className="lg:col-span-5 h-[400px] lg:h-[600px] rounded-[32px] overflow-hidden relative">
          <BrandPanel />
        </div>

        {/* Right Panel - Auth Form */}
        <div className="lg:col-span-7 flex items-center justify-center">
          <AuthCard>
            <AnimatePresence mode="wait">
              {isLogin ? (
                <LoginForm
                  key="login"
                  onSubmit={handleLoginSubmit}
                  onSwitchToRegister={() => setIsLogin(false)}
                />
              ) : (
                <RegisterForm
                  key="register"
                  onSubmit={handleRegisterSubmit}
                  onSwitchToLogin={() => setIsLogin(true)}
                />
              )}
            </AnimatePresence>
          </AuthCard>
        </div>
      </div>
    </div>
  );
};

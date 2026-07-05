import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { BrandPanel } from './BrandPanel';
import { LoginForm } from './LoginForm';
import { RegisterForm } from './RegisterForm';

export const AuthPage: React.FC = () => {
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    setIsLogin(location.pathname === '/login');
  }, [location.pathname]);

  const handleLoginSubmit = (data: { email: string; password: string }) => {
    console.log('Login submitted:', data);
  };

  const handleRegisterSubmit = (data: any) => {
    console.log('Register submitted:', data);
  };

  return (
    <div className="min-h-screen bg-black flex">
      <div className="w-full h-screen grid grid-cols-1 lg:grid-cols-2">
        {/* Left Panel - Brand */}
        <div className="hidden lg:block h-full relative bg-black">
          <BrandPanel />
        </div>

        {/* Right Panel - Auth Form */}
        <div className="h-full flex items-center justify-center bg-[#0A0A0A] p-16">
          <div className="w-full max-w-lg">
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
          </div>
        </div>
      </div>
    </div>
  );
};

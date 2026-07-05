import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export const BrandPanel: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    const particles: Array<{ x: number; y: number; vx: number; vy: number; size: number; opacity: number }> = [];

    const resizeCanvas = () => {
      canvas.width = canvas.parentElement?.clientWidth || 800;
      canvas.height = canvas.parentElement?.clientHeight || 600;
    };

    const createParticles = () => {
      particles.length = 0;
      const particleCount = 50;
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: Math.random() * canvas.width,
          y: Math.random() * canvas.height,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          size: Math.random() * 2 + 1,
          opacity: Math.random() * 0.3 + 0.1,
        });
      }
    };

    const drawGrid = () => {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
      ctx.lineWidth = 1;
      const gridSize = 40;

      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }

      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }
    };

    const drawParticles = () => {
      particles.forEach((particle) => {
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${particle.opacity})`;
        ctx.fill();

        particle.x += particle.vx;
        particle.y += particle.vy;

        if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
        if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawGrid();
      drawParticles();
      animationFrameId = requestAnimationFrame(animate);
    };

    resizeCanvas();
    createParticles();
    animate();

    const handleResize = () => {
      resizeCanvas();
      createParticles();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#080808]">
      <canvas ref={canvasRef} className="absolute inset-0" />
      
      <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-black/50" />
      
      <div className="absolute inset-0 flex flex-col justify-between p-8">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2"
          >
            <div className="relative">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 border-2 border-white/20 rounded-lg"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white font-bold text-lg">&lt;/&gt;</span>
              </div>
            </div>
            <span className="text-white font-semibold text-xl tracking-tight">CodeSync</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative"
        >
          <div className="w-32 h-32 mx-auto mb-6">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              <defs>
                <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                  <stop offset="100%" stopColor="rgba(255,255,255,0.1)" />
                </linearGradient>
              </defs>
              <motion.g
                animate={{ rotate: 360 }}
                transition={{ duration: 30, repeat: Infinity, ease: 'linear' }}
              >
                <polygon
                  points="50,10 90,30 90,70 50,90 10,70 10,30"
                  fill="none"
                  stroke="url(#gradient)"
                  strokeWidth="1"
                />
                <polygon
                  points="50,20 80,35 80,65 50,80 20,65 20,35"
                  fill="none"
                  stroke="rgba(255,255,255,0.2)"
                  strokeWidth="0.5"
                />
              </motion.g>
              <circle cx="50" cy="50" r="8" fill="rgba(255,255,255,0.3)" />
              <motion.circle
                cx="50"
                cy="50"
                r="15"
                fill="none"
                stroke="rgba(255,255,255,0.2)"
                strokeWidth="0.5"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 3, repeat: Infinity }}
              />
            </svg>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="space-y-2"
        >
          <p className="text-white/60 text-sm">Built for developers.</p>
          <p className="text-white/40 text-xs">Real-time collaborative coding.</p>
          <p className="text-white/30 text-xs">Powered by CRDT.</p>
          <p className="text-white/20 text-xs mt-4">v1.0.0</p>
        </motion.div>
      </div>
    </div>
  );
};

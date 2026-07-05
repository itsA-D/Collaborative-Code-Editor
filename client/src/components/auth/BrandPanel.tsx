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
      
      {/* Diagonal lines extending to corners */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <line x1="50%" y1="50%" x2="0%" y2="0%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1="50%" y1="50%" x2="100%" y2="0%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1="50%" y1="50%" x2="0%" y2="100%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
        <line x1="50%" y1="50%" x2="100%" y2="100%" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
      </svg>
      
      <div className="absolute inset-0 flex flex-col justify-between p-8">
        <div className="flex items-center gap-3">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="flex items-center gap-2"
          >
            <span className="text-white font-semibold text-xl tracking-tight">CodeSync</span>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="relative flex items-center justify-center"
        >
          <div className="w-48 h-48">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Star-like asterisk graphic */}
              <g stroke="white" strokeWidth="3" strokeLinecap="round">
                {/* Center point */}
                <circle cx="50" cy="50" r="4" fill="white" />
                {/* Radiating lines */}
                <line x1="50" y1="50" x2="50" y2="15" />
                <line x1="50" y1="50" x2="50" y2="85" />
                <line x1="50" y1="50" x2="15" y2="50" />
                <line x1="50" y1="50" x2="85" y2="50" />
                <line x1="50" y1="50" x2="25" y2="25" />
                <line x1="50" y1="50" x2="75" y2="75" />
                <line x1="50" y1="50" x2="75" y2="25" />
                <line x1="50" y1="50" x2="25" y2="75" />
                {/* Additional shorter lines for star effect */}
                <line x1="50" y1="50" x2="50" y2="25" strokeWidth="2" opacity="0.6" />
                <line x1="50" y1="50" x2="50" y2="75" strokeWidth="2" opacity="0.6" />
                <line x1="50" y1="50" x2="25" y2="50" strokeWidth="2" opacity="0.6" />
                <line x1="50" y1="50" x2="75" y2="50" strokeWidth="2" opacity="0.6" />
              </g>
            </svg>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="space-y-1"
        >
          <p className="text-white/40 text-xs">© CodeSync 2024. All rights reserved.</p>
        </motion.div>
      </div>
    </div>
  );
};

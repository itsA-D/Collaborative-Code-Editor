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
    <div className="relative h-full w-full bg-black">
      {/* Diagonal lines extending from center to corners */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <line x1="50%" y1="50%" x2="0%" y2="0%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1="50%" y1="50%" x2="100%" y2="0%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1="50%" y1="50%" x2="0%" y2="100%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
        <line x1="50%" y1="50%" x2="100%" y2="100%" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
      </svg>
      
      <div className="absolute inset-0 flex flex-col justify-between p-12">
        {/* Logo at top left */}
        <div className="flex items-center">
          <span className="text-white font-semibold text-xl tracking-tight">CodeSync</span>
        </div>

        {/* Star graphic in center */}
        <div className="flex items-center justify-center">
          <div className="w-40 h-40">
            <svg viewBox="0 0 100 100" className="w-full h-full">
              {/* Star-like asterisk graphic */}
              <g stroke="white" strokeWidth="4" strokeLinecap="round">
                {/* Center point */}
                <circle cx="50" cy="50" r="5" fill="white" />
                {/* Main radiating lines */}
                <line x1="50" y1="50" x2="50" y2="10" />
                <line x1="50" y1="50" x2="50" y2="90" />
                <line x1="50" y1="50" x2="10" y2="50" />
                <line x1="50" y1="50" x2="90" y2="50" />
                <line x1="50" y1="50" x2="22" y2="22" />
                <line x1="50" y1="50" x2="78" y2="78" />
                <line x1="50" y1="50" x2="78" y2="22" />
                <line x1="50" y1="50" x2="22" y2="78" />
                {/* Additional shorter lines */}
                <line x1="50" y1="50" x2="50" y2="20" strokeWidth="2.5" opacity="0.7" />
                <line x1="50" y1="50" x2="50" y2="80" strokeWidth="2.5" opacity="0.7" />
                <line x1="50" y1="50" x2="20" y2="50" strokeWidth="2.5" opacity="0.7" />
                <line x1="50" y1="50" x2="80" y2="50" strokeWidth="2.5" opacity="0.7" />
              </g>
            </svg>
          </div>
        </div>

        {/* Copyright at bottom left */}
        <div className="flex items-start">
          <p className="text-white/40 text-xs">© CodeSync 2024. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};

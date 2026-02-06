import { useEffect, useRef, useMemo } from "react";

// Generate random stars once on mount
const generateStars = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 2 + 0.5,
    delay: Math.random() * 5,
    duration: Math.random() * 3 + 2,
  }));
};

export const AnimatedBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stars = useMemo(() => generateStars(60), []);

  // Particle canvas animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let particles: Array<{
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      opacity: number;
      opacityDir: number;
    }> = [];

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const initParticles = () => {
      particles = Array.from({ length: 40 }, () => ({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.4 + 0.1,
        opacityDir: Math.random() > 0.5 ? 0.002 : -0.002,
      }));
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      particles.forEach((p) => {
        // Update position
        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        // Twinkle effect
        p.opacity += p.opacityDir;
        if (p.opacity <= 0.05 || p.opacity >= 0.5) {
          p.opacityDir *= -1;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(147, 155, 255, ${p.opacity})`;
        ctx.fill();
      });

      animationId = requestAnimationFrame(animate);
    };

    resize();
    initParticles();
    animate();

    window.addEventListener("resize", resize);

    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animationId);
    };
  }, []);

  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[2] min-h-full min-w-full bg-cover">
      {/* Сетка нейронных нитей — чуть заметнее */}
      <div 
        className="absolute inset-0 opacity-[0.045]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(99, 102, 241, 0.5) 1px, transparent 1px),
            linear-gradient(90deg, rgba(99, 102, 241, 0.5) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Точечный паттерн */}
      <div 
        className="absolute inset-0 opacity-[0.055]"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(147, 155, 255, 0.8) 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Градиентные блики */}
      <div className="absolute inset-0">
        <div 
          className="absolute w-[600px] h-[600px] rounded-full animate-blob-1"
          style={{
            top: '-10%',
            left: '-5%',
            background: 'radial-gradient(circle, rgba(99, 102, 241, 0.18) 0%, rgba(99, 102, 241, 0.06) 40%, transparent 70%)',
            filter: 'blur(60px)',
          }}
        />

        <div 
          className="absolute w-[500px] h-[500px] rounded-full animate-blob-2"
          style={{
            bottom: '-15%',
            right: '-5%',
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.14) 0%, rgba(59, 130, 246, 0.05) 40%, transparent 70%)',
            filter: 'blur(50px)',
          }}
        />

        <div 
          className="absolute w-[400px] h-[400px] rounded-full animate-blob-3"
          style={{
            top: '30%',
            right: '20%',
            background: 'radial-gradient(circle, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.04) 40%, transparent 70%)',
            filter: 'blur(40px)',
          }}
        />
      </div>

      {/* CSS Twinkling Stars */}
      <div className="absolute inset-0">
        {stars.map((star) => (
          <div
            key={star.id}
            className="absolute rounded-full animate-twinkle"
            style={{
              left: `${star.x}%`,
              top: `${star.y}%`,
              width: `${star.size}px`,
              height: `${star.size}px`,
              backgroundColor: 'rgba(167, 175, 255, 0.6)',
              animationDelay: `${star.delay}s`,
              animationDuration: `${star.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Canvas Particles - floating dust */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />

      {/* Центральное свечение */}
      <div 
        className="absolute inset-0 animate-glow-breathe"
        style={{
          background: 'radial-gradient(ellipse 50% 50% at 50% 50%, rgba(99, 102, 241, 0.10) 0%, transparent 60%)',
        }}
      />

      {/* Угловые блики */}
      <div 
        className="absolute top-0 left-0 w-[40%] h-[40%] animate-corner-glow-1"
        style={{
          background: 'radial-gradient(ellipse at top left, rgba(99, 102, 241, 0.08) 0%, transparent 50%)',
        }}
      />
      <div 
        className="absolute bottom-0 right-0 w-[40%] h-[40%] animate-corner-glow-2"
        style={{
          background: 'radial-gradient(ellipse at bottom right, rgba(59, 130, 246, 0.07) 0%, transparent 50%)',
        }}
      />

      {/* Subtle vignette */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 80% 80% at 50% 50%, transparent 40%, rgba(0, 0, 0, 0.4) 100%)',
        }}
      />
    </div>
  );
};

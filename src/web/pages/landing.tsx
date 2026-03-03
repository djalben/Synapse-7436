import { useRef, useEffect, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

// Subtle Neural Network Background Pattern
const NeuralBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      <svg className="absolute inset-0 w-full h-full">
        {Array.from({ length: 8 }, (_, i) => (
          <motion.line
            key={i}
            x1={`${Math.random() * 100}%`}
            y1={`${Math.random() * 100}%`}
            x2={`${Math.random() * 100}%`}
            y2={`${Math.random() * 100}%`}
            stroke={i % 2 === 0 ? "#00d4ff" : "#a855f7"}
            strokeWidth="0.3"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ 
              pathLength: [0, 1, 0],
              opacity: [0, 0.4, 0],
            }}
            transition={{
              duration: 8 + Math.random() * 6,
              repeat: Infinity,
              delay: i * 0.6,
              ease: "easeInOut",
            }}
          />
        ))}
      </svg>
      {Array.from({ length: 30 }, (_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            width: Math.random() * 2 + 1,
            height: Math.random() * 2 + 1,
            background: i % 2 === 0 ? "#00d4ff" : "#a855f7",
          }}
          animate={{
            y: [0, -30, 0],
            opacity: [0.1, 0.5, 0.1],
          }}
          transition={{
            duration: 10 + Math.random() * 10,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Background Music Controller - Deep House Music
const BackgroundMusic = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = 0.15;
    }
  }, []);

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.play().catch(() => {});
      }
      audioRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <>
      <audio ref={audioRef} loop autoPlay muted>
        <source src="/deep-house-music.mp3" type="audio/mpeg" />
      </audio>
      <motion.button
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 1.5, duration: 0.5 }}
        onClick={toggleMute}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-white/5 backdrop-blur-xl border border-white/10 flex items-center justify-center text-white/50 hover:text-cyan-400 hover:border-cyan-400/30 transition-all duration-300"
        aria-label={isMuted ? "Включить музыку" : "Выключить музыку"}
      >
        <AnimatePresence mode="wait">
          {isMuted ? (
            <motion.svg
              key="muted"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
            </motion.svg>
          ) : (
            <motion.svg
              key="unmuted"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0, rotate: 180 }}
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
            </motion.svg>
          )}
        </AnimatePresence>
      </motion.button>
    </>
  );
};

// Hero Section
const HeroSection = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoError, setVideoError] = useState(false);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => setVideoError(true));
    }
  }, []);

  return (
    <section className="relative h-screen flex items-center overflow-hidden">
      {!videoError ? (
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/synapse-hero-front-view-UnrcvKNXrST4se0sLsebg.webp"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ willChange: 'transform', transform: 'translateZ(0)' }}
          onError={() => setVideoError(true)}
        >
          <source src="/synapse-hero-alive-b0mtzojm0s.mp4" type="video/mp4" />
        </video>
      ) : (
        <img
          src="/synapse-hero-front-view-UnrcvKNXrST4se0sLsebg.webp"
          alt="Synapse AI - Neural Light DJ"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

      <div className="relative z-10 px-6 md:px-12 lg:px-20 w-full pt-24 md:pt-32">
        <div className="max-w-2xl" style={{ textShadow: '0 2px 30px rgba(0,0,0,0.9), 0 0 60px rgba(0,0,0,0.7)' }}>
          <motion.h1
            className="landing-font-display text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-light mb-5 leading-snug tracking-tight"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <span className="block landing-text-gradient-cosmic" style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.6))' }}>
              Твоя нейронная студия будущего
            </span>
          </motion.h1>

          <motion.p
            className="text-xs sm:text-sm md:text-base landing-text-cosmic-silver mb-8 leading-relaxed max-w-lg font-light"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
          >
            Больше не нужно 10 подписок. Все топовые ИИ — ChatGPT-5, Suno v5, Sora, Midjourney — в одном интерфейсе. Без ограничений. Без VPN.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
          >
            <Link href="/studio">
              <motion.button
                className="px-8 py-4 rounded-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/30 text-white font-medium tracking-wide hover:border-cyan-400/60 transition-all duration-500 backdrop-blur-sm"
                whileHover={{ scale: 1.02, boxShadow: "0 0 40px rgba(0, 212, 255, 0.3)" }}
                whileTap={{ scale: 0.98 }}
              >
                <span className="landing-text-gradient-cosmic">Начать создание бесплатно</span>
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </div>

      <motion.div
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      >
        <div className="w-6 h-10 border border-white/20 rounded-full flex justify-center pt-2">
          <motion.div 
            className="w-1 h-2 bg-gradient-to-b from-cyan-400/60 to-purple-500/60 rounded-full"
            animate={{ y: [0, 6, 0], opacity: [0.6, 0.2, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity }}
          />
        </div>
      </motion.div>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#050508] to-transparent pointer-events-none" />
    </section>
  );
};

// Cosmic Section Header Component
const SectionHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <motion.div
      ref={ref}
      className="text-center mb-16"
      initial={{ opacity: 0, y: 40 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.8 }}
    >
      <h2 className="text-3xl sm:text-4xl md:text-5xl font-light tracking-tight mb-4">
        <span className="landing-text-gradient-cosmic">{title}</span>
      </h2>
      {subtitle && (
        <p className="landing-text-cosmic-silver text-base md:text-lg max-w-2xl mx-auto font-light">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
};

// Unified Card Component
const UnifiedCard = ({ 
  children, 
  delay = 0,
  className = ""
}: { 
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
      transition={{ duration: 0.6, delay }}
      className={`landing-cosmic-card group ${className}`}
    >
      {children}
    </motion.div>
  );
};

// Image Gallery Section
const ImageGallerySection = () => {
  const [selectedImage, setSelectedImage] = useState<{ image: string; model: string } | null>(null);

  const galleryImages = [
    { image: "/gallery-midjourney-portrait-jEO3BpR6DvGsKctPPIKQ9.webp", model: "Midjourney" },
    { image: "/gallery-dalle-surreal-PtmmEZGYYZGyiWlkuGXZR.webp", model: "DALL-E 3" },
    { image: "/gallery-flux-anime-BCMlc9xCa0TLIhMjO6NLO.webp", model: "Flux Pro" },
    { image: "/gallery-midjourney-cyberpunk-MtSvoq4LsMu9JroD00hUt.webp", model: "Midjourney" },
    { image: "/gallery-midjourney-fantasy-Sc6NabZtsvEDEIxCFFFE1.webp", model: "Midjourney" },
    { image: "/gallery-dalle-product-8Vgj0BARscICQqdW1WFdz.webp", model: "DALL-E 3" },
    { image: "/gallery-flux-architecture-gznTgilmyBhS5L3G84Br0.webp", model: "Flux Pro" },
    { image: "/gallery-sd-landscape-XLB5PvxnCXPNHKeHmvWB5.webp", model: "Stable Diffusion" },
    { image: "/gallery-dalle-abstract-Zeb1MlIBAJ9qtqQ-U1XHr.webp", model: "DALL-E 3" },
    { image: "/gallery-midjourney-nature-8TwNeH8q22C0gAASQvQzu.webp", model: "Midjourney" },
    { image: "/gallery-flux-portrait-74LBIomz1_cSN3hDRg3kq.webp", model: "Flux Pro" },
    { image: "/gallery-imagen-interior-hlJthoXDAHUTX0FLzrDik.webp", model: "Imagen 3" },
    { image: "/gallery-dalle-food-6OG5YHTbYMGU2AcI2Tke6.webp", model: "DALL-E 3" },
    { image: "/gallery-sd-character-NqPCMkuS27QSFCiP_mZOJ.webp", model: "Stable Diffusion" },
    { image: "/gallery-flux-scifi-iQqZE9G__xOgOWd0kCEna.webp", model: "Flux Pro" },
    { image: "/gallery-imagen-fashion-ITc7z1b3AXEioMUKe--0n.webp", model: "Imagen 3" },
  ];

  return (
    <section id="gallery" className="relative py-24 md:py-32 overflow-hidden bg-[#050508]">
      <NeuralBackground />
      
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <SectionHeader 
          title="Создано нейросетями" 
          subtitle="Работы, созданные топовыми AI моделями"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {galleryImages.map((item, index) => (
            <UnifiedCard key={item.image} delay={index * 0.03}>
              <div 
                className="aspect-square overflow-hidden rounded-xl cursor-pointer relative"
                onClick={() => setSelectedImage(item)}
              >
                <img
                  src={item.image}
                  alt={`Generated by ${item.model}`}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  loading="lazy"
                  decoding="async"
                />
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                
                <div className="absolute bottom-3 left-3 z-10">
                  <span className="px-3 py-1 rounded-full text-xs font-medium text-white/90 bg-black/50 backdrop-blur-sm border border-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    {item.model}
                  </span>
                </div>

                <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-cyan-400/30 transition-colors duration-500 pointer-events-none" />
              </div>
            </UnifiedCard>
          ))}
        </div>
      </div>

      {/* Lightbox — full-screen clean image */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center cursor-pointer"
            style={{ backgroundColor: 'rgba(0,0,0,0.92)', backdropFilter: 'blur(20px)' }}
            onClick={() => setSelectedImage(null)}
          >
            <motion.img
              src={selectedImage.image}
              alt={`Generated by ${selectedImage.model}`}
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="max-w-[90vw] max-h-[90vh] object-contain"
            />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#06060a] to-transparent pointer-events-none" />
    </section>
  );
};

// Video Gallery Section
const VideoGallerySection = () => {
  const galleryVideos = [
    { video: "/gallery-sora-cinematic-ujzdzg90ca.mp4", model: "Sora" },
    { video: "/gallery-kling-fashion-3lxjxfvq4h.mp4", model: "Kling" },
    { video: "/gallery-runway-nature-rqo5m9e5pu.mp4", model: "Runway" },
    { video: "/gallery-veo-car-8tqdhpxnwf.mp4", model: "Veo 2" },
    { video: "/gallery-minimax-dance-ipwickcqg3.mp4", model: "MiniMax" },
    { video: "/gallery-luma-product-f7z1s9yr0b.mp4", model: "Luma Dream" },
  ];

  return (
    <section id="video" className="relative py-24 md:py-32 overflow-hidden bg-[#06060a]">
      <NeuralBackground />
      
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <SectionHeader 
          title="Видео от ИИ" 
          subtitle="Кинематограф нового поколения"
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galleryVideos.map((item, index) => (
            <VideoCard key={item.video} {...item} delay={index * 0.1} />
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#07070c] to-transparent pointer-events-none" />
    </section>
  );
};

// Video Card Component — autoplay when scrolled into view
const VideoCard = ({ video, model, delay }: { video: string; model: string; delay: number }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          videoRef.current?.play().catch(() => {});
        } else {
          videoRef.current?.pause();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <UnifiedCard delay={delay}>
      <div 
        ref={containerRef}
        className="aspect-square overflow-hidden rounded-xl relative"
      >
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          className="w-full h-full object-cover"
          style={{ willChange: 'transform', transform: 'translateZ(0)' }}
        >
          <source src={video} type="video/mp4" />
        </video>

        <div className="absolute bottom-3 left-3 z-10">
          <span className="px-3 py-1 rounded-full text-xs font-medium text-white/90 bg-black/50 backdrop-blur-sm border border-white/10">
            {model}
          </span>
        </div>

        <div className="absolute inset-0 rounded-xl border border-transparent group-hover:border-purple-400/30 transition-colors duration-500 pointer-events-none" />
      </div>
    </UnifiedCard>
  );
};

// AI Models Showcase Section — minimal horizontal rows
const AIModelsShowcase = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const modelCategories = [
    {
      title: "Изображения",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z" />
        </svg>
      ),
      models: ["Midjourney", "DALL-E 3", "Stable Diffusion XL", "Flux Pro", "Imagen 3", "Leonardo AI", "Ideogram"],
    },
    {
      title: "Видео",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9A2.25 2.25 0 0 0 13.5 5.25h-9A2.25 2.25 0 0 0 2.25 7.5v9A2.25 2.25 0 0 0 4.5 18.75Z" />
        </svg>
      ),
      models: ["Sora", "Kling", "Runway Gen-3", "Veo 2", "MiniMax", "Luma Dream", "Pika Labs"],
    },
    {
      title: "Музыка",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
        </svg>
      ),
      models: ["Suno v4", "Udio", "Stable Audio"],
    },
    {
      title: "Текст",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      ),
      models: ["ChatGPT-5", "Claude 3.5", "Gemini Pro", "Mistral Large"],
    },
  ];

  return (
    <section id="models" className="relative py-24 md:py-32 overflow-hidden bg-[#07070c]">
      <NeuralBackground />
      
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        <SectionHeader 
          title="Все топовые нейросети" 
          subtitle="Один интерфейс. Бесконечные возможности."
        />

        <div className="divide-y divide-white/[0.06]" ref={ref}>
          {modelCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 16 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 16 }}
              transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
              className="py-5 flex flex-col sm:flex-row sm:items-center gap-4"
            >
              <div className="flex items-center gap-2.5 shrink-0 sm:w-[140px]">
                <span className="text-white/30">{category.icon}</span>
                <span className="text-[11px] font-medium tracking-[0.15em] text-white/40 uppercase">{category.title}</span>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {category.models.map((model) => (
                  <span
                    key={model}
                    className="text-[13px] text-white/60 hover:text-white/90 transition-colors duration-300 cursor-default"
                  >
                    {model}
                  </span>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#08080e] to-transparent pointer-events-none" />
    </section>
  );
};

// Showcase Section
const ShowcaseSection = () => {
  const showcases = [
    {
      title: "Фотореализм",
      description: "Создавай невероятно реалистичные изображения. Портреты, пейзажи, продуктовые фото — всё выглядит как настоящая фотография.",
      image: "/showcase-photorealism-jl5VrcmSvi7V0nRC1fju5.webp",
    },
    {
      title: "DJ-Ремиксы",
      description: "Генерируй музыку от электронных битов до симфоний. Создавай уникальные треки за секунды без музыкального образования.",
      image: "/showcase-dj-remix-WMUS9BnLfPF1mL_Y7XyPb.webp",
    },
    {
      title: "Кино-видео",
      description: "Превращай идеи в кинематографические видео. Голливудское качество, фантастические сцены — всё доступно в пару кликов.",
      image: "/showcase-cinema-video-oSbumCdO6uc018suXf29z.webp",
    },
  ];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-[#08080e]">
      <NeuralBackground />
      
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <SectionHeader 
          title="Создавай без границ" 
          subtitle="Все возможности топовых нейросетей"
        />

        <div className="grid md:grid-cols-3 gap-4">
          {showcases.map((showcase, index) => (
            <UnifiedCard key={showcase.title} delay={index * 0.15}>
              <div className="rounded-xl overflow-hidden">
                <div className="aspect-square overflow-hidden">
                  <img
                    src={showcase.image}
                    alt={showcase.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    loading="lazy"
                    decoding="async"
                  />
                </div>
                <div className="p-5">
                  <h3 className="text-lg font-medium landing-text-gradient-cosmic mb-2">
                    {showcase.title}
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed font-light">{showcase.description}</p>
                </div>
              </div>
            </UnifiedCard>
          ))}
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#090910] to-transparent pointer-events-none" />
    </section>
  );
};

// Pricing Section — minimal premium
const PricingSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const plans = [
    {
      name: "Free",
      price: "0",
      period: "",
      desc: "Для знакомства",
      features: ["15 кредитов", "Базовые модели", "Стандартное качество", "Поддержка сообщества"],
      cta: "Начать бесплатно",
    },
    {
      name: "Pro",
      price: "990 ₽",
      period: "/ мес",
      desc: "Для создателей",
      features: ["500 кредитов / мес", "Все HD модели", "Приоритетная очередь", "ChatGPT-5, Midjourney, Sora", "Без водяных знаков"],
      highlighted: true,
      cta: "Подключить",
    },
    {
      name: "VIP",
      price: "2 990 ₽",
      period: "/ мес",
      desc: "Максимум",
      features: ["2 000 кредитов / мес", "Всё из Pro", "Эксклюзивные модели", "API доступ", "Персональный менеджер"],
      cta: "Подключить",
    },
  ];

  const topUp = [
    { amount: 50, price: "149 ₽" },
    { amount: 200, price: "499 ₽" },
    { amount: 500, price: "999 ₽" },
    { amount: 1000, price: "1 799 ₽" },
  ];

  return (
    <section id="pricing" className="relative py-24 md:py-32 overflow-hidden bg-[#090910]">
      <NeuralBackground />
      
      <div className="container mx-auto px-4 max-w-5xl relative z-10">
        <SectionHeader 
          title="Тарифы" 
          subtitle="Прозрачные цены без скрытых условий"
        />

        <div className="grid md:grid-cols-3 gap-px bg-white/[0.04] rounded-2xl overflow-hidden" ref={ref}>
          {plans.map((plan, index) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`p-8 flex flex-col ${
                plan.highlighted 
                  ? 'bg-[#0c0c14] relative' 
                  : 'bg-[#0a0a12]'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
              )}
              
              <p className="text-[11px] tracking-[0.15em] text-white/30 uppercase mb-4">{plan.desc}</p>
              <h3 className="text-xl font-medium text-white mb-1">{plan.name}</h3>
              
              <div className="mt-4 mb-8">
                <span className="text-3xl font-light text-white">{plan.price}</span>
                {plan.period && <span className="text-sm text-white/30 ml-1">{plan.period}</span>}
              </div>
              
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-[13px] text-white/50">
                    <span className="w-1 h-1 rounded-full bg-white/20 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              
              <Link href="/studio">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-3 rounded-lg text-sm font-medium transition-all duration-300 ${
                    plan.highlighted
                      ? "bg-white text-black hover:bg-white/90"
                      : "bg-white/[0.04] border border-white/[0.08] text-white/60 hover:text-white/80 hover:border-white/15"
                  }`}
                >
                  {plan.cta}
                </motion.button>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Top-up */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-12"
        >
          <p className="text-center text-[11px] tracking-[0.15em] text-white/30 uppercase mb-6">Пополнение кредитов</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-white/[0.04] rounded-xl overflow-hidden">
            {topUp.map((t) => (
              <Link key={t.amount} href="/studio">
                <motion.div
                  whileHover={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                  className="bg-[#0a0a12] p-5 text-center cursor-pointer transition-colors duration-300"
                >
                  <div className="text-lg font-light text-white">+{t.amount}</div>
                  <div className="text-[11px] text-white/25 mt-0.5">кредитов</div>
                  <div className="text-sm text-white/60 mt-2">{t.price}</div>
                </motion.div>
              </Link>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Footer — synced with Studio footer style
const LandingFooter = () => {
  return (
    <footer className="border-t border-white/[0.06] bg-[#050508]">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Logo & Copyright */}
          <div className="flex flex-col items-center md:items-start gap-1.5">
            <Link href="/">
              <span className="text-sm font-medium text-white/80 cursor-pointer hover:text-white transition-colors">Synapse</span>
            </Link>
            <p className="text-[11px] text-white/20">© 2026 Synapse AI. All rights reserved.</p>
          </div>

          {/* Social Links */}
          <div className="flex items-center gap-2">
            {[
              { href: "#", label: "Twitter", d: "M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" },
              { href: "#", label: "Discord", d: "M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.36-.698.772-1.362 1.225-1.993a.076.076 0 0 0-.041-.107 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.12-.098.246-.198.373-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" },
            ].map((s) => (
              <a key={s.label} href={s.href} aria-label={s.label} className="w-9 h-9 rounded-lg flex items-center justify-center text-white/20 hover:text-white/60 bg-white/[0.02] hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] transition-all duration-200">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d={s.d}/></svg>
              </a>
            ))}
          </div>

          {/* Legal */}
          <nav className="flex items-center gap-4 md:gap-6">
            {["Privacy Policy", "Terms of Service", "Refund Policy"].map((text, i) => (
              <span key={text} className="flex items-center gap-4 md:gap-6">
                {i > 0 && <span className="text-white/10 hidden md:block">·</span>}
                <a href="#" className="text-[11px] text-white/20 hover:text-white/50 transition-colors duration-200">{text}</a>
              </span>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
};

// Navigation
const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const navLinks = [
    { label: "Галерея", id: "gallery" },
    { label: "Видео", id: "video" },
    { label: "Модели", id: "models" },
    { label: "Тарифы", id: "pricing" },
  ];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? "bg-black/80 backdrop-blur-xl border-b border-white/5" 
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto px-4 py-4 max-w-7xl">
        <div className="flex items-center justify-between">
          <Link href="/">
            <motion.span 
              className="text-xl font-light landing-text-gradient-cosmic cursor-pointer tracking-wide"
              whileHover={{ scale: 1.02 }}
            >
              Synapse
            </motion.span>
          </Link>

          <div className="hidden md:flex items-center gap-6">
            {navLinks.map((link) => (
              <button
                key={link.id}
                onClick={() => scrollTo(link.id)}
                className="text-sm text-white/50 hover:text-white/90 transition-colors duration-300"
              >
                {link.label}
              </button>
            ))}
          </div>

          <Link href="/studio">
            <motion.button 
              className="px-5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-full text-sm text-white/80 font-medium transition-all duration-300"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              Войти
            </motion.button>
          </Link>
        </div>
      </div>
    </motion.nav>
  );
};

// Main Landing Page Component
export default function Landing() {
  return (
    <div className="bg-[#050508] min-h-screen overflow-x-hidden" style={{ fontFamily: "'Sora', system-ui, sans-serif", fontWeight: 300 }}>
      <Navigation />
      <BackgroundMusic />
      <HeroSection />
      <ImageGallerySection />
      <VideoGallerySection />
      <AIModelsShowcase />
      <ShowcaseSection />
      <PricingSection />
      <LandingFooter />
    </div>
  );
}

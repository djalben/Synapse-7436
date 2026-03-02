import { useRef, useEffect, useState } from "react";
import { motion, useInView, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

// Subtle Neural Network Background Pattern
const NeuralBackground = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
      <svg className="absolute inset-0 w-full h-full">
        {Array.from({ length: 15 }, (_, i) => (
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
          poster="/synapse-hero-front-view-UnrcvKNXrST4se0sLsebg.png"
          className="absolute inset-0 w-full h-full object-cover"
          onError={() => setVideoError(true)}
        >
          <source src="/synapse-hero-alive-b0mtzojm0s.mp4" type="video/mp4" />
        </video>
      ) : (
        <img
          src="/synapse-hero-front-view-UnrcvKNXrST4se0sLsebg.png"
          alt="Synapse AI - Neural Light DJ"
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
      
      <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

      <div className="relative z-10 px-6 md:px-12 lg:px-20 w-full">
        <div className="max-w-2xl">
          <motion.h1
            className="landing-font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-light mb-8 leading-tight tracking-tight"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
          >
            <span className="block landing-text-gradient-cosmic">
              Твоя нейронная студия будущего
            </span>
          </motion.h1>

          <motion.p
            className="text-base md:text-lg landing-text-cosmic-silver mb-12 leading-relaxed max-w-lg font-light"
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
    { image: "/gallery-midjourney-portrait-jEO3BpR6DvGsKctPPIKQ9.png", model: "Midjourney" },
    { image: "/gallery-dalle-surreal-PtmmEZGYYZGyiWlkuGXZR.png", model: "DALL-E 3" },
    { image: "/gallery-flux-anime-BCMlc9xCa0TLIhMjO6NLO.png", model: "Flux Pro" },
    { image: "/gallery-midjourney-cyberpunk-MtSvoq4LsMu9JroD00hUt.png", model: "Midjourney" },
    { image: "/gallery-midjourney-fantasy-Sc6NabZtsvEDEIxCFFFE1.png", model: "Midjourney" },
    { image: "/gallery-dalle-product-8Vgj0BARscICQqdW1WFdz.png", model: "DALL-E 3" },
    { image: "/gallery-flux-architecture-gznTgilmyBhS5L3G84Br0.png", model: "Flux Pro" },
    { image: "/gallery-sd-landscape-XLB5PvxnCXPNHKeHmvWB5.png", model: "Stable Diffusion" },
    { image: "/gallery-dalle-abstract-Zeb1MlIBAJ9qtqQ-U1XHr.png", model: "DALL-E 3" },
    { image: "/gallery-midjourney-nature-8TwNeH8q22C0gAASQvQzu.png", model: "Midjourney" },
    { image: "/gallery-flux-portrait-74LBIomz1_cSN3hDRg3kq.png", model: "Flux Pro" },
    { image: "/gallery-imagen-interior-hlJthoXDAHUTX0FLzrDik.png", model: "Imagen 3" },
    { image: "/gallery-dalle-food-6OG5YHTbYMGU2AcI2Tke6.png", model: "DALL-E 3" },
    { image: "/gallery-sd-character-NqPCMkuS27QSFCiP_mZOJ.png", model: "Stable Diffusion" },
    { image: "/gallery-flux-scifi-iQqZE9G__xOgOWd0kCEna.png", model: "Flux Pro" },
    { image: "/gallery-imagen-fashion-ITc7z1b3AXEioMUKe--0n.png", model: "Imagen 3" },
  ];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-[#050508]">
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

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95 backdrop-blur-xl"
            onClick={() => setSelectedImage(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 25 }}
              className="relative max-w-4xl w-full"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="relative rounded-2xl overflow-hidden border border-white/10">
                <img
                  src={selectedImage.image}
                  alt={`Generated by ${selectedImage.model}`}
                  className="w-full h-auto max-h-[80vh] object-contain bg-black/50"
                />
                
                <div className="absolute top-4 left-4">
                  <span className="px-4 py-2 rounded-full text-sm font-medium text-white bg-black/60 backdrop-blur-sm border border-white/10">
                    {selectedImage.model}
                  </span>
                </div>

                <motion.button
                  className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSelectedImage(null)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </motion.button>
              </div>
            </motion.div>
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
    <section className="relative py-24 md:py-32 overflow-hidden bg-[#06060a]">
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

// Video Card Component
const VideoCard = ({ video, model, delay }: { video: string; model: string; delay: number }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <UnifiedCard delay={delay}>
      <div 
        className="aspect-square overflow-hidden rounded-xl cursor-pointer relative"
        onClick={handlePlayPause}
      >
        <video
          ref={videoRef}
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        >
          <source src={video} type="video/mp4" />
        </video>
        
        <AnimatePresence>
          {!isPlaying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/30"
            >
              <motion.div
                className="w-14 h-14 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center"
                whileHover={{ scale: 1.1, backgroundColor: "rgba(255,255,255,0.2)" }}
              >
                <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

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

// AI Models Showcase Section
const AIModelsShowcase = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const modelCategories = [
    {
      title: "ИЗОБРАЖЕНИЯ",
      models: ["Midjourney", "DALL-E 3", "Stable Diffusion XL", "Flux Pro", "Imagen 3", "Leonardo AI", "Ideogram"],
    },
    {
      title: "ВИДЕО",
      models: ["Sora", "Kling", "Runway Gen-3", "Veo 2", "MiniMax", "Luma Dream", "Pika Labs"],
    },
    {
      title: "МУЗЫКА",
      models: ["Suno v4", "Udio", "Stable Audio"],
    },
    {
      title: "ТЕКСТ",
      models: ["ChatGPT-5", "Claude 3.5", "Gemini Pro", "Mistral Large"],
    },
  ];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-[#07070c]">
      <NeuralBackground />
      
      <div className="container mx-auto px-4 max-w-7xl relative z-10">
        <SectionHeader 
          title="Все топовые нейросети" 
          subtitle="Один интерфейс. Бесконечные возможности."
        />

        <div className="grid md:grid-cols-2 gap-4" ref={ref}>
          {modelCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: categoryIndex * 0.1 }}
              className="landing-cosmic-card p-6"
            >
              <h3 className="text-xs font-medium tracking-[0.2em] landing-text-cosmic-silver mb-5 uppercase">
                {category.title}
              </h3>
              
              <div className="flex flex-wrap gap-2">
                {category.models.map((model, modelIndex) => (
                  <motion.span
                    key={model}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={isInView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
                    transition={{ 
                      duration: 0.4, 
                      delay: categoryIndex * 0.1 + modelIndex * 0.05,
                    }}
                    className="px-3 py-1.5 rounded-full text-sm text-white/80 bg-white/5 border border-white/10 hover:border-cyan-400/30 transition-colors duration-300"
                  >
                    {model}
                  </motion.span>
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
      image: "/showcase-photorealism-jl5VrcmSvi7V0nRC1fju5.png",
    },
    {
      title: "DJ-Ремиксы",
      description: "Генерируй музыку от электронных битов до симфоний. Создавай уникальные треки за секунды без музыкального образования.",
      image: "/showcase-dj-remix-WMUS9BnLfPF1mL_Y7XyPb.png",
    },
    {
      title: "Кино-видео",
      description: "Превращай идеи в кинематографические видео. Голливудское качество, фантастические сцены — всё доступно в пару кликов.",
      image: "/showcase-cinema-video-oSbumCdO6uc018suXf29z.png",
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

// Pricing Section
const PricingSection = () => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  const pricingPlans = [
    {
      title: "Free",
      price: "0 ₽",
      features: [
        "15 кредитов для старта",
        "Базовые модели AI",
        "Стандартное качество",
        "Поддержка сообщества",
      ],
    },
    {
      title: "Pro",
      price: "990 ₽",
      period: "/мес",
      features: [
        "Безлимит HD моделей",
        "Приоритетная очередь",
        "Полный креативный набор",
        "ChatGPT-5, Midjourney, Suno",
        "Без водяных знаков",
      ],
      highlighted: true,
    },
    {
      title: "VIP",
      price: "2 990 ₽",
      period: "/мес",
      features: [
        "Всё из Pro",
        "Эксклюзивные модели",
        "API доступ",
        "Персональная поддержка",
        "Ранний доступ к фичам",
      ],
    },
  ];

  const topUpOptions = [
    { credits: 100, price: "299 ₽" },
    { credits: 500, price: "999 ₽" },
    { credits: 1000, price: "1 799 ₽" },
  ];

  return (
    <section className="relative py-24 md:py-32 overflow-hidden bg-[#090910]">
      <NeuralBackground />
      
      <div className="container mx-auto px-4 max-w-6xl relative z-10">
        <SectionHeader 
          title="Тарифы для каждого" 
          subtitle="Выбери план, который подходит именно тебе"
        />

        <div className="grid md:grid-cols-3 gap-4" ref={ref}>
          {pricingPlans.map((plan, index) => (
            <motion.div
              key={plan.title}
              initial={{ opacity: 0, y: 30 }}
              animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
              transition={{ duration: 0.6, delay: index * 0.15 }}
              className={`landing-cosmic-card p-6 relative ${plan.highlighted ? 'border-cyan-400/30' : ''}`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-4 py-1 text-xs font-medium tracking-wider uppercase text-cyan-400 bg-cyan-400/10 rounded-full border border-cyan-400/20">
                    Популярный
                  </span>
                </div>
              )}
              
              <h3 className="text-lg font-medium text-white mb-2">{plan.title}</h3>
              <div className="mb-6">
                <span className="text-3xl font-light landing-text-gradient-cosmic">{plan.price}</span>
                {plan.period && <span className="text-white/40 ml-1 text-sm">{plan.period}</span>}
              </div>
              
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-white/70">
                    <span className="text-cyan-400/60 mt-0.5">—</span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              
              <Link href="/studio">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full py-3 rounded-full text-sm font-medium transition-all duration-300 ${
                    plan.highlighted
                      ? "bg-gradient-to-r from-cyan-500/20 to-purple-500/20 border border-cyan-400/40 text-white"
                      : "bg-white/5 border border-white/10 text-white/80 hover:border-white/20"
                  }`}
                >
                  {plan.highlighted ? "Начать сейчас" : "Выбрать"}
                </motion.button>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Top-up Block */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 landing-cosmic-card p-6 max-w-2xl mx-auto"
        >
          <div className="text-center mb-6">
            <h3 className="text-lg font-medium landing-text-gradient-cosmic mb-1">Дозаправка</h3>
            <p className="text-sm text-white/50">Докупи кредиты в любой момент</p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {topUpOptions.map((option) => (
              <motion.button
                key={option.credits}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
                className="landing-cosmic-card p-4 text-center hover:border-cyan-400/30 transition-colors duration-300"
              >
                <div className="text-xl font-light landing-text-gradient-cosmic">+{option.credits}</div>
                <div className="text-xs text-white/50 mt-1">кредитов</div>
                <div className="text-sm text-white/80 mt-2 font-medium">{option.price}</div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

// Footer
const LandingFooter = () => {
  return (
    <footer className="relative py-16 bg-[#050508] border-t border-white/5">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <Link href="/">
            <motion.span 
              className="text-2xl font-light landing-text-gradient-cosmic cursor-pointer"
              whileHover={{ scale: 1.02 }}
            >
              Synapse
            </motion.span>
          </Link>

          <nav className="flex flex-wrap justify-center gap-8">
            {["О нас", "Поддержка", "Политика конфиденциальности"].map((link) => (
              <a
                key={link}
                href="#"
                className="text-sm text-white/40 hover:text-white/70 transition-colors duration-300"
              >
                {link}
              </a>
            ))}
          </nav>

          <div className="flex gap-3">
            {["telegram", "twitter", "discord"].map((social) => (
              <motion.a
                key={social}
                href="#"
                className="w-10 h-10 rounded-full bg-white/5 border border-white/5 flex items-center justify-center text-white/40 hover:text-white/70 hover:border-white/10 transition-all duration-300"
                whileHover={{ scale: 1.05 }}
              >
                {social === "telegram" && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                  </svg>
                )}
                {social === "twitter" && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                  </svg>
                )}
                {social === "discord" && (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
                  </svg>
                )}
              </motion.a>
            ))}
          </div>
        </div>

        <div className="text-center mt-12 pt-8 border-t border-white/5">
          <p className="text-white/30 text-xs tracking-wider">
            © 2026 Synapse
          </p>
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

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? "bg-black/70 backdrop-blur-xl border-b border-white/5" 
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

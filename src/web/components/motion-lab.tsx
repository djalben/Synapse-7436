import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Play,
  Clock,
  Sparkles,
  Film,
  Trash2,
  Loader2,
  Lock,
  Pause,
  Download,
  Smile,
  Hand,
  Eye,
  Clapperboard,
  ImageIcon,
  X,
  ChevronDown,
  Star,
  Crown,
} from "lucide-react";
import { useUsage } from "./usage-context";
import { type UserPlan, canAccessModel } from "./model-selector";
import { addToHistory } from "./placeholder-pages";

// Video model type
type VideoModel = "kling" | "standard" | "veo";

// Animation preset type
type AnimationPreset = "smile-blink" | "wave-hello" | "look-around" | "old-film";

// Generated video interface
interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  duration: number;
  aspectRatio: string;
  thumbnailUrl?: string;
  createdAt: string;
  preset?: AnimationPreset;
}

// Animation preset data
const ANIMATION_PRESETS: {
  id: AnimationPreset;
  name: string;
  description: string;
  icon: typeof Smile;
  accentColor: string;
  bgGradient: string;
  borderColor: string;
}[] = [
  {
    id: "smile-blink",
    name: "Улыбка и моргание",
    description: "Нежная улыбка, естественное моргание",
    icon: Smile,
    accentColor: "text-blue-400",
    bgGradient: "from-blue-500/20 to-blue-600/10",
    borderColor: "border-blue-500/40",
  },
  {
    id: "wave-hello",
    name: "Приветствие",
    description: "Дружелюбный взмах рукой",
    icon: Hand,
    accentColor: "text-emerald-400",
    bgGradient: "from-emerald-500/20 to-emerald-600/10",
    borderColor: "border-emerald-500/40",
  },
  {
    id: "look-around",
    name: "Осмотр",
    description: "Естественное движение головой",
    icon: Eye,
    accentColor: "text-purple-400",
    bgGradient: "from-purple-500/20 to-purple-600/10",
    borderColor: "border-purple-500/40",
  },
  {
    id: "old-film",
    name: "Старое кино",
    description: "Эффект винтажной плёнки",
    icon: Clapperboard,
    accentColor: "text-amber-400",
    bgGradient: "from-amber-500/20 to-amber-600/10",
    borderColor: "border-amber-500/40",
  },
];

// Video model data
interface VideoModelData {
  id: VideoModel;
  name: string;
  subtitle: string;
  description: string;
  requiredPlan: UserPlan;
  badge?: string;
}

const VIDEO_MODELS: VideoModelData[] = [
  {
    id: "kling",
    name: "Kling AI",
    subtitle: "Быстрое превью",
    description: "Быстрое превью (2 сек). Идеально для пробы",
    requiredPlan: "free",
  },
  {
    id: "standard",
    name: "Luma / Runway",
    subtitle: "Стандартное видео",
    description: "Стандартное видео (5 сек). Высокое качество",
    requiredPlan: "standard",
  },
  {
    id: "veo",
    name: "Google Veo",
    subtitle: "Фотореализм Pro",
    description: "Фотореализм Pro (10 сек). Кинематографический уровень",
    requiredPlan: "ultra",
    badge: "ULTRA",
  },
];

// Video Model Selector Component
interface VideoModelSelectorProps {
  selected: VideoModel;
  onChange: (model: VideoModel) => void;
  userPlan: UserPlan;
  disabled?: boolean;
  onUpgradeClick?: () => void;
}

const VideoModelSelector = ({ selected, onChange, userPlan, disabled, onUpgradeClick }: VideoModelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedModel = VIDEO_MODELS.find(m => m.id === selected) || VIDEO_MODELS[0];

  const handleSelect = (model: VideoModelData) => {
    if (!canAccessModel(userPlan, model.requiredPlan)) {
      onUpgradeClick?.();
      setIsOpen(false);
      return;
    }
    onChange(model.id);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#888] flex items-center gap-2">
        <Film className="w-4 h-4 text-indigo-400" />
        Модель видео
      </label>
      
      <div className="relative">
        {/* Dropdown Trigger */}
        <button
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`
            w-full p-4 rounded-xl
            bg-[#0a0a0a]/80 backdrop-blur-xl
            border transition-all duration-300
            text-left flex items-center justify-between
            disabled:opacity-50 disabled:cursor-not-allowed
            ${isOpen 
              ? "border-indigo-500/50 shadow-lg shadow-indigo-500/10" 
              : "border-[#333] hover:border-[#444]"
            }
          `}
        >
          <div className="flex items-center gap-3">
            {/* Model icon */}
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center
              ${selectedModel.requiredPlan === "ultra"
                ? "bg-gradient-to-br from-amber-500/30 to-yellow-500/20" 
                : selectedModel.requiredPlan === "standard"
                  ? "bg-gradient-to-br from-indigo-500/20 to-blue-500/10"
                  : "bg-white/[0.05]"
              }
            `}>
              {selectedModel.requiredPlan === "ultra" ? (
                <Crown className="w-5 h-5 text-amber-400" fill="currentColor" />
              ) : (
                <Film className="w-5 h-5 text-[#666]" />
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{selectedModel.name}</span>
                {selectedModel.badge && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {selectedModel.badge}
                  </span>
                )}
                {selectedModel.requiredPlan === "free" && (
                  <span className="text-[10px] text-emerald-400 font-medium">Free</span>
                )}
              </div>
              <span className="text-xs text-[#666]">{selectedModel.subtitle}</span>
            </div>
          </div>
          
          <ChevronDown className={`w-5 h-5 text-[#666] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 z-40" 
              onClick={() => setIsOpen(false)}
            />
            
            {/* Menu */}
            <div className="
              absolute top-full left-0 right-0 mt-2 z-50
              bg-[#0a0a0a]/95 backdrop-blur-xl
              border border-[#333] rounded-xl
              shadow-2xl shadow-black/50
              overflow-hidden
              animate-in fade-in slide-in-from-top-2 duration-200
            ">
              {VIDEO_MODELS.map((model) => {
                const isSelected = model.id === selected;
                const isLocked = !canAccessModel(userPlan, model.requiredPlan);
                
                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model)}
                    className={`
                      w-full p-4 flex items-start gap-3
                      transition-all duration-200
                      ${isSelected 
                        ? "bg-indigo-500/10" 
                        : "hover:bg-white/[0.03]"
                      }
                    `}
                  >
                    {/* Model icon */}
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center shrink-0
                      ${model.requiredPlan === "ultra"
                        ? "bg-gradient-to-br from-amber-500/30 to-yellow-500/20" 
                        : model.requiredPlan === "standard"
                          ? "bg-gradient-to-br from-indigo-500/20 to-blue-500/10"
                          : "bg-white/[0.05]"
                      }
                    `}>
                      {model.requiredPlan === "ultra" ? (
                        <Crown className="w-5 h-5 text-amber-400" fill="currentColor" />
                      ) : (
                        <Film className="w-5 h-5 text-[#666]" />
                      )}
                    </div>
                    
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm font-medium ${model.requiredPlan === "ultra" ? "text-amber-200" : "text-white"}`}>
                          {model.name}
                        </span>
                        {model.badge && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {model.badge}
                          </span>
                        )}
                        {model.requiredPlan === "free" && (
                          <span className="text-[10px] text-emerald-400 font-medium">Free</span>
                        )}
                        {isLocked && (
                          <Lock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-[#666] block mt-0.5">{model.subtitle}</span>
                      <p className="text-xs text-[#555] mt-1.5 leading-relaxed">{model.description}</p>
                      {model.requiredPlan !== "free" && (
                        <span className="text-[10px] text-[#666] mt-1 block">
                          Тариф: {model.requiredPlan === "ultra" ? "Ultra" : "Studio"}
                        </span>
                      )}
                    </div>

                    {/* Selected indicator or lock */}
                    {isSelected ? (
                      <div className="w-2 h-2 rounded-full bg-indigo-500 shrink-0 mt-2" />
                    ) : isLocked ? (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 shrink-0">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] text-amber-400 font-medium">
                          {model.requiredPlan === "ultra" ? "Ultra" : "Studio"}
                        </span>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Helper text */}
      <p className="text-xs text-[#555] px-1">
        {selectedModel.description}
      </p>
    </div>
  );
};

// Large upload dropzone component
interface UploadDropzoneProps {
  onImageUpload: (image: string) => void;
  disabled?: boolean;
}

const UploadDropzone = ({ onImageUpload, disabled }: UploadDropzoneProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onImageUpload(result);
    };
    reader.readAsDataURL(file);
  }, [onImageUpload]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;
    
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    if (!disabled) fileInputRef.current?.click();
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileInput}
        className="hidden"
      />
      <div
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative p-8 md:p-12 rounded-2xl
          border-2 border-dashed
          flex flex-col items-center justify-center gap-5
          cursor-pointer
          transition-all duration-500
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${isDragging 
            ? "border-indigo-400/60 bg-indigo-500/10 scale-[1.02]" 
            : "border-[#333] bg-gradient-to-br from-white/[0.03] to-transparent hover:border-indigo-500/40 hover:bg-indigo-500/5"
          }
        `}
      >
        {/* Magical glow effect */}
        <div className={`
          absolute inset-0 rounded-2xl transition-opacity duration-500
          ${isDragging ? "opacity-100" : "opacity-0"}
        `}>
          <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-2xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        </div>
        
        {/* Icon container with sparkle effect */}
        <div className="relative">
          <div className={`
            w-20 h-20 md:w-24 md:h-24 rounded-2xl flex items-center justify-center
            bg-gradient-to-br from-indigo-500/20 to-purple-500/10
            border border-indigo-500/20
            transition-all duration-300
            ${isDragging ? "scale-110 shadow-lg shadow-indigo-500/20" : ""}
          `}>
            <div className="relative">
              <ImageIcon className={`
                w-8 h-8 md:w-10 md:h-10 transition-colors duration-300
                ${isDragging ? "text-indigo-300" : "text-indigo-400/80"}
              `} />
              <Sparkles className={`
                absolute -top-1 -right-1 w-4 h-4 text-amber-400
                ${isDragging ? "animate-spin" : "animate-pulse"}
              `} />
            </div>
          </div>
          
          {/* Floating sparkles */}
          <div className="absolute -top-2 -left-2 w-2 h-2 bg-indigo-400 rounded-full opacity-60 animate-bounce" style={{ animationDelay: "0s" }} />
          <div className="absolute -bottom-1 -right-3 w-1.5 h-1.5 bg-purple-400 rounded-full opacity-60 animate-bounce" style={{ animationDelay: "0.2s" }} />
          <div className="absolute top-1/2 -right-4 w-1 h-1 bg-blue-400 rounded-full opacity-60 animate-bounce" style={{ animationDelay: "0.4s" }} />
        </div>
        
        {/* Text content */}
        <div className="relative text-center space-y-2">
          <p className="text-lg md:text-xl font-medium text-white/90">
            Загрузите портрет для оживления ✨
          </p>
          <p className="text-sm text-indigo-300/70">
            Лучше всего работает с фронтальными фото
          </p>
          <p className="text-xs text-[#555] mt-3">
            Перетащите или нажмите • JPG, PNG
          </p>
        </div>
      </div>
    </>
  );
};

// Photo preview with change option
interface PhotoPreviewProps {
  image: string;
  onRemove: () => void;
  disabled?: boolean;
}

const PhotoPreview = ({ image, onRemove, disabled }: PhotoPreviewProps) => {
  return (
    <div className="relative rounded-2xl overflow-hidden border border-[#333] bg-[#0a0a0a]">
      <div className="flex flex-col items-center p-4">
        <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-xl overflow-hidden border-2 border-indigo-500/30 shadow-lg shadow-indigo-500/10">
          <img 
            src={image} 
            alt="Portrait" 
            className="w-full h-full object-cover"
          />
          {/* Animated border effect */}
          <div className="absolute inset-0 border-2 border-indigo-400/50 rounded-xl animate-pulse" />
        </div>
        
        {/* Ready badge */}
        <div className="flex items-center gap-2 mt-4 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-sm text-emerald-400 font-medium">Фото готово</span>
        </div>
        
        {/* Change photo button */}
        <button
          onClick={onRemove}
          disabled={disabled}
          className="
            mt-3 text-sm text-[#666] hover:text-indigo-400 
            transition-colors flex items-center gap-1.5
            disabled:opacity-50
          "
        >
          <X className="w-3.5 h-3.5" />
          Изменить фото
        </button>
      </div>
    </div>
  );
};

// Animation preset card
interface PresetCardProps {
  preset: typeof ANIMATION_PRESETS[0];
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
}

const PresetCard = ({ preset, selected, onClick, disabled }: PresetCardProps) => {
  const Icon = preset.icon;
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative p-4 rounded-xl
        flex flex-col items-center gap-2
        transition-all duration-300
        disabled:opacity-50
        ${selected 
          ? `bg-gradient-to-br ${preset.bgGradient} border ${preset.borderColor} shadow-lg scale-[1.02]`
          : "bg-white/[0.03] border border-[#333] hover:border-[#444] hover:bg-white/[0.05]"
        }
      `}
    >
      {/* Glow effect when selected */}
      {selected && (
        <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${preset.bgGradient} blur-xl opacity-50`} />
      )}
      
      <div className={`
        relative w-10 h-10 rounded-lg flex items-center justify-center
        transition-all duration-300
        ${selected 
          ? `bg-gradient-to-br ${preset.bgGradient}` 
          : "bg-white/[0.05]"
        }
      `}>
        <Icon className={`w-5 h-5 ${selected ? preset.accentColor : "text-[#666]"}`} />
      </div>
      
      <div className="relative text-center">
        <p className={`text-sm font-medium ${selected ? "text-white" : "text-[#888]"}`}>
          {preset.name}
        </p>
        <p className={`text-xs mt-0.5 ${selected ? preset.accentColor : "text-[#555]"}`}>
          {preset.description}
        </p>
      </div>
    </button>
  );
};

// Duration toggle
interface DurationToggleProps {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}

const DurationToggle = ({ value, onChange, disabled }: DurationToggleProps) => {
  return (
    <div className="flex gap-2">
      {[2, 5, 10].map((duration) => (
        <button
          key={duration}
          onClick={() => onChange(duration)}
          disabled={disabled}
          className={`
            flex-1 px-4 py-2.5 rounded-lg text-sm font-medium
            transition-all duration-200
            disabled:opacity-50
            ${value === duration
              ? "bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border border-indigo-500/40 text-white"
              : "bg-white/[0.03] border border-[#333] text-[#666] hover:text-white hover:border-[#444]"
            }
          `}
        >
          {duration === 2 ? "2s (превью)" : `${duration}s`}
        </button>
      ))}
    </div>
  );
};

// Video player component
interface VideoPlayerProps {
  video: GeneratedVideo | null;
  isGenerating: boolean;
}

const VideoPlayer = ({ video, isGenerating }: VideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleDownload = async () => {
    if (!video) return;
    try {
      const response = await fetch(video.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synapse-portrait-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  // Generating state
  if (isGenerating) {
    return (
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#111] border border-[#222]">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          {/* Magical background animation */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-blue-500/10 animate-pulse" />
            <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl animate-bounce" style={{ animationDuration: "3s" }} />
            <div className="absolute bottom-1/4 right-1/4 w-24 h-24 bg-purple-500/20 rounded-full blur-3xl animate-bounce" style={{ animationDuration: "2.5s", animationDelay: "0.5s" }} />
          </div>
          
          {/* Loading indicator */}
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-white/[0.05] border border-indigo-500/40 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          </div>
          
          <div className="relative text-center">
            <p className="text-white/90 text-base font-medium">Создаём магию... ✨</p>
            <p className="text-indigo-300/60 text-sm mt-1">Оживляем ваше фото</p>
          </div>
        </div>

        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 backdrop-blur-sm border border-indigo-500/30">
          <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
          <span className="text-xs text-indigo-300">Анимация</span>
        </div>
      </div>
    );
  }

  // Video loaded state
  if (video) {
    const preset = ANIMATION_PRESETS.find(p => p.id === video.preset);
    
    return (
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#111] border border-[#222]">
        <video
          ref={videoRef}
          src={video.url}
          className="w-full h-full object-cover"
          loop
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        {/* Play/pause overlay */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300 bg-black/30">
          <button
            onClick={togglePlay}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 text-white" fill="white" />
            ) : (
              <Play className="w-6 h-6 text-white ml-1" fill="white" />
            )}
          </button>
        </div>

        {/* Info bar */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-emerald-500/30">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            <span className="text-xs text-emerald-300">
              {preset?.name || "Animated"}
            </span>
          </div>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/[0.1] text-white/80 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-xs">Сохранить</span>
          </button>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-sm">
          <span className="text-xs font-medium text-white/90">{video.duration}s</span>
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#111] border border-[#222]">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        {/* Subtle pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(99, 102, 241, 0.5) 1px, transparent 1px)`,
            backgroundSize: '20px 20px',
          }}
        />
        
        {/* Play button */}
        <div className="relative">
          <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
          <div className="relative w-20 h-20 rounded-full bg-white/[0.05] border border-white/10 flex items-center justify-center">
            <Play className="w-8 h-8 text-white/40 ml-1" />
          </div>
        </div>
        
        <p className="text-[#555] text-sm">Ваш анимированный портрет появится здесь</p>
      </div>

      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/[0.05]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#444]" />
        <span className="text-xs text-[#666]">Готово</span>
      </div>
    </div>
  );
};

// Thumbnail component
interface ThumbnailProps {
  video: GeneratedVideo;
  index: number;
  onClick: (video: GeneratedVideo) => void;
}

const Thumbnail = ({ video, index, onClick }: ThumbnailProps) => {
  const preset = ANIMATION_PRESETS.find(p => p.id === video.preset);
  
  return (
    <div 
      onClick={() => onClick(video)}
      className="
        relative aspect-video rounded-xl overflow-hidden
        bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a]
        border border-[#222] hover:border-[#444]
        cursor-pointer group
        transition-all duration-300
      "
    >
      {video.thumbnailUrl ? (
        <img src={video.thumbnailUrl} alt={video.prompt} className="w-full h-full object-cover" />
      ) : (
        <div 
          className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity"
          style={{
            background: `linear-gradient(${135 + index * 45}deg, 
              rgba(99, 102, 241, 0.3) 0%, 
              rgba(59, 130, 246, 0.2) 50%, 
              rgba(139, 92, 246, 0.3) 100%)`
          }}
        />
      )}
      
      {/* Play overlay */}
      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
          <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
        </div>
      </div>

      {/* Preset badge */}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm">
        <span className={`text-[10px] ${preset?.accentColor || "text-white/70"}`}>
          {preset?.name || "Animated"}
        </span>
      </div>

      {/* Duration badge */}
      <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 backdrop-blur-sm">
        <span className="text-xs font-medium text-white/90">{video.duration}s</span>
      </div>
    </div>
  );
};

// Main Motion Lab component
export const MotionLab = () => {
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<AnimationPreset | null>(null);
  const [duration, setDuration] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);
  const [recentVideos, setRecentVideos] = useState<GeneratedVideo[]>([]);
  const [selectedVideoModel, setSelectedVideoModel] = useState<VideoModel>("kling");
  const [prompt, setPrompt] = useState("");
  
  const { checkVideoLimit, incrementVideoDaily, limits, userPlan, setShowPaywall, setPaywallReason, effectiveVideoCountToday } = useUsage();
  const atLimit = effectiveVideoCountToday >= limits.maxVideos;
  const selectedModelData = VIDEO_MODELS.find(m => m.id === selectedVideoModel) || VIDEO_MODELS[0];
  const canAccessSelectedModel = canAccessModel(userPlan, selectedModelData.requiredPlan);
  const isReady = (prompt.trim().length > 0) || (uploadedImage && selectedPreset);
  const isKlingModel = selectedVideoModel === "kling";

  const handleVeoUpgradeClick = () => {
    setPaywallReason("videos");
    setShowPaywall(true);
  };

  const handleGenerate = async () => {
    const hasPrompt = prompt.trim().length > 0;
    const hasImageAndPreset = uploadedImage && selectedPreset;
    if ((!hasPrompt && !hasImageAndPreset) || isGenerating) return;
    
    if (!canAccessSelectedModel) {
      setPaywallReason("videos");
      setShowPaywall(true);
      return;
    }
    
    if (!checkVideoLimit()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const hasImageAndPreset = uploadedImage && selectedPreset;
      const textPrompt = prompt.trim();

      let data: { id?: string; url: string; prompt?: string; duration?: number; aspectRatio?: string; thumbnailUrl?: string };
      if (textPrompt && !hasImageAndPreset) {
        // Text-to-video: только промпт
        const res = await fetch("/api/video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: textPrompt,
            duration,
            aspectRatio: "9:16",
            mode: "text-to-video",
          }),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to generate video");
      } else {
        // Image-to-video: /animate
        const res = await fetch("/api/video/animate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            image: uploadedImage || null,
            preset: selectedPreset || null,
            duration,
            prompt: textPrompt || null,
          }),
        });
        data = await res.json();
        if (!res.ok) throw new Error(data.error || "Failed to animate portrait");
      }

      const newVideo: GeneratedVideo = {
        id: data.id || `${Date.now()}`,
        url: data.url,
        prompt: data.prompt ?? ANIMATION_PRESETS.find(p => p.id === selectedPreset)?.name ?? "",
        duration: data.duration ?? duration,
        aspectRatio: (data.aspectRatio as "1:1" | "9:16") ?? "1:1",
        thumbnailUrl: data.thumbnailUrl,
        createdAt: new Date().toISOString(),
        preset: selectedPreset ?? undefined,
      };

      setCurrentVideo(newVideo);
      setRecentVideos((prev) => [newVideo, ...prev].slice(0, 6));
      if (isKlingModel) incrementVideoDaily();
      
      // Сохранить в историю
      const videoCost = selectedModelData.requiredPlan === "free" ? 0 : selectedModelData.requiredPlan === "standard" ? 1 : 2;
      addToHistory({
        type: "video",
        prompt: newVideo.prompt,
        model: selectedModelData.name,
        result: newVideo.url,
        credits: videoCost,
      });
    } catch (err) {
      console.error("Animation error:", err);
      setError(err instanceof Error ? err.message : "Failed to animate portrait");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRemoveImage = () => {
    setUploadedImage(null);
    setSelectedPreset(null);
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-screen">
      {/* Left Panel - Controls: scrollable, на мобильных с отступом снизу для фиксированной кнопки */}
      <div className="w-full lg:w-[42%] border-b lg:border-b-0 lg:border-r border-[#222] flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 min-h-0 pb-36 md:pb-6">
          <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="text-center lg:text-left">
              <h2 className="font-mono text-xl md:text-2xl font-semibold text-white mb-1 flex items-center justify-center lg:justify-start gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Видео
              </h2>
              <p className="text-sm text-[#666]">
                Оживите ваши фото с помощью AI магии ✨
              </p>
            </div>
          </div>

          {/* Video Model Selector */}
          <VideoModelSelector
            selected={selectedVideoModel}
            onChange={setSelectedVideoModel}
            userPlan={userPlan}
            disabled={isGenerating}
            onUpgradeClick={handleVeoUpgradeClick}
          />

          {/* Prompt Area — как во вкладке Изображения (Text-to-Video) */}
          <div className="space-y-1.5" data-tour="video-prompt">
            <label className="text-xs font-medium text-[#888]">Промпт</label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
                placeholder="Опишите сцену или действие для видео... (опционально, можно только по картинке)"
                rows={3}
                disabled={isGenerating}
                className="
                  w-full p-4 rounded-xl
                  bg-[#0a0a0a]/80 backdrop-blur-xl
                  border border-[#333] focus:border-indigo-500/50
                  text-white placeholder-[#555]
                  text-base leading-relaxed
                  resize-none outline-none
                  transition-all duration-300
                  disabled:opacity-50
                "
                style={{ fontSize: '16px' }}
              />
              <div className="absolute bottom-3 right-3 text-xs text-[#555]">
                {prompt.length}/500
              </div>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Conditional: Upload or Preview + Presets */}
          {!uploadedImage ? (
            /* Step 1: Upload photo */
            <>
              <UploadDropzone 
                onImageUpload={setUploadedImage}
                disabled={isGenerating}
              />
            </>
          ) : (
            /* Step 2: Photo uploaded - show preview + presets */
            <>
              {/* Photo preview */}
              <PhotoPreview 
                image={uploadedImage}
                onRemove={handleRemoveImage}
                disabled={isGenerating}
              />

              {/* Animation presets */}
              <div className="space-y-3">
                <label className="text-sm font-medium text-[#888] flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Выберите анимацию
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {ANIMATION_PRESETS.map((preset) => (
                    <PresetCard
                      key={preset.id}
                      preset={preset}
                      selected={selectedPreset === preset.id}
                      onClick={() => setSelectedPreset(preset.id)}
                      disabled={isGenerating}
                    />
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#888]">Длительность</label>
                <DurationToggle 
                  value={duration} 
                  onChange={setDuration}
                  disabled={isGenerating}
                />
              </div>
            </>
          )}

          {/* Кнопка "Создать видео" — на десктопе sticky внизу левой панели */}
          <div className="hidden md:block sticky bottom-0 z-[50] mt-5 pt-2 pb-2 -mx-6 px-6 bg-black">
            {isKlingModel ? (
              <>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={!isReady || isGenerating || atLimit}
                  className={`
                    w-full py-4 px-6 rounded-xl font-medium text-base mb-2
                    transition-all duration-300 relative overflow-hidden
                    active:scale-[0.98] group
                    ${isReady && !isGenerating && !atLimit
                      ? "bg-[#0070f3] hover:bg-[#0060df] text-white shadow-lg shadow-[0_0_24px_rgba(0,112,243,0.4)]"
                      : "bg-[#222] text-[#555] cursor-not-allowed"
                    }
                  `}
                >
                  {isReady && !isGenerating && !atLimit && (
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
                  )}
                  <span className="relative flex items-center justify-center gap-2">
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        <span>Создаём магию...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5" />
                        <span>Создать видео</span>
                      </>
                    )}
                  </span>
                </button>
                <p className="text-center text-[#555] text-xs mb-3">
                  {effectiveVideoCountToday}/{limits.maxVideos} видео сегодня
                </p>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPaywallReason("videos");
                  setShowPaywall(true);
                }}
                className="
                  w-full py-4 px-6 rounded-xl font-medium text-base mb-3
                  transition-all duration-300 relative overflow-hidden
                  active:scale-[0.98] group
                  bg-gradient-to-r from-amber-500/20 to-orange-500/20
                  border border-amber-500/40 text-amber-300
                  hover:border-amber-500/60 hover:bg-amber-500/30
                "
              >
                <span className="relative flex items-center justify-center gap-2">
                  <Crown className="w-5 h-5" />
                  <span>Улучшить тариф</span>
                </span>
              </button>
            )}
          </div>

          {/* Tip — компактный блок внизу */}
          {!uploadedImage && (
            <div className="p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
              <p className="text-xs text-[#666] leading-relaxed">
                <span className="text-indigo-300 font-medium">Совет:</span> Лучше всего работают фронтальные портретные фото с хорошим освещением.
              </p>
            </div>
          )}

        </div>
        </div>
      </div>

      {/* Фиксированная кнопка "Оживить" на мобильных — как в чате и изображениях */}
      <div
        className={`
          md:hidden
          w-full border-none
          px-4
          pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)]
          bg-black/95 backdrop-blur-xl
          border-t border-white/10
          shadow-[0_-4px_24px_rgba(0,0,0,0.4)]
          fixed bottom-0 left-0 right-0 z-50
        `}
      >
        {/* Кнопка генерации на мобильных */}
        {isKlingModel ? (
          <>
            <button
              onClick={handleGenerate}
              disabled={!isReady || isGenerating || atLimit}
              className={`
                w-full py-4 px-6 rounded-xl font-medium text-base
                transition-all duration-300 relative overflow-hidden
                active:scale-[0.98] group
                ${isReady && !isGenerating && !atLimit
                  ? "bg-[#0070f3] hover:bg-[#0060df] text-white shadow-lg shadow-[0_0_24px_rgba(0,112,243,0.4)]"
                  : "bg-[#222] text-[#555] cursor-not-allowed"
                }
              `}
            >
              {isReady && !isGenerating && !atLimit && (
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Создаём магию...</span>
                  </>
                ) : !uploadedImage && !prompt.trim() ? (
                  <>
                    <Upload className="w-5 h-5" />
                    <span>Загрузите фото или введите промпт</span>
                  </>
                ) : !isReady ? (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Выберите анимацию или введите промпт</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Создать видео</span>
                  </>
                )}
              </span>
            </button>
            <p className="text-center text-[#555] text-xs mt-2">
              {effectiveVideoCountToday}/{limits.maxVideos} видео сегодня
            </p>
          </>
        ) : (
          <button
            onClick={() => {
              setPaywallReason("videos");
              setShowPaywall(true);
            }}
            className="
              w-full py-4 px-6 rounded-xl font-medium text-base
              transition-all duration-300 relative overflow-hidden
              active:scale-[0.98] group
              bg-gradient-to-r from-amber-500/20 to-orange-500/20
              border border-amber-500/40 text-amber-300
              hover:border-amber-500/60 hover:bg-amber-500/30
            "
          >
            <span className="relative flex items-center justify-center gap-2">
              <Crown className="w-5 h-5" />
              <span>Улучшить тариф</span>
            </span>
          </button>
        )}
      </div>

      {/* Right Panel - Preview & History — фиксированная, скроллится только контент */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0 h-full lg:h-auto lg:max-h-screen">
        <div className="space-y-6 md:space-y-8">
          {/* Main Video Player */}
          <div>
            <h3 className="font-mono text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Film className="w-4 h-4 text-[#666]" />
              Предпросмотр
            </h3>
            <VideoPlayer video={currentVideo} isGenerating={isGenerating} />
          </div>

          {/* Recent Generations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-base md:text-lg font-medium text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#666]" />
                Недавние работы
              </h3>
              {recentVideos.length > 0 && (
                <span className="text-xs text-[#666]">{recentVideos.length} видео</span>
              )}
            </div>
            
            {recentVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-[#333] flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-[#444]" />
                </div>
                <p className="text-sm text-[#666]">Анимаций пока нет</p>
                <p className="text-xs text-[#555] mt-1">
                  Загрузите портрет и выберите анимацию чтобы начать!
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                {recentVideos.map((video, index) => (
                  <Thumbnail 
                    key={video.id} 
                    video={video} 
                    index={index}
                    onClick={setCurrentVideo}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

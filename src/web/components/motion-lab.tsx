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
import { PremiumButtonWithStyles } from "./premium-button";

// Video model type
type VideoModel = "standard" | "veo";

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
    name: "Smile & Blink",
    description: "Gentle smile, natural blinks",
    icon: Smile,
    accentColor: "text-blue-400",
    bgGradient: "from-blue-500/20 to-blue-600/10",
    borderColor: "border-blue-500/40",
  },
  {
    id: "wave-hello",
    name: "Wave Hello",
    description: "Friendly wave to camera",
    icon: Hand,
    accentColor: "text-emerald-400",
    bgGradient: "from-emerald-500/20 to-emerald-600/10",
    borderColor: "border-emerald-500/40",
  },
  {
    id: "look-around",
    name: "Look Around",
    description: "Natural head movement",
    icon: Eye,
    accentColor: "text-purple-400",
    bgGradient: "from-purple-500/20 to-purple-600/10",
    borderColor: "border-purple-500/40",
  },
  {
    id: "old-film",
    name: "Old Film",
    description: "Vintage film effect",
    icon: Clapperboard,
    accentColor: "text-amber-400",
    bgGradient: "from-amber-500/20 to-amber-600/10",
    borderColor: "border-amber-500/40",
  },
];

// Video model data
const VIDEO_MODELS: {
  id: VideoModel;
  name: string;
  subtitle: string;
  isPremium: boolean;
  badge?: string;
}[] = [
  {
    id: "standard",
    name: "Standard Motion",
    subtitle: "Runway / Luma",
    isPremium: false,
  },
  {
    id: "veo",
    name: "Google Veo",
    subtitle: "Photoreal Pro",
    isPremium: true,
    badge: "Ultra Plan",
  },
];

// Video Model Selector Component
interface VideoModelSelectorProps {
  selected: VideoModel;
  onChange: (model: VideoModel) => void;
  disabled?: boolean;
  onUpgradeClick?: () => void;
}

const VideoModelSelector = ({ selected, onChange, disabled, onUpgradeClick }: VideoModelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const selectedModel = VIDEO_MODELS.find(m => m.id === selected) || VIDEO_MODELS[0];

  const handleSelect = (model: typeof VIDEO_MODELS[0]) => {
    if (model.isPremium) {
      // For premium models, show upgrade prompt
      onUpgradeClick?.();
    } else {
      onChange(model.id);
    }
    setIsOpen(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-[#888] flex items-center gap-2">
        <Film className="w-4 h-4 text-indigo-400" />
        Video Model
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
              ${selectedModel.isPremium 
                ? "bg-gradient-to-br from-amber-500/30 to-yellow-500/20" 
                : "bg-white/[0.05]"
              }
            `}>
              {selectedModel.isPremium ? (
                <Star className="w-5 h-5 text-amber-400" fill="currentColor" />
              ) : (
                <Film className="w-5 h-5 text-[#666]" />
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">{selectedModel.name}</span>
                {selectedModel.badge && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {selectedModel.badge}
                  </span>
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
                
                return (
                  <button
                    key={model.id}
                    onClick={() => handleSelect(model)}
                    className={`
                      w-full p-4 flex items-center gap-3
                      transition-all duration-200
                      ${isSelected 
                        ? "bg-indigo-500/10" 
                        : "hover:bg-white/[0.03]"
                      }
                      ${model.isPremium ? "cursor-pointer" : ""}
                    `}
                  >
                    {/* Model icon */}
                    <div className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${model.isPremium 
                        ? "bg-gradient-to-br from-amber-500/30 to-yellow-500/20" 
                        : "bg-white/[0.05]"
                      }
                    `}>
                      {model.isPremium ? (
                        <Star className="w-5 h-5 text-amber-400" fill="currentColor" />
                      ) : (
                        <Film className="w-5 h-5 text-[#666]" />
                      )}
                    </div>
                    
                    <div className="flex-1 text-left">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${model.isPremium ? "text-amber-200" : "text-white"}`}>
                          {model.isPremium && "⭐ "}{model.name}
                        </span>
                        {model.badge && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            {model.badge}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-[#666]">{model.subtitle}</span>
                    </div>

                    {/* Selected indicator or lock */}
                    {isSelected ? (
                      <div className="w-2 h-2 rounded-full bg-indigo-500" />
                    ) : model.isPremium ? (
                      <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/20">
                        <Crown className="w-3 h-3 text-amber-400" />
                        <span className="text-[10px] text-amber-400 font-medium">Upgrade</span>
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
        {selected === "veo" 
          ? "Veo offers unmatched realism for professional use"
          : "High-quality video generation with consistent results"
        }
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
            Upload a portrait to bring it to life ✨
          </p>
          <p className="text-sm text-indigo-300/70">
            Works best with front-facing photos
          </p>
          <p className="text-xs text-[#555] mt-3">
            Drag & drop or click • JPG, PNG
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
          <span className="text-sm text-emerald-400 font-medium">Photo ready</span>
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
          Change photo
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
      {[5, 10].map((duration) => (
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
          {duration}s
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
            <p className="text-white/90 text-base font-medium">Creating magic... ✨</p>
            <p className="text-indigo-300/60 text-sm mt-1">Bringing your photo to life</p>
          </div>
        </div>

        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/20 backdrop-blur-sm border border-indigo-500/30">
          <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
          <span className="text-xs text-indigo-300">Animating</span>
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
            <span className="text-xs">Save</span>
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
        
        <p className="text-[#555] text-sm">Your animated portrait will appear here</p>
      </div>

      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/[0.05]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#444]" />
        <span className="text-xs text-[#666]">Ready</span>
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
  const [selectedVideoModel, setSelectedVideoModel] = useState<VideoModel>("standard");
  
  const { checkVideoLimit, incrementVideos, canGenerateVideo, videoCount: usedVideos, limits, setShowPaywall, setPaywallReason } = useUsage();
  const atLimit = !canGenerateVideo;

  // Check if ready to generate
  const isReady = uploadedImage && selectedPreset;

  const handleVeoUpgradeClick = () => {
    setPaywallReason("videos");
    setShowPaywall(true);
  };

  const handleGenerate = async () => {
    if (!uploadedImage || !selectedPreset || isGenerating) return;
    
    // Check usage limit
    if (!checkVideoLimit()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/video/animate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: uploadedImage,
          preset: selectedPreset,
          duration,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to animate portrait");
      }

      const newVideo: GeneratedVideo = {
        id: data.id || `${Date.now()}`,
        url: data.url,
        prompt: ANIMATION_PRESETS.find(p => p.id === selectedPreset)?.name || "",
        duration,
        aspectRatio: "1:1",
        thumbnailUrl: data.thumbnailUrl,
        createdAt: new Date().toISOString(),
        preset: selectedPreset,
      };

      setCurrentVideo(newVideo);
      setRecentVideos((prev) => [newVideo, ...prev].slice(0, 6));
      
      // Increment usage
      incrementVideos();
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
      {/* Left Panel - Controls */}
      <div className="w-full lg:w-[42%] border-b lg:border-b-0 lg:border-r border-[#222] p-4 md:p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="text-center lg:text-left">
              <h2 className="font-mono text-xl md:text-2xl font-semibold text-white mb-1 flex items-center justify-center lg:justify-start gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Motion Lab
              </h2>
              <p className="text-sm text-[#666]">
                Bring your photos to life with AI magic ✨
              </p>
            </div>
            <div className="hidden lg:block pr-16">
              <PremiumButtonWithStyles />
            </div>
          </div>

          {/* Video Model Selector */}
          <VideoModelSelector
            selected={selectedVideoModel}
            onChange={setSelectedVideoModel}
            disabled={isGenerating}
            onUpgradeClick={handleVeoUpgradeClick}
          />

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Conditional: Upload or Preview + Presets */}
          {!uploadedImage ? (
            /* Step 1: Upload photo */
            <UploadDropzone 
              onImageUpload={setUploadedImage}
              disabled={isGenerating}
            />
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
                  Choose Animation
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
                <label className="text-sm font-medium text-[#888]">Duration</label>
                <DurationToggle 
                  value={duration} 
                  onChange={setDuration}
                  disabled={isGenerating}
                />
              </div>
            </>
          )}

          {/* Limit warning */}
          {atLimit && (
            <button
              onClick={() => {
                setPaywallReason("videos")
                setShowPaywall(true)
              }}
              className="
                w-full p-4 rounded-xl
                bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10
                border border-red-500/30
                flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-3
                group transition-all duration-300
                hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10
                active:scale-[0.98]
              "
            >
              <Lock className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-medium text-sm text-center">
                Video generation requires Studio plan
              </span>
              <span className="text-amber-400/60 text-xs group-hover:text-amber-400 transition-colors">
                Upgrade →
              </span>
            </button>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!isReady || isGenerating || atLimit}
            className={`
              w-full py-4 rounded-xl
              font-medium text-base
              transition-all duration-300
              relative overflow-hidden
              group
              active:scale-[0.98]
              ${isReady && !isGenerating && !atLimit
                ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                : "bg-[#222] text-[#555] cursor-not-allowed"
              }
            `}
          >
            {/* Animated shimmer effect */}
            {isReady && !isGenerating && !atLimit && (
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Creating magic...</span>
                </>
              ) : atLimit ? (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Upgrade to Animate</span>
                </>
              ) : !uploadedImage ? (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Upload Photo First</span>
                </>
              ) : !selectedPreset ? (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Choose Animation</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>✨ Bring to Life</span>
                </>
              )}
            </span>
          </button>

          {/* Tip */}
          {!uploadedImage && (
            <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center flex-shrink-0">
                <Sparkles className="w-4 h-4 text-indigo-400" />
              </div>
              <div>
                <p className="text-sm text-[#888] leading-relaxed">
                  <span className="text-indigo-300 font-medium">Tip:</span> Front-facing portrait photos work best! Clear faces with good lighting give the most magical results.
                </p>
              </div>
            </div>
          )}

          {/* Credits indicator */}
          <div 
            className={`
              flex items-center justify-center gap-2 py-3 px-4 rounded-lg border
              ${atLimit 
                ? "bg-red-500/5 border-red-500/20" 
                : "bg-white/[0.02] border-[#222]"
              }
            `}
          >
            <div className={`w-2 h-2 rounded-full ${atLimit ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
            <span className="text-xs text-[#666]">
              {atLimit ? (
                <span className="text-amber-400 font-medium">Studio plan required for video generation</span>
              ) : (
                <>
                  <span className="font-medium text-white/80">{usedVideos}/{limits.maxVideos}</span> free animations used
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel - Preview & History */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="space-y-6 md:space-y-8">
          {/* Main Video Player */}
          <div>
            <h3 className="font-mono text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Film className="w-4 h-4 text-[#666]" />
              Preview
            </h3>
            <VideoPlayer video={currentVideo} isGenerating={isGenerating} />
          </div>

          {/* Recent Generations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-base md:text-lg font-medium text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#666]" />
                Recent Creations
              </h3>
              {recentVideos.length > 0 && (
                <span className="text-xs text-[#666]">{recentVideos.length} videos</span>
              )}
            </div>
            
            {recentVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-[#333] flex items-center justify-center mb-4">
                  <Sparkles className="w-7 h-7 text-[#444]" />
                </div>
                <p className="text-sm text-[#666]">No animations yet</p>
                <p className="text-xs text-[#555] mt-1">
                  Upload a portrait and choose an animation to begin!
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

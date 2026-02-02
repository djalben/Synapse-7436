import { useState, useRef, useCallback } from "react";
import {
  Upload,
  Play,
  Clock,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Wand2,
  Film,
  ImageIcon,
  Trash2,
  Loader2,
  Lock,
  Pause,
  Download,
} from "lucide-react";
import { useUsage } from "./usage-context";

// Video generation mode type
type VideoMode = "text-to-video" | "image-to-video";

// Generated video interface
interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  duration: number;
  aspectRatio: string;
  thumbnailUrl?: string;
  createdAt: string;
  mode: VideoMode;
}

// Mode toggle component
interface ModeToggleProps {
  mode: VideoMode;
  onChange: (mode: VideoMode) => void;
}

const ModeToggle = ({ mode, onChange }: ModeToggleProps) => {
  return (
    <div className="relative flex rounded-xl bg-[#0a0a0a] border border-[#333] p-1">
      {/* Sliding background indicator */}
      <div 
        className={`
          absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg
          bg-gradient-to-r from-indigo-600/30 to-blue-600/30
          border border-indigo-500/30
          transition-transform duration-300 ease-out
          ${mode === "image-to-video" ? "translate-x-[calc(100%+8px)]" : "translate-x-0"}
        `}
      />
      
      <button
        onClick={() => onChange("text-to-video")}
        className={`
          relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
          transition-all duration-300
          ${mode === "text-to-video" ? "text-white" : "text-[#666] hover:text-[#888]"}
        `}
      >
        <Wand2 className="w-4 h-4" />
        <span className="text-sm font-medium">Text to Video</span>
      </button>
      
      <button
        onClick={() => onChange("image-to-video")}
        className={`
          relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
          transition-all duration-300
          ${mode === "image-to-video" ? "text-white" : "text-[#666] hover:text-[#888]"}
        `}
      >
        <Film className="w-4 h-4" />
        <span className="text-sm font-medium">Image to Video</span>
      </button>
    </div>
  );
};

// Enhanced image upload component
interface ImageUploadProps {
  image: string | null;
  onImageChange: (image: string | null) => void;
  required?: boolean;
  disabled?: boolean;
}

const ImageUpload = ({ image, onImageChange, required, disabled }: ImageUploadProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      onImageChange(result);
    };
    reader.readAsDataURL(file);
  }, [onImageChange]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    if (disabled) return;
    
    const file = e.dataTransfer.files[0];
    if (file) {
      handleFile(file);
    }
  }, [handleFile, disabled]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    e.target.value = "";
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange(null);
  };

  if (image) {
    return (
      <div className="relative rounded-xl overflow-hidden border border-[#333] group">
        <img 
          src={image} 
          alt="Reference" 
          className="w-full h-48 object-cover"
        />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
          <button
            onClick={handleRemove}
            disabled={disabled}
            className="
              flex items-center gap-2 px-4 py-2 rounded-lg
              bg-red-500/20 border border-red-500/40
              text-red-400 text-sm font-medium
              hover:bg-red-500/30 transition-colors
              disabled:opacity-50
            "
          >
            <Trash2 className="w-4 h-4" />
            Remove
          </button>
        </div>
        <div className="absolute top-2 left-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm flex items-center gap-1.5">
          <Film className="w-3 h-3 text-indigo-400" />
          <span className="text-xs text-indigo-400">Ready to Animate</span>
        </div>
      </div>
    );
  }

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
          relative p-8 rounded-xl
          border-2 border-dashed
          flex flex-col items-center justify-center gap-4
          cursor-pointer
          transition-all duration-300
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${isDragging 
            ? "border-indigo-500/60 bg-indigo-500/10" 
            : required 
              ? "border-amber-500/40 bg-amber-500/5 hover:border-amber-500/60 hover:bg-amber-500/10"
              : "border-[#333] bg-white/[0.02] hover:border-[#444] hover:bg-white/[0.04]"
          }
        `}
      >
        {/* Glow effect on drag */}
        {isDragging && (
          <div className="absolute inset-0 rounded-xl bg-indigo-500/10 blur-xl" />
        )}
        
        {/* Animation indicator icon */}
        <div className={`
          relative w-16 h-16 rounded-xl flex items-center justify-center
          transition-all duration-300
          ${isDragging 
            ? "bg-indigo-500/20" 
            : required 
              ? "bg-amber-500/10"
              : "bg-white/[0.05]"
          }
        `}>
          <div className="relative">
            <ImageIcon className={`
              w-7 h-7 transition-colors
              ${isDragging 
                ? "text-indigo-400" 
                : required 
                  ? "text-amber-400"
                  : "text-[#666]"
              }
            `} />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-500/80 flex items-center justify-center">
              <Play className="w-2 h-2 text-white ml-0.5" fill="white" />
            </div>
          </div>
        </div>
        
        <div className="relative text-center">
          <p className={`
            text-base font-medium
            ${required ? "text-amber-400" : "text-white/80"}
          `}>
            {required ? "Animate Your Photo" : "Upload Reference Photo"}
          </p>
          <p className={`text-sm mt-1 ${required ? "text-amber-400/70" : "text-[#666]"}`}>
            {required ? "Upload a photo to bring it to life" : "Optional: Transform your image into video"}
          </p>
          <p className="text-xs text-[#555] mt-2">
            Drag & drop or click • JPG, PNG, WebP
          </p>
        </div>
      </div>
    </>
  );
};

// Settings section component
interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection = ({ title, children, defaultOpen = true }: CollapsibleSectionProps) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-[#222] rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
      >
        <span className="text-sm font-medium text-white/90">{title}</span>
        {isOpen ? (
          <ChevronUp className="w-4 h-4 text-[#666]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[#666]" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 py-4 border-t border-[#222]">
          {children}
        </div>
      )}
    </div>
  );
};

// Duration selector
interface DurationSelectorProps {
  value: number;
  onChange: (value: number) => void;
}

const DurationSelector = ({ value, onChange }: DurationSelectorProps) => {
  const options = [5, 10];

  return (
    <div className="flex gap-2">
      {options.map((duration) => (
        <button
          key={duration}
          onClick={() => onChange(duration)}
          className={`
            flex-1 px-4 py-2.5 rounded-lg text-sm font-medium
            transition-all duration-200
            ${value === duration
              ? "bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border border-indigo-500/40 text-white"
              : "bg-white/[0.03] border border-[#333] text-[#888] hover:text-white hover:border-[#444]"
            }
          `}
        >
          {duration}s
        </button>
      ))}
    </div>
  );
};

// Aspect ratio selector
interface AspectRatioSelectorProps {
  value: string;
  onChange: (value: string) => void;
}

const AspectRatioSelector = ({ value, onChange }: AspectRatioSelectorProps) => {
  const ratios = [
    { id: "16:9", label: "16:9", width: 32, height: 18 },
    { id: "9:16", label: "9:16", width: 18, height: 32 },
    { id: "1:1", label: "1:1", width: 24, height: 24 },
  ];

  return (
    <div className="flex gap-3">
      {ratios.map((ratio) => (
        <button
          key={ratio.id}
          onClick={() => onChange(ratio.id)}
          className={`
            flex-1 flex flex-col items-center gap-2 p-3 rounded-xl
            transition-all duration-200
            ${value === ratio.id
              ? "bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border border-indigo-500/40"
              : "bg-white/[0.03] border border-[#333] hover:border-[#444]"
            }
          `}
        >
          <div 
            className={`
              bg-white/20 rounded-sm
              ${value === ratio.id ? "bg-indigo-400/40" : ""}
            `}
            style={{ width: ratio.width, height: ratio.height }}
          />
          <span className={`text-xs font-medium ${value === ratio.id ? "text-white" : "text-[#888]"}`}>
            {ratio.label}
          </span>
        </button>
      ))}
    </div>
  );
};

// Motion scale slider
interface MotionScaleSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const MotionScaleSlider = ({ value, onChange }: MotionScaleSliderProps) => {
  return (
    <div className="space-y-3">
      <div className="flex justify-between text-xs text-[#666]">
        <span>Subtle</span>
        <span className="text-white font-medium">{value}</span>
        <span>Dynamic</span>
      </div>
      <input
        type="range"
        min="1"
        max="10"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-1.5 bg-[#222] rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-gradient-to-r
          [&::-webkit-slider-thumb]:from-indigo-500
          [&::-webkit-slider-thumb]:to-blue-500
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-indigo-500/30
          [&::-webkit-slider-thumb]:transition-shadow
          [&::-webkit-slider-thumb]:hover:shadow-indigo-500/50
          [&::-moz-range-thumb]:w-4
          [&::-moz-range-thumb]:h-4
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-gradient-to-r
          [&::-moz-range-thumb]:from-indigo-500
          [&::-moz-range-thumb]:to-blue-500
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer
        "
        style={{
          background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${(value - 1) / 9 * 100}%, #222 ${(value - 1) / 9 * 100}%, #222 100%)`
        }}
      />
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
      a.download = `synapse-video-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  if (isGenerating) {
    return (
      <div 
        className="
          relative aspect-video rounded-2xl overflow-hidden
          bg-gradient-to-br from-[#0a0a0a] to-[#111]
          border border-[#222]
        "
      >
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          {/* Animated gradient background */}
          <div className="absolute inset-0 opacity-20">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/20 via-blue-500/20 to-purple-500/20 animate-pulse" />
          </div>
          
          {/* Loading spinner */}
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-white/[0.05] border border-indigo-500/30 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-white/80 text-sm font-medium">Generating your video...</p>
            <p className="text-[#555] text-xs mt-1">This may take a few minutes</p>
          </div>
        </div>

        <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-indigo-500/30">
          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          <span className="text-xs text-indigo-400">Processing</span>
        </div>
      </div>
    );
  }

  if (video) {
    return (
      <div 
        className="
          relative aspect-video rounded-2xl overflow-hidden
          bg-gradient-to-br from-[#0a0a0a] to-[#111]
          border border-[#222]
        "
      >
        <video
          ref={videoRef}
          src={video.url}
          className="w-full h-full object-cover"
          loop
          playsInline
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        {/* Controls overlay */}
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
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/[0.05]">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="text-xs text-white/80">Generated</span>
          </div>
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/[0.05] text-white/80 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="text-xs">Download</span>
          </button>
        </div>

        {/* Duration badge */}
        <div className="absolute bottom-4 right-4 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur-sm">
          <span className="text-xs font-medium text-white/90">{video.duration}s</span>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="
        relative aspect-video rounded-2xl overflow-hidden
        bg-gradient-to-br from-[#0a0a0a] to-[#111]
        border border-[#222]
      "
    >
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
        
        <p className="text-[#555] text-sm">Your video will appear here</p>
      </div>

      <div className="absolute top-4 left-4 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/[0.05]">
        <div className="w-1.5 h-1.5 rounded-full bg-[#444]" />
        <span className="text-xs text-[#666]">Ready</span>
      </div>
    </div>
  );
};

// Thumbnail component for recent generations
interface ThumbnailProps {
  video: GeneratedVideo;
  index: number;
  onClick: (video: GeneratedVideo) => void;
}

const Thumbnail = ({ video, index, onClick }: ThumbnailProps) => {
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
      {/* Video thumbnail or placeholder */}
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

      {/* Mode badge */}
      <div className="absolute top-2 left-2 px-2 py-0.5 rounded bg-black/60 backdrop-blur-sm">
        <span className="text-[10px] text-white/70">
          {video.mode === "image-to-video" ? "I2V" : "T2V"}
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
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<VideoMode>("text-to-video");
  const [duration, setDuration] = useState(5);
  const [aspectRatio, setAspectRatio] = useState("16:9");
  const [motionScale, setMotionScale] = useState(5);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);
  const [recentVideos, setRecentVideos] = useState<GeneratedVideo[]>([]);
  
  const { checkVideoLimit, incrementVideos, canGenerateVideo, videoCount: usedVideos, limits, setShowPaywall, setPaywallReason } = useUsage();
  const atLimit = !canGenerateVideo;

  // Check if ready to generate
  const isReady = mode === "text-to-video" || (mode === "image-to-video" && uploadedImage);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    // Check if image-to-video has image
    if (mode === "image-to-video" && !uploadedImage) {
      setError("Please upload a photo to animate");
      return;
    }
    
    // Check usage limit
    if (!checkVideoLimit()) return;

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch("/api/video", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          duration,
          aspectRatio,
          motionScale,
          mode,
          referenceImage: mode === "image-to-video" ? uploadedImage : null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate video");
      }

      const newVideo: GeneratedVideo = {
        id: data.id || `${Date.now()}`,
        url: data.url,
        prompt,
        duration,
        aspectRatio,
        thumbnailUrl: data.thumbnailUrl,
        createdAt: new Date().toISOString(),
        mode,
      };

      setCurrentVideo(newVideo);
      setRecentVideos((prev) => [newVideo, ...prev].slice(0, 6));
      
      // Increment usage
      incrementVideos();
      
      // Clear prompt
      setPrompt("");
    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate video");
    } finally {
      setIsGenerating(false);
    }
  };

  // Dynamic placeholder based on mode
  const getPromptPlaceholder = () => {
    if (mode === "image-to-video") {
      return "Describe the motion... (e.g., 'slowly smile and wave', 'wind blowing through hair', 'camera zoom in')";
    }
    return "Describe your video scene in detail...";
  };

  return (
    <div className="flex h-full min-h-screen">
      {/* Left Panel - Controls */}
      <div className="w-[40%] border-r border-[#222] p-6 overflow-y-auto">
        <div className="space-y-6">
          {/* Header */}
          <div>
            <h2 className="font-mono text-2xl font-semibold text-white mb-1">
              Motion Lab
            </h2>
            <p className="text-sm text-[#666]">
              Generate videos from text or animate your photos
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#888]">Generation Mode</label>
            <ModeToggle mode={mode} onChange={setMode} />
          </div>

          {/* Image Upload - Prominent in image-to-video mode */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#888]">
              {mode === "image-to-video" ? "Photo to Animate" : "Reference Image"}
              {mode === "image-to-video" && (
                <span className="text-amber-400 ml-1">*</span>
              )}
            </label>
            <ImageUpload
              image={uploadedImage}
              onImageChange={setUploadedImage}
              required={mode === "image-to-video"}
              disabled={isGenerating}
            />
          </div>

          {/* Prompt Area */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#888]">Prompt</label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={getPromptPlaceholder()}
                rows={4}
                disabled={isGenerating}
                className="
                  w-full p-4 rounded-xl
                  bg-[#0a0a0a]/80 backdrop-blur-xl
                  border border-[#333] focus:border-indigo-500/50
                  text-white placeholder-[#555]
                  text-[15px] leading-relaxed
                  resize-none outline-none
                  transition-all duration-300
                  disabled:opacity-50
                "
              />
              <div className="absolute bottom-3 right-3 text-xs text-[#555]">
                {prompt.length}/1000
              </div>
            </div>
          </div>

          {/* Settings */}
          <div className="space-y-3">
            <CollapsibleSection title="Duration">
              <DurationSelector value={duration} onChange={setDuration} />
            </CollapsibleSection>

            <CollapsibleSection title="Aspect Ratio">
              <AspectRatioSelector value={aspectRatio} onChange={setAspectRatio} />
            </CollapsibleSection>

            <CollapsibleSection title="Motion Scale">
              <MotionScaleSlider value={motionScale} onChange={setMotionScale} />
            </CollapsibleSection>
          </div>

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
                flex items-center justify-center gap-3
                group transition-all duration-300
                hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10
              "
            >
              <Lock className="w-5 h-5 text-amber-400" />
              <span className="text-amber-400 font-medium text-sm">
                Video generation requires Studio plan
              </span>
              <span className="text-amber-400/60 text-xs ml-1 group-hover:text-amber-400 transition-colors">
                Upgrade →
              </span>
            </button>
          )}

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={!prompt.trim() || isGenerating || atLimit || !isReady}
            className={`
              w-full py-4 rounded-xl
              font-medium text-base
              transition-all duration-300
              relative overflow-hidden
              group
              ${prompt.trim() && !isGenerating && !atLimit && isReady
                ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                : "bg-[#222] text-[#555] cursor-not-allowed"
              }
            `}
          >
            {/* Animated glow effect */}
            {prompt.trim() && !isGenerating && !atLimit && isReady && (
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-400/0 via-white/20 to-indigo-400/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {isGenerating ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : atLimit ? (
                <>
                  <Lock className="w-5 h-5" />
                  <span>Upgrade to Generate</span>
                </>
              ) : !isReady ? (
                <>
                  <Upload className="w-5 h-5" />
                  <span>Upload Photo First</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>{mode === "image-to-video" ? "Animate Photo" : "Generate Video"}</span>
                </>
              )}
            </span>
          </button>

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
                  <span className="font-medium text-white/80">{usedVideos}/{limits.maxVideos}</span> free videos used
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel - Preview & History */}
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="space-y-8">
          {/* Main Video Player */}
          <div>
            <h3 className="font-mono text-lg font-medium text-white mb-4">Preview</h3>
            <VideoPlayer video={currentVideo} isGenerating={isGenerating} />
          </div>

          {/* Recent Generations */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-mono text-lg font-medium text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-[#666]" />
                Recent Generations
              </h3>
              {recentVideos.length > 0 && (
                <span className="text-xs text-[#666]">{recentVideos.length} videos</span>
              )}
            </div>
            
            {recentVideos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-white/[0.02] border border-[#333] flex items-center justify-center mb-4">
                  <Film className="w-7 h-7 text-[#444]" />
                </div>
                <p className="text-sm text-[#666]">No videos generated yet</p>
                <p className="text-xs text-[#555] mt-1">
                  {mode === "image-to-video" 
                    ? "Upload a photo and describe the motion"
                    : "Enter a prompt and click Generate"
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
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

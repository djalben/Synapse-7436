import { useState, useRef, useCallback } from "react";
import {
  User,
  Video,
  Upload,
  Play,
  Pause,
  Loader2,
  X,
  Camera,
  Zap,
  AlertCircle,
  Sparkles,
  Clock,
  Trash2,
  Download,
} from "lucide-react";
import { useUsage } from "./usage-context";

// Cost for avatar generation (heavy GPU processing)
const AVATAR_COST = 30;

interface GeneratedAvatar {
  id: string;
  videoUrl: string;
  thumbnailUrl?: string;
  createdAt: string;
}

// Upload Zone Component
interface UploadZoneProps {
  type: "image" | "video";
  file: File | null;
  preview: string | null;
  onFileSelect: (file: File | null) => void;
  disabled?: boolean;
}

const UploadZone = ({ type, file, preview, onFileSelect, disabled }: UploadZoneProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const droppedFile = files[0];
      const isValid = type === "image" 
        ? droppedFile.type.startsWith("image/")
        : droppedFile.type.startsWith("video/");
      
      if (isValid) {
        onFileSelect(droppedFile);
      }
    }
  }, [type, onFileSelect, disabled]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFileSelect(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const acceptTypes = type === "image" 
    ? "image/jpeg,image/png,image/webp" 
    : "video/mp4,video/mov,video/webm";

  const Icon = type === "image" ? User : Video;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <Icon className="w-4 h-4 text-indigo-400" />
          {type === "image" ? "Целевое лицо" : "Управляющее видео"}
        </h3>
        {file && (
          <button
            onClick={handleRemove}
            className="text-xs text-[#666] hover:text-red-400 transition-colors flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" />
            Удалить
          </button>
        )}
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && fileInputRef.current?.click()}
        className={`
          relative rounded-xl border-2 border-dashed
          transition-all duration-300 cursor-pointer overflow-hidden
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${isDragging 
            ? "border-indigo-500 bg-indigo-500/10" 
            : file 
              ? "border-emerald-500/40 bg-emerald-500/5" 
              : "border-[#333] hover:border-[#444] bg-white/[0.02]"
          }
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptTypes}
          onChange={handleFileChange}
          className="hidden"
          disabled={disabled}
        />

        {preview ? (
          <div className="relative aspect-video">
            {type === "image" ? (
              <img 
                src={preview} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            ) : (
              <video 
                src={preview} 
                className="w-full h-full object-cover"
                controls
                muted
              />
            )}
            {/* Overlay gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-3 left-3 right-3">
              <p className="text-xs text-white/80 truncate">{file?.name}</p>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className={`
              w-14 h-14 rounded-xl mx-auto mb-4 flex items-center justify-center
              ${isDragging 
                ? "bg-indigo-500/20" 
                : "bg-white/[0.03] border border-[#333]"
              }
            `}>
              {type === "image" ? (
                <User className={`w-7 h-7 ${isDragging ? "text-indigo-400" : "text-[#555]"}`} />
              ) : (
                <Video className={`w-7 h-7 ${isDragging ? "text-indigo-400" : "text-[#555]"}`} />
              )}
            </div>
            <p className="text-sm text-white font-medium">
              {type === "image" 
                ? "Загрузите портретное фото" 
                : "Загрузите управляющее видео"
              }
            </p>
            <p className="text-xs text-[#666] mt-2">
              {type === "image"
                ? "JPG, PNG • Фронтальное, хорошее освещение"
                : "MP4, MOV, WEBM • 1-10 секунд"
              }
            </p>
          </div>
        )}
      </div>

      {/* Tips */}
      <p className="text-xs text-[#555] flex items-start gap-1.5">
        <Sparkles className="w-3 h-3 mt-0.5 text-indigo-500/60" />
        {type === "image"
          ? "Лучшие результаты с фронтальными, хорошо освещёнными фото"
          : "Короткие клипы с чёткими движениями лица работают лучше всего"
        }
      </p>
    </div>
  );
};

// Record Camera Button (mock)
const RecordCameraButton = () => {
  const handleClick = () => {
    // Show toast - feature coming soon
    alert("Запись с камеры скоро будет доступна!");
  };

  return (
    <button
      onClick={handleClick}
      className="w-full py-3 px-4 rounded-xl border border-[#333] bg-white/[0.02] hover:bg-white/[0.04] transition-all flex items-center justify-center gap-2 group"
    >
      <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
      <Camera className="w-4 h-4 text-[#888] group-hover:text-white transition-colors" />
      <span className="text-sm text-[#888] group-hover:text-white transition-colors">
        Записать с камеры
      </span>
    </button>
  );
};

// Video Output Player
interface VideoOutputProps {
  video: GeneratedAvatar | null;
  isGenerating: boolean;
}

const VideoOutput = ({ video, isGenerating }: VideoOutputProps) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="bg-white/[0.02] border border-[#333] rounded-2xl overflow-hidden">
      {/* Video Area */}
      <div className="relative aspect-video bg-black/40">
        {isGenerating ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-indigo-500/20 rounded-full blur-xl animate-pulse" />
              <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
            </div>
            <div className="text-center">
              <p className="text-sm text-white font-medium">Генерация аватара...</p>
              <p className="text-xs text-[#666] mt-1">Это может занять до минуты</p>
            </div>
            {/* Progress indicator */}
            <div className="w-48 h-1 bg-white/[0.05] rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full animate-pulse"
                style={{ width: "60%" }}
              />
            </div>
          </div>
        ) : video ? (
          <>
            <video
              ref={videoRef}
              src={video.videoUrl}
              className="w-full h-full object-contain"
              loop
              onEnded={() => setIsPlaying(false)}
            />
            {/* Play overlay */}
            {!isPlaying && (
              <button
                onClick={handlePlayPause}
                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/20 transition-colors group"
              >
                <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Play className="w-7 h-7 text-white ml-1" />
                </div>
              </button>
            )}
            {/* Controls overlay when playing */}
            {isPlaying && (
              <button
                onClick={handlePlayPause}
                className="absolute bottom-4 left-4 p-3 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                <Pause className="w-5 h-5 text-white" />
              </button>
            )}
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-[#222] flex items-center justify-center mb-4">
              <User className="w-8 h-8 text-[#444]" />
            </div>
            <p className="text-sm text-[#666]">Ваш анимированный аватар появится здесь</p>
            <p className="text-xs text-[#444] mt-1">Загрузите лицо и управляющее видео чтобы начать</p>
          </div>
        )}
      </div>

      {/* Download button if video exists */}
      {video && !isGenerating && (
        <div className="p-4 border-t border-[#222]">
          <button className="w-full py-3 px-4 rounded-xl bg-white/[0.03] border border-[#333] hover:bg-white/[0.05] transition-all flex items-center justify-center gap-2 text-[#888] hover:text-white">
            <Download className="w-4 h-4" />
            <span className="text-sm">Скачать видео</span>
          </button>
        </div>
      )}
    </div>
  );
};

// Recent Generations Grid
interface RecentGenerationsProps {
  generations: GeneratedAvatar[];
  onSelect: (avatar: GeneratedAvatar) => void;
}

const RecentGenerations = ({ generations, onSelect }: RecentGenerationsProps) => {
  if (generations.length === 0) return null;

  return (
    <div className="bg-white/[0.02] border border-[#333] rounded-2xl p-5">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#666]" />
        Недавние генерации
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {generations.map((gen) => (
          <button
            key={gen.id}
            onClick={() => onSelect(gen)}
            className="relative aspect-video rounded-lg overflow-hidden group border border-[#222] hover:border-indigo-500/50 transition-colors"
          >
            <video
              src={gen.videoUrl}
              className="w-full h-full object-cover"
              muted
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Play className="w-6 h-6 text-white" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Main Avatar Studio Component
export const AvatarStudio = () => {
  const { creditBalance, deductCredits, setShowPaywall, setPaywallReason } = useUsage();
  
  const [targetImage, setTargetImage] = useState<File | null>(null);
  const [targetPreview, setTargetPreview] = useState<string | null>(null);
  const [drivingVideo, setDrivingVideo] = useState<File | null>(null);
  const [drivingPreview, setDrivingPreview] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentVideo, setCurrentVideo] = useState<GeneratedAvatar | null>(null);
  const [recentGenerations, setRecentGenerations] = useState<GeneratedAvatar[]>([]);

  // Handle image file selection
  const handleImageSelect = (file: File | null) => {
    setTargetImage(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setTargetPreview(url);
    } else {
      setTargetPreview(null);
    }
  };

  // Handle video file selection
  const handleVideoSelect = (file: File | null) => {
    setDrivingVideo(file);
    if (file) {
      const url = URL.createObjectURL(file);
      setDrivingPreview(url);
    } else {
      setDrivingPreview(null);
    }
  };

  // Check if can generate
  const canGenerate = targetImage && drivingVideo && !isGenerating;
  const hasEnoughCredits = creditBalance >= AVATAR_COST;

  // Handle generate
  const handleGenerate = async () => {
    if (!canGenerate) return;

    if (!hasEnoughCredits) {
      setPaywallReason("credits");
      setShowPaywall(true);
      return;
    }

    setIsGenerating(true);

    try {
      // Create form data
      const formData = new FormData();
      formData.append("targetImage", targetImage);
      formData.append("drivingVideo", drivingVideo);

      // Call API
      const response = await fetch("/api/avatar", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate avatar");
      }

      // Spend credits
      deductCredits(AVATAR_COST);

      // Create generated avatar object
      const newAvatar: GeneratedAvatar = {
        id: Date.now().toString(),
        videoUrl: data.videoUrl || "/sample-avatar.mp4",
        createdAt: new Date().toISOString(),
      };

      setCurrentVideo(newAvatar);
      setRecentGenerations((prev) => [newAvatar, ...prev].slice(0, 6));
    } catch (error) {
      console.error("Avatar generation error:", error);
      alert(error instanceof Error ? error.message : "Failed to generate avatar");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="px-4 md:px-8 pt-6 md:pt-8 pb-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl blur-lg opacity-50" />
                  <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <User className="w-5 h-5 text-white" />
                  </div>
                </div>
                Аватары
              </h1>
              <p className="text-[#888] mt-2 text-sm md:text-base">
                Создавайте гиперреалистичные AI-персонажи с анимацией лица.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 md:px-8 pb-8">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left Panel - Inputs */}
            <div className="lg:col-span-5 space-y-6">
              {/* Target Face Upload */}
              <div className="bg-white/[0.02] border border-[#333] rounded-2xl p-5">
                <UploadZone
                  type="image"
                  file={targetImage}
                  preview={targetPreview}
                  onFileSelect={handleImageSelect}
                  disabled={isGenerating}
                />
              </div>

              {/* Driving Video Upload */}
              <div className="bg-white/[0.02] border border-[#333] rounded-2xl p-5 space-y-4">
                <UploadZone
                  type="video"
                  file={drivingVideo}
                  preview={drivingPreview}
                  onFileSelect={handleVideoSelect}
                  disabled={isGenerating}
                />
                
                {/* Divider */}
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px bg-[#333]" />
                  <span className="text-xs text-[#555]">ИЛИ</span>
                  <div className="flex-1 h-px bg-[#333]" />
                </div>

                {/* Record Camera Button */}
                <RecordCameraButton />
              </div>

              {/* Generate Button */}
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || !hasEnoughCredits}
                className={`
                  w-full py-4 px-6 rounded-xl font-medium text-base
                  flex items-center justify-center gap-3
                  transition-all duration-300
                  ${canGenerate && hasEnoughCredits
                    ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 hover:from-indigo-500 hover:via-blue-500 hover:to-indigo-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40"
                    : "bg-white/[0.03] border border-[#333] text-[#555] cursor-not-allowed"
                  }
                `}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Обработка... Это может занять минуту
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5" />
                    Анимировать персонажа
                  </>
                )}
              </button>

              {/* Cost Warning */}
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <p className="text-xs text-amber-400/80">
                  Стоимость: ~{AVATAR_COST} кредитов за генерацию (Тяжёлая GPU обработка)
                </p>
              </div>

              {/* Credits status */}
              {!hasEnoughCredits && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/5 border border-red-500/20">
                  <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-400/80">
                    Недостаточно кредитов. У вас {creditBalance.toFixed(1)} кредитов, нужно {AVATAR_COST}.
                  </p>
                </div>
              )}
            </div>

            {/* Right Panel - Output */}
            <div className="lg:col-span-7 space-y-6">
              {/* Video Output */}
              <VideoOutput video={currentVideo} isGenerating={isGenerating} />

              {/* Recent Generations */}
              <RecentGenerations 
                generations={recentGenerations}
                onSelect={setCurrentVideo}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

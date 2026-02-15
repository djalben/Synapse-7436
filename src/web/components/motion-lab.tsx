import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  Play,
  Clock,
  Sparkles,
  Film,
  Loader2,
  Pause,
  Download,
  ImageIcon,
  X,
  ChevronDown,
  Wand2,
  Camera,
  Type,
  Image as ImageLucide,
  Monitor,
  Smartphone,
  Square,
  Move,
  ZoomIn,
  RotateCcw,
  ArrowUp,
  Minus,
} from "lucide-react";
import { useUsage } from "./usage-context";
import { addToHistory } from "./placeholder-pages";

// ─── Types ───
type VideoMode = "text" | "image";
type VideoModelId = "wan-2.2" | "kling-2.6" | "veo-3.1";
type AspectRatio = "16:9" | "9:16" | "1:1";
type CameraMotion = "static" | "zoom-in" | "zoom-out" | "pan" | "orbit" | "tilt";

interface GeneratedVideo {
  id: string;
  url: string;
  prompt: string;
  model: string;
  aspectRatio: string;
  createdAt: string;
}

// ─── Model data ───
interface VideoModelData {
  id: VideoModelId;
  name: string;
  subtitle: string;
  accent: string;
  bgClass: string;
  supportsImage: boolean;
}

const VIDEO_MODELS: VideoModelData[] = [
  { id: "wan-2.2", name: "Wan 2.2 Fast", subtitle: "Быстрый • ~30 сек", accent: "text-emerald-400", bgClass: "from-emerald-500/20 to-emerald-600/10", supportsImage: true },
  { id: "kling-2.6", name: "Kling 2.6 Pro", subtitle: "Качество • ~2 мин", accent: "text-blue-400", bgClass: "from-blue-500/20 to-blue-600/10", supportsImage: true },
  { id: "veo-3.1", name: "Google Veo 3.1", subtitle: "Флагман • аудио", accent: "text-purple-400", bgClass: "from-purple-500/20 to-purple-600/10", supportsImage: false },
];

const ASPECT_RATIOS: { id: AspectRatio; label: string; icon: typeof Monitor }[] = [
  { id: "16:9", label: "Кино", icon: Monitor },
  { id: "9:16", label: "TikTok", icon: Smartphone },
  { id: "1:1", label: "Квадрат", icon: Square },
];

const CAMERA_MOTIONS: { id: CameraMotion; label: string; icon: typeof Minus }[] = [
  { id: "static", label: "Статично", icon: Minus },
  { id: "zoom-in", label: "Приближение", icon: ZoomIn },
  { id: "zoom-out", label: "Удаление", icon: Move },
  { id: "pan", label: "Панорама", icon: RotateCcw },
  { id: "orbit", label: "Облёт", icon: RotateCcw },
  { id: "tilt", label: "Наклон", icon: ArrowUp },
];

// ─── Progress steps for smart button ───
const PROGRESS_STEPS = [
  { pct: 10, label: "Отправка..." },
  { pct: 30, label: "В очереди..." },
  { pct: 80, label: "Генерация..." },
  { pct: 100, label: "Готово!" },
];

// ─── Upload Dropzone ───
const UploadDropzone = ({ onUpload, disabled }: { onUpload: (img: string) => void; disabled?: boolean }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handle = useCallback((f: File) => {
    if (!f.type.startsWith("image/")) return;
    const r = new FileReader();
    r.onload = (e) => onUpload(e.target?.result as string);
    r.readAsDataURL(f);
  }, [onUpload]);

  return (
    <>
      <input ref={ref} type="file" accept="image/*" className="hidden"
        onChange={(e) => { if (e.target.files?.[0]) handle(e.target.files[0]); e.target.value = ""; }} />
      <div
        onClick={() => !disabled && ref.current?.click()}
        onDrop={(e) => { e.preventDefault(); setDrag(false); if (!disabled && e.dataTransfer.files[0]) handle(e.dataTransfer.files[0]); }}
        onDragOver={(e) => { e.preventDefault(); if (!disabled) setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        className={`
          relative p-8 rounded-2xl border-2 border-dashed cursor-pointer
          flex flex-col items-center justify-center gap-4
          transition-all duration-300
          ${disabled ? "opacity-50 cursor-not-allowed" : ""}
          ${drag
            ? "border-indigo-400/60 bg-indigo-500/10 scale-[1.01]"
            : "border-[#333] bg-white/[0.02] hover:border-indigo-500/30"
          }
        `}
      >
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/10 border border-indigo-500/20 flex items-center justify-center">
          <ImageIcon className="w-7 h-7 text-indigo-400/80" />
        </div>
        <div className="text-center">
          <p className="text-base font-medium text-white/80">Загрузите фото</p>
          <p className="text-xs text-[#555] mt-1">JPG, PNG • Перетащите или нажмите</p>
        </div>
      </div>
    </>
  );
};

// ─── Video Player ───
const VideoPlayer = ({ video, isGenerating, progress }: {
  video: GeneratedVideo | null;
  isGenerating: boolean;
  progress: number;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause(); else videoRef.current.play();
    setPlaying(!playing);
  };

  const handleDownload = async () => {
    if (!video) return;
    try {
      const res = await fetch(video.url);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synapse-video-${video.id}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Download failed:", err);
    }
  };

  // Generating state
  if (isGenerating) {
    const stepLabel = PROGRESS_STEPS.find(s => s.pct >= progress)?.label || "Генерация...";
    return (
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#111] border border-[#222]">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-blue-500/5 animate-pulse" />
          <div className="relative">
            <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-xl animate-pulse" />
            <div className="relative w-20 h-20 rounded-full bg-white/[0.05] border border-indigo-500/40 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-indigo-400 animate-spin" />
            </div>
          </div>
          <div className="relative text-center">
            <p className="text-white/90 font-medium">{stepLabel}</p>
            <p className="text-indigo-300/50 text-sm mt-1">{progress}%</p>
          </div>
          <div className="relative w-48 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-1000"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Video loaded
  if (video) {
    return (
      <div className="relative aspect-video rounded-2xl overflow-hidden bg-[#0a0a0a] border border-[#222]">
        <video
          ref={videoRef}
          src={video.url}
          className="w-full h-full object-cover"
          loop
          playsInline
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        />
        <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/30">
          <button
            onClick={togglePlay}
            className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            {playing
              ? <Pause className="w-5 h-5 text-white" fill="white" />
              : <Play className="w-5 h-5 text-white ml-0.5" fill="white" />
            }
          </button>
        </div>
        <div className="absolute top-3 right-3">
          <button
            onClick={handleDownload}
            className="px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm border border-white/10 text-white/80 hover:text-white text-xs flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-3 h-3" /> Скачать
          </button>
        </div>
      </div>
    );
  }

  // Empty state
  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden bg-gradient-to-br from-[#0a0a0a] to-[#111] border border-[#222]">
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-full bg-white/[0.03] border border-white/10 flex items-center justify-center">
          <Play className="w-7 h-7 text-white/30 ml-0.5" />
        </div>
        <p className="text-[#555] text-sm">Ваше видео появится здесь</p>
      </div>
    </div>
  );
};

// ─── Pill Toggle ───
function PillToggle<T extends string>({ options, value, onChange, disabled }: {
  options: { id: T; label: string; icon: typeof Type }[];
  value: T;
  onChange: (v: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex gap-1 p-1 rounded-xl bg-white/[0.04] border border-[#222]">
      {options.map(o => {
        const Icon = o.icon;
        const active = value === o.id;
        return (
          <button
            key={o.id}
            onClick={() => !disabled && onChange(o.id)}
            disabled={disabled}
            className={`
              flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
              transition-all duration-200 disabled:opacity-50
              ${active
                ? "bg-indigo-500/20 text-white border border-indigo-500/30"
                : "text-[#666] hover:text-white hover:bg-white/[0.04]"
              }
            `}
          >
            <Icon className="w-3.5 h-3.5" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Main MotionLab component ───
export const MotionLab = () => {
  const [mode, setMode] = useState<VideoMode>("text");
  const [model, setModel] = useState<VideoModelId>("wan-2.2");
  const [aspect, setAspect] = useState<AspectRatio>("16:9");
  const [camera, setCamera] = useState<CameraMotion>("static");
  const [magicPrompt, setMagicPrompt] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [currentVideo, setCurrentVideo] = useState<GeneratedVideo | null>(null);
  const [recentVideos, setRecentVideos] = useState<GeneratedVideo[]>([]);
  const [modelOpen, setModelOpen] = useState(false);
  const modelRef = useRef<HTMLDivElement>(null);

  const { checkVideoLimit, incrementVideoDaily, limits, effectiveVideoCountToday } = useUsage();
  const selectedModel = VIDEO_MODELS.find(m => m.id === model) || VIDEO_MODELS[0];
  const isReady = prompt.trim().length > 0 && (mode === "text" || uploadedImage);

  // Close model dropdown on outside click
  useEffect(() => {
    if (!modelOpen) return;
    const close = (e: MouseEvent) => {
      if (modelRef.current && !modelRef.current.contains(e.target as Node)) setModelOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [modelOpen]);

  // If model doesn't support image mode, switch to text
  useEffect(() => {
    if (mode === "image" && !selectedModel.supportsImage) setMode("text");
  }, [model, mode, selectedModel.supportsImage]);

  // Progress simulation
  const simulateProgress = useCallback(() => {
    setProgress(10);
    const timers = [
      setTimeout(() => setProgress(30), 3000),
      setTimeout(() => setProgress(50), 8000),
      setTimeout(() => setProgress(80), 15000),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  // Poll for video status
  const pollForVideo = async (taskId: string): Promise<string> => {
    for (let i = 0; i < 120; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/video/status/${encodeURIComponent(taskId)}`);
        const data = await res.json() as { status: string; url?: string; error?: string };
        if (data.status === "completed" && data.url) return data.url;
        if (data.status === "failed") throw new Error(data.error || "Генерация не удалась.");
      } catch (err) {
        if (err instanceof Error && err.message.includes("не удалась")) throw err;
      }
    }
    throw new Error("Таймаут генерации. Попробуйте снова.");
  };

  const handleGenerate = async () => {
    if (!isReady || isGenerating) return;
    if (!checkVideoLimit()) return;

    setIsGenerating(true);
    setError(null);
    setProgress(0);
    const cleanupProgress = simulateProgress();

    try {
      const res = await fetch("/api/video/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt.trim(),
          model,
          mode,
          image: mode === "image" ? uploadedImage : undefined,
          aspectRatio: aspect,
          cameraMotion: camera,
          magicPrompt,
          duration: 5,
        }),
      });

      const data = await res.json() as {
        id?: string;
        status?: string;
        url?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(data.error || "Ошибка генерации");

      let videoUrl = data.url;
      if (!videoUrl && data.id && data.status === "processing") {
        videoUrl = await pollForVideo(data.id);
      }
      if (!videoUrl) throw new Error("Нет URL видео.");

      setProgress(100);
      const newVideo: GeneratedVideo = {
        id: data.id || `${Date.now()}`,
        url: videoUrl,
        prompt: prompt.trim(),
        model: selectedModel.name,
        aspectRatio: aspect,
        createdAt: new Date().toISOString(),
      };
      setCurrentVideo(newVideo);
      setRecentVideos(prev => [newVideo, ...prev].slice(0, 8));
      incrementVideoDaily();
      addToHistory({
        type: "video",
        prompt: newVideo.prompt,
        model: newVideo.model,
        result: newVideo.url,
        credits: 0,
      });
    } catch (err) {
      console.error("Video generation error:", err);
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      cleanupProgress();
      setIsGenerating(false);
      setTimeout(() => setProgress(0), 2000);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-screen">
      {/* ─── Left Panel: Controls ─── */}
      <div className="w-full lg:w-[42%] border-b lg:border-b-0 lg:border-r border-[#222] flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto p-4 md:p-6 pb-36 md:pb-6">
          <div className="space-y-5">

            {/* Header */}
            <div>
              <h2 className="font-mono text-xl font-semibold text-white flex items-center gap-2">
                <Film className="w-5 h-5 text-indigo-400" />
                Видео
              </h2>
              <p className="text-sm text-[#555] mt-1">Создавайте видео с помощью AI</p>
            </div>

            {/* Mode Toggle */}
            <PillToggle
              options={[
                { id: "text" as VideoMode, label: "Текст в Видео", icon: Type },
                { id: "image" as VideoMode, label: "Фото в Видео", icon: ImageLucide },
              ]}
              value={mode}
              onChange={setMode}
              disabled={isGenerating}
            />

            {/* Model Selector */}
            <div className="space-y-1.5" ref={modelRef}>
              <label className="text-xs font-medium text-[#888]">Модель AI</label>
              <div className="relative">
                <button
                  onClick={() => !isGenerating && setModelOpen(!modelOpen)}
                  disabled={isGenerating}
                  className={`
                    w-full p-3 rounded-xl bg-[#0a0a0a]/80 border text-left
                    flex items-center justify-between transition-all duration-200
                    disabled:opacity-50
                    ${modelOpen ? "border-indigo-500/50" : "border-[#333] hover:border-[#444]"}
                  `}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${selectedModel.bgClass} flex items-center justify-center`}>
                      <Film className={`w-4 h-4 ${selectedModel.accent}`} />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-white">{selectedModel.name}</span>
                      <span className="text-xs text-[#555] block">{selectedModel.subtitle}</span>
                    </div>
                  </div>
                  <ChevronDown className={`w-4 h-4 text-[#555] transition-transform ${modelOpen ? "rotate-180" : ""}`} />
                </button>

                {modelOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 bg-[#0a0a0a]/95 backdrop-blur-xl border border-[#333] rounded-xl shadow-2xl overflow-hidden">
                    {VIDEO_MODELS.map(m => (
                      <button
                        key={m.id}
                        onClick={() => { setModel(m.id); setModelOpen(false); }}
                        className={`
                          w-full p-3 flex items-center gap-3 transition-colors
                          ${m.id === model ? "bg-indigo-500/10" : "hover:bg-white/[0.03]"}
                        `}
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${m.bgClass} flex items-center justify-center`}>
                          <Film className={`w-4 h-4 ${m.accent}`} />
                        </div>
                        <div className="text-left">
                          <span className="text-sm font-medium text-white">{m.name}</span>
                          <span className="text-xs text-[#555] block">{m.subtitle}</span>
                          {!m.supportsImage && <span className="text-[10px] text-amber-400">Только текст</span>}
                        </div>
                        {m.id === model && <div className="ml-auto w-2 h-2 rounded-full bg-indigo-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Photo Upload (image mode) */}
            {mode === "image" && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-[#888]">Исходное фото</label>
                {uploadedImage ? (
                  <div className="relative rounded-xl overflow-hidden border border-[#333]">
                    <img src={uploadedImage} alt="Source" className="w-full h-40 object-cover" />
                    <button
                      onClick={() => setUploadedImage(null)}
                      disabled={isGenerating}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 text-white/70 hover:text-white transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <UploadDropzone onUpload={setUploadedImage} disabled={isGenerating} />
                )}
              </div>
            )}

            {/* Prompt */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Описание сцены</label>
              <div className="relative">
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
                  placeholder={mode === "image" ? "Опишите движение для фото..." : "Опишите сцену для видео..."}
                  rows={3}
                  disabled={isGenerating}
                  className="
                    w-full p-3 rounded-xl bg-[#0a0a0a]/80 border border-[#333]
                    focus:border-indigo-500/50 text-white placeholder-[#555]
                    text-sm resize-none outline-none transition-all disabled:opacity-50
                  "
                  style={{ fontSize: '16px' }}
                />
                <div className="absolute bottom-2.5 right-3 text-[10px] text-[#555]">
                  {prompt.length}/500
                </div>
              </div>
            </div>

            {/* Aspect Ratio */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888]">Формат</label>
              <div className="flex gap-2">
                {ASPECT_RATIOS.map(ar => {
                  const Icon = ar.icon;
                  const active = aspect === ar.id;
                  return (
                    <button
                      key={ar.id}
                      onClick={() => setAspect(ar.id)}
                      disabled={isGenerating}
                      className={`
                        flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
                        text-xs font-medium transition-all disabled:opacity-50
                        ${active
                          ? "bg-indigo-500/15 border border-indigo-500/30 text-white"
                          : "bg-white/[0.03] border border-[#333] text-[#666] hover:text-white"
                        }
                      `}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {ar.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Camera Motion */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[#888] flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-400" />
                Движение камеры
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {CAMERA_MOTIONS.map(cm => {
                  const Icon = cm.icon;
                  const active = camera === cm.id;
                  return (
                    <button
                      key={cm.id}
                      onClick={() => setCamera(cm.id)}
                      disabled={isGenerating}
                      className={`
                        flex items-center justify-center gap-1 py-2 rounded-lg
                        text-[11px] font-medium transition-all disabled:opacity-50
                        ${active
                          ? "bg-indigo-500/15 border border-indigo-500/30 text-white"
                          : "bg-white/[0.03] border border-[#222] text-[#666] hover:text-white"
                        }
                      `}
                    >
                      <Icon className="w-3 h-3" />
                      {cm.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Magic Prompt Toggle */}
            <button
              onClick={() => setMagicPrompt(!magicPrompt)}
              disabled={isGenerating}
              className={`
                w-full flex items-center gap-3 p-3 rounded-xl border transition-all disabled:opacity-50
                ${magicPrompt
                  ? "bg-amber-500/10 border-amber-500/30"
                  : "bg-white/[0.02] border-[#222] hover:border-[#333]"
                }
              `}
            >
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${magicPrompt ? "bg-amber-500/20" : "bg-white/[0.05]"}`}>
                <Wand2 className={`w-4 h-4 ${magicPrompt ? "text-amber-400" : "text-[#555]"}`} />
              </div>
              <div className="flex-1 text-left">
                <span className={`text-sm font-medium ${magicPrompt ? "text-amber-200" : "text-[#888]"}`}>Magic Prompt</span>
                <span className="text-[10px] text-[#555] block">Авто-улучшение через GPT-4o mini</span>
              </div>
              <div className={`w-9 h-5 rounded-full transition-colors relative ${magicPrompt ? "bg-amber-500" : "bg-[#333]"}`}>
                <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${magicPrompt ? "left-[18px]" : "left-0.5"}`} />
              </div>
            </button>

            {/* Error */}
            {error && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Generate Button — desktop sticky */}
            <div className="hidden md:block sticky bottom-0 z-50 pt-2 pb-2 -mx-6 px-6 bg-black">
              <button
                onClick={handleGenerate}
                disabled={!isReady || isGenerating}
                className={`
                  w-full py-3.5 rounded-xl font-medium text-sm transition-all duration-300
                  relative overflow-hidden active:scale-[0.98] group
                  ${isReady && !isGenerating
                    ? "bg-[#0070f3] hover:bg-[#0060df] text-white shadow-lg shadow-[0_0_20px_rgba(0,112,243,0.3)]"
                    : "bg-[#222] text-[#555] cursor-not-allowed"
                  }
                `}
              >
                {isGenerating && (
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600">
                    <div
                      className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-1000"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
                <span className="relative flex items-center justify-center gap-2">
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {PROGRESS_STEPS.find(s => s.pct >= progress)?.label || "Генерация..."} {progress}%
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      Создать видео
                    </>
                  )}
                </span>
              </button>
              <p className="text-center text-[#555] text-xs mt-2">
                {effectiveVideoCountToday}/{limits.maxVideos} видео сегодня
              </p>
            </div>

          </div>
        </div>
      </div>

      {/* Mobile fixed button */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] bg-black/95 backdrop-blur-xl border-t border-white/10">
        <button
          onClick={handleGenerate}
          disabled={!isReady || isGenerating}
          className={`
            w-full py-3.5 rounded-xl font-medium text-sm transition-all
            relative overflow-hidden active:scale-[0.98]
            ${isReady && !isGenerating
              ? "bg-[#0070f3] text-white shadow-lg"
              : "bg-[#222] text-[#555] cursor-not-allowed"
            }
          `}
        >
          {isGenerating && (
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-blue-600">
              <div
                className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-1000"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          <span className="relative flex items-center justify-center gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {progress}%
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Создать видео
              </>
            )}
          </span>
        </button>
      </div>

      {/* ─── Right Panel: Preview & History ─── */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0">
        <div className="space-y-6">
          {/* Preview */}
          <div>
            <h3 className="font-mono text-lg font-medium text-white mb-4 flex items-center gap-2">
              <Film className="w-4 h-4 text-[#666]" />
              Предпросмотр
            </h3>
            <VideoPlayer video={currentVideo} isGenerating={isGenerating} progress={progress} />
          </div>

          {/* Recent */}
          <div>
            <h3 className="font-mono text-base font-medium text-white mb-4 flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#666]" />
              Недавние
            </h3>
            {recentVideos.length === 0 ? (
              <div className="flex flex-col items-center py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-white/[0.02] border border-[#333] flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-[#444]" />
                </div>
                <p className="text-sm text-[#555]">Видео пока нет</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {recentVideos.map((v, i) => (
                  <div
                    key={v.id}
                    onClick={() => setCurrentVideo(v)}
                    className="
                      relative aspect-video rounded-xl overflow-hidden bg-[#111]
                      border border-[#222] hover:border-[#444]
                      cursor-pointer group transition-all
                    "
                  >
                    <div
                      className="absolute inset-0 opacity-30 group-hover:opacity-50 transition-opacity"
                      style={{
                        background: `linear-gradient(${135 + i * 45}deg, rgba(99,102,241,0.3), rgba(139,92,246,0.3))`,
                      }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                        <Play className="w-4 h-4 text-white ml-0.5" fill="white" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2">
                      <p className="text-[10px] text-white/70 truncate">{v.prompt}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

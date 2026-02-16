import { useState, useRef, useCallback, useEffect } from "react";
import {
  Music,
  Mic,
  Play,
  Pause,
  Download,
  Upload,
  Plus,
  Sparkles,
  Clock,
  Wand2,
  Volume2,
  X,
  Check,
  Loader2,
  Crown,
} from "lucide-react";
import { useUsage } from "./usage-context";
import { addToHistory } from "./placeholder-pages";

type AudioMode = "music" | "voice";
type Duration = "30s" | "60s" | "2min";
type VocalGender = "male" | "female";
type SongLanguage = "ru" | "en";

interface Voice {
  id: string;
  name: string;
  type: "preset" | "cloned";
}

const presetVoices: Voice[] = [
  { id: "male-professional", name: "Мужской - Профессиональный", type: "preset" },
  { id: "male-casual", name: "Мужской - Повседневный", type: "preset" },
  { id: "female-professional", name: "Женский - Профессиональный", type: "preset" },
  { id: "female-warm", name: "Женский - Тёплый", type: "preset" },
  { id: "robot-futuristic", name: "Робот - Футуристичный", type: "preset" },
];

const genres = ["Поп", "Электроника", "Хип-Хоп", "Классика", "Рок", "Джаз", "Эмбиент"];

interface GeneratedAudio {
  id: string;
  type: "music" | "voice";
  prompt?: string;
  lyrics?: string;
  text?: string;
  duration: string;
  createdAt: Date;
  audioUrl?: string;
}

// Waveform visualization component
const WaveformVisualizer = ({ isPlaying }: { isPlaying: boolean }) => {
  return (
    <div className="flex items-center justify-center gap-[2px] h-16">
      {Array.from({ length: 48 }).map((_, i) => (
        <div
          key={i}
          className={`
            w-1 rounded-full bg-gradient-to-t from-indigo-500 to-blue-500
            transition-all duration-150
          `}
          style={{
            height: isPlaying
              ? `${20 + Math.sin(i * 0.3 + Date.now() * 0.005) * 20 + Math.random() * 20}%`
              : `${15 + Math.sin(i * 0.5) * 10}%`,
            opacity: isPlaying ? 0.8 + Math.sin(i * 0.2) * 0.2 : 0.4,
            animationDelay: `${i * 50}ms`,
          }}
        />
      ))}
    </div>
  );
};

// Audio Player component with real <audio> element
const AudioPlayer = ({ 
  audio, 
  isPlaying, 
  onPlayPause,
  onEnded,
}: { 
  audio: GeneratedAudio | null; 
  isPlaying: boolean;
  onPlayPause: () => void;
  onEnded: () => void;
}) => {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState("0:00");
  const [totalTime, setTotalTime] = useState("0:00");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const prevUrlRef = useRef<string | null>(null);

  const fmtTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Load new audio & autoplay
  useEffect(() => {
    const url = audio?.audioUrl;
    if (!url || url === prevUrlRef.current) return;
    prevUrlRef.current = url;
    const el = audioRef.current;
    if (!el) return;
    el.src = url;
    el.load();
    el.play().catch(() => {});
    onPlayPause(); // sync state to playing
  }, [audio?.audioUrl]);

  // Sync play/pause with state
  useEffect(() => {
    const el = audioRef.current;
    if (!el || !el.src) return;
    if (isPlaying) el.play().catch(() => {});
    else el.pause();
  }, [isPlaying]);

  const handleTimeUpdate = () => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    setProgress((el.currentTime / el.duration) * 100);
    setCurrentTime(fmtTime(el.currentTime));
  };

  const handleLoadedMetadata = () => {
    const el = audioRef.current;
    if (el && el.duration && isFinite(el.duration)) setTotalTime(fmtTime(el.duration));
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    el.currentTime = pct * el.duration;
  };

  const handleDownload = () => {
    if (!audio?.audioUrl) return;
    const a = document.createElement("a");
    a.href = audio.audioUrl;
    a.download = `synapse-${audio.type}-${audio.id}.mp3`;
    a.click();
  };

  return (
    <div className="bg-white/[0.02] border border-[#333] rounded-2xl p-6 space-y-4">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => { setProgress(0); onEnded(); }}
      />

      {/* Waveform */}
      <div className="bg-black/40 rounded-xl p-4 border border-[#222]">
        <WaveformVisualizer isPlaying={isPlaying} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={onPlayPause}
          disabled={!audio?.audioUrl}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-300
            ${audio?.audioUrl 
              ? "bg-[#0070f3] hover:bg-[#0060df] text-white shadow-lg shadow-[0_0_24px_rgba(0,112,243,0.4)]" 
              : "bg-white/[0.05] text-[#444] cursor-not-allowed"
            }
          `}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5 text-white" />
          ) : (
            <Play className="w-5 h-5 text-white ml-0.5" />
          )}
        </button>

        {/* Timeline — clickable to seek */}
        <div className="flex-1 space-y-1">
          <div 
            className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden cursor-pointer"
            onClick={handleSeek}
          >
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#666]">
            <span>{currentTime}</span>
            <span>{totalTime}</span>
          </div>
        </div>

        {/* Volume */}
        <button className="p-2 rounded-lg bg-white/[0.03] border border-[#333] text-[#888] hover:text-white transition-colors">
          <Volume2 className="w-4 h-4" />
        </button>

        {/* Download */}
        <button 
          onClick={handleDownload}
          disabled={!audio?.audioUrl}
          className={`
            p-2 rounded-lg border transition-colors
            ${audio?.audioUrl 
              ? "bg-white/[0.03] border-[#333] text-[#888] hover:text-white hover:bg-white/[0.05]" 
              : "bg-white/[0.02] border-[#222] text-[#444] cursor-not-allowed"
            }
          `}
        >
          <Download className="w-4 h-4" />
        </button>
      </div>

      {/* Current track info */}
      {audio ? (
        <div className="pt-2 border-t border-[#222]">
          <p className="text-sm text-white font-medium truncate">
            {audio.type === "music" ? audio.prompt : audio.text}
          </p>
          <p className="text-xs text-[#666] mt-1">
            {audio.type === "music" ? "Minimax Music · Песня" : "XTTS-v2 · Озвучка"} • {totalTime !== "0:00" ? totalTime : audio.duration}
          </p>
        </div>
      ) : (
        <div className="pt-2 border-t border-[#222] text-center">
          <p className="text-sm text-[#666]">Аудио ещё не создано</p>
          <p className="text-xs text-[#444] mt-1">Сгенерируйте музыку или речь для воспроизведения</p>
        </div>
      )}
    </div>
  );
};

// Recent Generations component
const RecentGenerations = ({ 
  generations, 
  onSelect 
}: { 
  generations: GeneratedAudio[]; 
  onSelect: (audio: GeneratedAudio) => void;
}) => {
  if (generations.length === 0) {
    return (
      <div className="bg-white/[0.02] border border-[#333] rounded-2xl p-6">
        <h3 className="text-sm font-medium text-white mb-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-[#666]" />
          Последние генерации
        </h3>
        <div className="text-center py-8">
          <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-[#222] flex items-center justify-center mx-auto mb-3">
            <Music className="w-6 h-6 text-[#444]" />
          </div>
          <p className="text-sm text-[#666]">Генераций пока нет</p>
          <p className="text-xs text-[#444] mt-1">Ваше аудио появится здесь</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/[0.02] border border-[#333] rounded-2xl p-6">
      <h3 className="text-sm font-medium text-white mb-4 flex items-center gap-2">
        <Clock className="w-4 h-4 text-[#666]" />
        Последние генерации
      </h3>
      <div className="space-y-2">
        {generations.map((gen) => (
          <button
            key={gen.id}
            onClick={() => onSelect(gen)}
            className="w-full p-3 rounded-xl bg-white/[0.02] border border-[#222] hover:border-[#333] hover:bg-white/[0.04] transition-all flex items-center gap-3 group"
          >
            <div className={`
              w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0
              ${gen.type === "music" 
                ? "bg-gradient-to-br from-indigo-500/20 to-blue-500/20" 
                : "bg-gradient-to-br from-indigo-500/20 to-blue-500/20"
              }
            `}>
              {gen.type === "music" ? (
                <Music className="w-5 h-5 text-indigo-400" />
              ) : (
                <Mic className="w-5 h-5 text-blue-400" />
              )}
            </div>
            <div className="flex-1 text-left min-w-0">
              <p className="text-sm text-white truncate">
                {gen.type === "music" ? gen.prompt : gen.text}
              </p>
              <p className="text-xs text-[#666]">{gen.duration}</p>
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <Play className="w-4 h-4 text-[#888]" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

// Voice Clone Modal
const VoiceCloneModal = ({ 
  isOpen, 
  onClose,
  onCloneCreated 
}: { 
  isOpen: boolean; 
  onClose: () => void;
  onCloneCreated: (voice: Voice) => void;
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [voiceName, setVoiceName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.includes("audio")) {
        setUploadedFile(file);
      }
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setUploadedFile(files[0]);
    }
  };

  const handleClone = async () => {
    if (!uploadedFile || !voiceName) return;
    
    setIsProcessing(true);
    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const newVoice: Voice = {
      id: `cloned-${Date.now()}`,
      name: voiceName,
      type: "cloned",
    };
    
    onCloneCreated(newVoice);
    setIsProcessing(false);
    setUploadedFile(null);
    setVoiceName("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-[#333] rounded-2xl p-6 shadow-2xl">
        {/* Glow effect */}
        <div className="absolute inset-0 -z-10 rounded-2xl bg-indigo-500/10 blur-3xl" />
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-white/[0.05] border border-[#333] text-[#888] hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center">
            <Mic className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">Клонирование голоса</h2>
            <p className="text-sm text-[#666]">Создайте свой персональный AI-голос</p>
          </div>
          <div className="ml-auto">
            <span className="px-2 py-1 rounded-md bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 text-xs font-medium text-amber-400 flex items-center gap-1">
              <Crown className="w-3 h-3" />
              Ultra
            </span>
          </div>
        </div>

        {/* Voice Name Input */}
        <div className="mb-4">
          <label className="block text-sm text-[#888] mb-2">Название голоса</label>
          <input
            type="text"
            value={voiceName}
            onChange={(e) => setVoiceName(e.target.value)}
            placeholder="Мой голос"
            className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-[#333] text-white placeholder-[#555] focus:border-indigo-500/50 focus:outline-none transition-colors"
          />
        </div>

        {/* Upload Zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            relative p-8 rounded-xl border-2 border-dashed cursor-pointer
            transition-all duration-300
            ${isDragging 
              ? "border-indigo-500 bg-indigo-500/10" 
              : uploadedFile 
                ? "border-emerald-500/50 bg-emerald-500/5" 
                : "border-[#333] hover:border-[#444] bg-white/[0.02]"
            }
          `}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          
          {uploadedFile ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-emerald-400" />
              </div>
              <p className="text-sm text-white font-medium">{uploadedFile.name}</p>
              <p className="text-xs text-[#666] mt-1">Нажмите чтобы изменить файл</p>
            </div>
          ) : (
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-white/[0.05] border border-[#333] flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6 text-[#666]" />
              </div>
              <p className="text-sm text-white font-medium">Перетащите аудиофайл сюда</p>
              <p className="text-xs text-[#666] mt-1">MP3 или WAV, минимум 30 секунд</p>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-[#333]" />
          <span className="text-xs text-[#666]">ИЛИ</span>
          <div className="flex-1 h-px bg-[#333]" />
        </div>

        {/* Record Button */}
        <button
          onClick={() => setIsRecording(!isRecording)}
          className={`
            w-full py-3 rounded-xl border flex items-center justify-center gap-2
            transition-all duration-300
            ${isRecording 
              ? "bg-red-500/20 border-red-500/50 text-red-400" 
              : "bg-white/[0.03] border-[#333] text-[#888] hover:text-white hover:bg-white/[0.05]"
            }
          `}
        >
          <Mic className={`w-4 h-4 ${isRecording ? "animate-pulse" : ""}`} />
          {isRecording ? "Запись... Нажмите чтобы остановить" : "Записать с микрофона"}
        </button>

        {/* Credit cost info */}
        <div className="mt-4 p-3 rounded-xl bg-white/[0.02] border border-[#222]">
          <p className="text-xs text-[#666] text-center">
            Клонирование голоса стоит <span className="text-indigo-400 font-medium">30 кредитов</span> за голос
          </p>
        </div>

        {/* Clone Button */}
        <button
          onClick={handleClone}
          disabled={!uploadedFile || !voiceName || isProcessing}
          className={`
            w-full mt-4 py-3.5 rounded-xl font-medium text-sm
            transition-all duration-300 relative overflow-hidden
            ${uploadedFile && voiceName && !isProcessing
              ? "bg-[#0070f3] hover:bg-[#0060df] text-white shadow-lg shadow-[0_0_24px_rgba(0,112,243,0.4)]"
              : "bg-white/[0.05] text-[#555] cursor-not-allowed"
            }
          `}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Обработка голоса...
            </span>
          ) : (
            "Клонировать голос"
          )}
        </button>
      </div>
    </div>
  );
};

export const AudioStudio = () => {
  const [mode, setMode] = useState<AudioMode>("music");
  const [duration, setDuration] = useState<Duration>("60s");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [vocalGender, setVocalGender] = useState<VocalGender>("female");
  const [songLanguage, setSongLanguage] = useState<SongLanguage>("ru");
  const [selectedVoice, setSelectedVoice] = useState<Voice>(presetVoices[0]);
  const [clonedVoices, setClonedVoices] = useState<Voice[]>([]);
  const [showCloneModal, setShowCloneModal] = useState(false);
  
  const [musicPrompt, setMusicPrompt] = useState("");
  const [voiceText, setVoiceText] = useState("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<GeneratedAudio | null>(null);
  const [generations, setGenerations] = useState<GeneratedAudio[]>([]);
  const [genProgress, setGenProgress] = useState(0);       // 0-100
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const progressRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  const CREDIT_COST_MUSIC = 10;
  const CREDIT_COST_VOICE = 3;
  const creditCost = mode === "music" ? CREDIT_COST_MUSIC : CREDIT_COST_VOICE;
  const { creditBalance, checkCredits, deductCredits } = useUsage();

  // Smooth progress simulation: ramps from startPct → targetPct over durationMs
  const startProgressSim = useCallback((durationMs: number, targetPct: number, startPct: number = 0) => {
    if (progressRef.current) clearInterval(progressRef.current);
    const t0 = Date.now();
    setGenProgress(startPct);
    progressRef.current = setInterval(() => {
      const elapsed = Date.now() - t0;
      const range = targetPct - startPct;
      const pct = Math.min(targetPct, startPct + (elapsed / durationMs) * range);
      setGenProgress(Math.round(pct));
    }, 200);
  }, []);

  const stopProgressSim = useCallback(() => {
    if (progressRef.current) { clearInterval(progressRef.current); progressRef.current = null; }
  }, []);

  // Cleanup on unmount
  useEffect(() => () => stopProgressSim(), [stopProgressSim]);

  // Cancel a prediction on Replicate to save credits
  const cancelPrediction = async (taskId: string) => {
    try {
      await fetch(`/api/audio/cancel/${encodeURIComponent(taskId)}`, { method: "POST" });
      console.log(`[Audio] Canceled prediction ${taskId}`);
    } catch { /* best-effort */ }
  };

  // Poll audio prediction status (60 × 3s = 3 min max)
  // Auto-cancels if stuck in 'starting' > 45s to save credits
  const pollAudioStatus = async (
    taskId: string,
    onStatus?: (status: string) => void,
  ): Promise<string> => {
    const startedAt = Date.now();
    let everProcessing = false;

    for (let i = 0; i < 60; i++) {
      await new Promise(r => setTimeout(r, 3000));
      try {
        const res = await fetch(`/api/audio/status/${encodeURIComponent(taskId)}`);
        if (!res.ok) throw new Error(`Сервер вернул ошибку ${res.status}. Попробуйте позже.`);
        const data = await res.json() as { status: string; url?: string; error?: string };
        if (onStatus) onStatus(data.status);

        if (data.status === "completed" && data.url) return data.url;
        if (data.status === "failed") throw new Error(data.error || "Генерация не удалась.");

        if (data.status === "processing") everProcessing = true;

        // Auto-cancel: stuck in 'starting' (cold start) > 45s
        if (data.status === "starting" && !everProcessing && Date.now() - startedAt > 45_000) {
          await cancelPrediction(taskId);
          throw new Error("Модель долго запускается (cold start). Запрос отменён для экономии кредитов. Попробуйте снова через минуту.");
        }
      } catch (err) {
        if (err instanceof Error && (
          err.message.includes("не удалась") ||
          err.message.includes("ошибку") ||
          err.message.includes("отменён")
        )) throw err;
      }
    }
    throw new Error("Таймаут генерации (3 мин). Попробуйте снова.");
  };

  const handleGenerate = async () => {
    if (!checkCredits(creditCost)) return;
    // Clean slate: clear ALL previous state
    setIsGenerating(true);
    setError(null);
    setGenProgress(0);
    setStatusMessage(null);
    setCurrentAudio(null);
    
    try {
      let response: Response;
      
      if (mode === "music") {
        if (!musicPrompt.trim()) {
          setIsGenerating(false); setStatusMessage(null); setGenProgress(0);
          return;
        }

        // Phase 1: "Сочиняем текст..." — backend calls GPT + fires minimax
        setStatusMessage("Сочиняем текст песни...");
        startProgressSim(6_000, 25);  // 0→25% over ~6s (LLM + fire)

        const durationSeconds = duration === "30s" ? 30 : duration === "60s" ? 60 : 120;
        response = await fetch("/api/audio/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: musicPrompt.trim(),
            duration: durationSeconds,
            genre: selectedGenre || undefined,
            vocalGender,
            language: songLanguage,
          }),
        });
      } else {
        if (!voiceText.trim()) {
          setIsGenerating(false); setStatusMessage(null); setGenProgress(0);
          return;
        }
        setStatusMessage("XTTS запускается...");
        startProgressSim(15_000, 80);

        response = await fetch("/api/audio/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: voiceText.trim() }),
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Неизвестная ошибка" })) as { error?: string };
        throw new Error(errorData.error || "Ошибка генерации аудио");
      }
      
      const createData = await response.json() as { id?: string; status?: string; lyrics?: string; error?: string };
      if (!createData.id) throw new Error("Нет ID задачи.");

      // Phase 2: status-aware polling with progress
      let phase: "starting" | "processing" | "done" = "starting";
      if (mode === "music") {
        stopProgressSim();
        setGenProgress(25);
        setStatusMessage("ИИ готовится к работе (прогрев)...");
        startProgressSim(60_000, 35, 25);  // starting: slow crawl 25→35% over 60s
      } else {
        setStatusMessage("XTTS синтезирует речь...");
      }

      const audioUrl = await pollAudioStatus(createData.id, (status) => {
        if (mode !== "music") return;
        if (status === "processing" && phase === "starting") {
          phase = "processing";
          stopProgressSim();
          setStatusMessage("Нейросеть записывает вокал...");
          const simMs = duration === "30s" ? 40_000 : duration === "60s" ? 70_000 : 120_000;
          startProgressSim(simMs, 92, 35);  // processing: 35→92%
        }
      });
      
      // Snap to 100%
      stopProgressSim();
      setGenProgress(100);
      setStatusMessage("Готово!");
      
      deductCredits(creditCost);
      
      const savedPrompt = musicPrompt;
      const savedText = voiceText;
      const newAudio: GeneratedAudio = {
        id: createData.id,
        type: mode,
        prompt: mode === "music" ? savedPrompt : undefined,
        lyrics: mode === "music" ? createData.lyrics : undefined,
        text: mode === "voice" ? savedText : undefined,
        duration: mode === "music"
          ? (duration === "30s" ? "0:30" : duration === "60s" ? "1:00" : "2:00")
          : `~${Math.ceil(savedText.split(/\s+/).length / 2.5)}с`,
        createdAt: new Date(),
        audioUrl,
      };
      
      setCurrentAudio(newAudio);
      setGenerations(prev => [newAudio, ...prev]);
      
      try {
        addToHistory({
          type: "audio",
          prompt: mode === "music" ? savedPrompt : savedText || "",
          model: mode === "music" ? "ElevenLabs Music" : "XTTS-v2",
          result: audioUrl,
          credits: creditCost,
        });
      } catch (histErr) {
        console.warn("History save failed (non-blocking):", histErr);
      }
      
      if (mode === "music") setMusicPrompt(""); else setVoiceText("");
    } catch (err) {
      console.error("Audio generation error:", err);
      setError(err instanceof Error ? err.message : "Ошибка генерации аудио.");
    } finally {
      stopProgressSim();
      setIsGenerating(false);
      setStatusMessage(null);
      setTimeout(() => setGenProgress(0), 1500);
    }
  };

  const handleCloneCreated = (voice: Voice) => {
    setClonedVoices(prev => [...prev, voice]);
    setSelectedVoice(voice);
  };

  const allVoices = [...presetVoices, ...clonedVoices];

  return (
    <div className="flex flex-col lg:flex-row h-full min-h-0 overflow-hidden">
      {/* Left Panel - Controls: scrollable + sticky button */}
      <div className="w-full lg:w-[40%] border-b lg:border-b-0 lg:border-r border-[#222] flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 min-h-0 pb-36 md:pb-6">
          <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-mono font-bold text-white mb-2 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center">
                <Music className="w-5 h-5 text-indigo-400" />
              </div>
              Аудио
            </h1>
            <p className="text-sm text-[#666]">Генерация музыки и синтез речи с AI</p>
          </div>
        </div>

        {/* Mode Switcher — как переключатель режима во вкладке Изображения */}
        <div className="relative flex rounded-xl bg-[#0a0a0a] border border-[#333] p-1">
          <div
            className={`
              absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg
              bg-gradient-to-r from-indigo-600/30 to-blue-600/30
              border border-indigo-500/30
              transition-transform duration-300 ease-out
              ${mode === "voice" ? "translate-x-[calc(100%+4px)]" : "translate-x-0"}
            `}
          />
          <button
            onClick={() => setMode("music")}
            className={`
              relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium
              transition-all duration-300
              ${mode === "music" ? "text-white" : "text-[#666] hover:text-[#888]"}
            `}
          >
            <Music className="w-4 h-4" />
            Генератор музыки
          </button>
          <button
            onClick={() => setMode("voice")}
            className={`
              relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg text-sm font-medium
              transition-all duration-300
              ${mode === "voice" ? "text-white" : "text-[#666] hover:text-[#888]"}
            `}
          >
            <Mic className="w-4 h-4" />
            Озвучка
          </button>
        </div>

        {/* Music Generator Controls — simplified: keywords + genre + duration */}
        {mode === "music" && (
          <div className="space-y-6">
            {/* Keywords Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#888]">О чём будет ваша песня?</label>
              <textarea
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                placeholder="летняя любовь, танцы на закате, свобода и ветер..."
                className="w-full h-24 px-4 py-3 rounded-xl bg-white/[0.03] border border-[#333] text-white placeholder-[#555] resize-none focus:border-indigo-500/50 focus:outline-none transition-colors"
              />
              <p className="text-[11px] text-[#555]">AI напишет текст песни и запишет вокал по вашим ключевым словам</p>
            </div>

            {/* Genre Select */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#888]">Жанр</label>
              <div className="flex flex-wrap gap-2">
                {genres.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => setSelectedGenre(selectedGenre === genre ? null : genre)}
                    className={`
                      px-3 py-1.5 rounded-lg text-xs font-medium
                      transition-all duration-200 border
                      ${selectedGenre === genre
                        ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                        : "bg-white/[0.02] border-[#333] text-[#888] hover:text-white hover:border-[#444]"
                      }
                    `}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            </div>

            {/* Vocal Gender */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#888]">Вокал</label>
              <div className="flex gap-2">
                {(["male", "female"] as VocalGender[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => setVocalGender(g)}
                    className={`
                      flex-1 py-2 rounded-xl text-sm font-medium
                      transition-all duration-300 border
                      ${vocalGender === g
                        ? "bg-indigo-500/20 border-indigo-500/50 text-white"
                        : "bg-white/[0.02] border-[#333] text-[#888] hover:text-white hover:border-[#444]"
                      }
                    `}
                  >
                    {g === "male" ? "♂ Мужской" : "♀ Женский"}
                  </button>
                ))}
              </div>
            </div>

            {/* Song Language */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#888]">Язык песни</label>
              <div className="flex gap-2">
                {(["ru", "en"] as SongLanguage[]).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setSongLanguage(lang)}
                    className={`
                      flex-1 py-2 rounded-xl text-sm font-medium
                      transition-all duration-300 border
                      ${songLanguage === lang
                        ? "bg-indigo-500/20 border-indigo-500/50 text-white"
                        : "bg-white/[0.02] border-[#333] text-[#888] hover:text-white hover:border-[#444]"
                      }
                    `}
                  >
                    {lang === "ru" ? "🇷🇺 Русский" : "🇬🇧 English"}
                  </button>
                ))}
              </div>
            </div>

            {/* Duration */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#888]">Длительность</label>
              <div className="flex gap-2">
                {(["30s", "60s", "2min"] as Duration[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => setDuration(d)}
                    className={`
                      flex-1 py-2.5 rounded-xl text-sm font-medium
                      transition-all duration-300 border
                      ${duration === d
                        ? "bg-indigo-500/20 border-indigo-500/50 text-white"
                        : "bg-white/[0.02] border-[#333] text-[#888] hover:text-white hover:border-[#444]"
                      }
                    `}
                  >
                    {d}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-indigo-400/60 mt-1">
                {duration === "30s" ? "1 куплет" : duration === "60s" ? "Куплет + припев" : "2 куплета + припев + бридж"}
              </p>
            </div>

            {/* How it works hint */}
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <p className="text-[11px] text-indigo-300/70 leading-relaxed">
                <span className="font-medium text-indigo-300">Как это работает:</span> AI сочиняет текст песни по вашим словам, 
                затем ElevenLabs Music записывает полноценный трек с вокалом и аранжировкой.
              </p>
            </div>
          </div>
        )}

        {/* Voice Lab Controls */}
        {mode === "voice" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Voice Lab Header */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/10 to-blue-500/10 border border-indigo-500/20">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                  <Mic className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-white">Voice Lab</h3>
                  <p className="text-xs text-[#666]">Преобразование текста в речь с помощью AI</p>
                </div>
              </div>
            </div>

            {/* Text Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#888]">Введите текст для озвучивания</label>
              <textarea
                value={voiceText}
                onChange={(e) => setVoiceText(e.target.value)}
                placeholder="Введите или вставьте текст для преобразования в речь..."
                className="w-full h-32 px-4 py-3 rounded-xl bg-white/[0.03] border border-[#333] text-white placeholder-[#555] resize-none focus:border-indigo-500/50 focus:outline-none transition-colors"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-[#666]">Максимум 1000 символов</span>
                <span className="text-xs text-[#666]">{voiceText.length}/1000</span>
              </div>
            </div>

            {/* Voice Selector */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#888]">Выберите голос</label>
              <div className="relative">
                <select
                  value={selectedVoice?.id ?? presetVoices[0].id}
                  onChange={(e) => {
                    const voice = allVoices.find(v => v.id === e.target.value);
                    if (voice) setSelectedVoice(voice);
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-[#333] text-white appearance-none cursor-pointer focus:border-indigo-500/50 focus:outline-none transition-colors"
                  style={{ backgroundColor: "rgba(255,255,255,0.03)" }}
                >
                  <optgroup label="Готовые голоса">
                    {presetVoices.map((voice) => (
                      <option key={voice.id} value={voice.id} className="bg-[#1a1a1a] text-white">{voice.name}</option>
                    ))}
                  </optgroup>
                  {clonedVoices.length > 0 && (
                    <optgroup label="Мои клонированные голоса">
                      {clonedVoices.map((voice) => (
                        <option key={voice.id} value={voice.id} className="bg-[#1a1a1a] text-white">{voice.name}</option>
                      ))}
                    </optgroup>
                  )}
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                  <svg className="w-4 h-4 text-[#666]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Voice Clone Section */}
            <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-500/5 to-blue-500/5 border border-indigo-500/20">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-indigo-400" />
                  <span className="text-sm font-medium text-white">Мгновенное клонирование</span>
                </div>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/30 text-xs font-medium text-amber-400 flex items-center gap-1">
                  <Crown className="w-3 h-3" />
                  Ultra
                </span>
              </div>
              <p className="text-xs text-[#666] mb-3">
                Клонируйте любой голос из 30 секундной аудиозаписи
              </p>
              <button
                onClick={() => setShowCloneModal(true)}
                className="w-full py-2.5 rounded-xl bg-white/[0.03] border border-[#333] text-sm font-medium text-white hover:bg-white/[0.05] hover:border-indigo-500/30 transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Добавить мой голос
              </button>
            </div>
          </div>
        )}
          </div>
        </div>

        {/* Кнопка генерации — desktop sticky bottom with blur + progress */}
        <div className="hidden md:block sticky bottom-0 z-50 px-6 pt-3 pb-4 bg-black/95 backdrop-blur-xl border-t border-white/10">
          {/* Error */}
          {error && (
            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/30 mb-3">
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}
          {/* Progress bar */}
          {isGenerating && (
            <div className="mb-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-indigo-300/80 font-medium">{statusMessage || "Обработка..."}</span>
                <span className="text-xs text-indigo-400 font-mono font-bold">{genProgress}%</span>
              </div>
              <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300 ease-out"
                  style={{ width: `${genProgress}%` }}
                />
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || (mode === "music" ? !musicPrompt.trim() : !voiceText.trim())}
            className={`
              w-full py-3.5 rounded-xl font-medium text-sm
              transition-all duration-300 relative overflow-hidden
              active:scale-[0.98] group
              ${isGenerating
                ? "bg-indigo-600/80 text-white cursor-wait"
                : (mode === "music" ? musicPrompt.trim() : voiceText.trim())
                  ? "bg-[#0070f3] hover:bg-[#0060df] text-white shadow-lg shadow-[0_0_20px_rgba(0,112,243,0.3)]"
                  : "bg-[#222] text-[#555] cursor-not-allowed"
              }
            `}
          >
            {!isGenerating && (mode === "music" ? musicPrompt.trim() : voiceText.trim()) && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            )}
            <span className="relative flex items-center justify-center gap-2">
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{genProgress}% — {statusMessage || "Обработка..."}</span>
                </>
              ) : mode === "music" ? (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Создать песню</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Озвучить текст</span>
                </>
              )}
            </span>
          </button>
          <p className="text-center text-[#555] text-xs mt-2">
            {mode === "music" ? <><span className="text-indigo-400 font-medium">{CREDIT_COST_MUSIC}</span> кредитов за песню</> : <><span className="text-indigo-400 font-medium">{CREDIT_COST_VOICE}</span> кредита за запрос</>} · Осталось: <span className="text-white/90">{creditBalance.toFixed(0)}</span>
          </p>
        </div>
      </div>

      {/* Фиксированная кнопка на мобильных — с прогресс-баром */}
      <div className="md:hidden w-full px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] bg-black/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.4)] fixed bottom-0 left-0 right-0 z-50">
        {/* Mobile progress bar */}
        {isGenerating && (
          <div className="mb-2 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-indigo-300/80 font-medium">{statusMessage || "Обработка..."}</span>
              <span className="text-[11px] text-indigo-400 font-mono font-bold">{genProgress}%</span>
            </div>
            <div className="h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-300 ease-out"
                style={{ width: `${genProgress}%` }}
              />
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || (mode === "music" ? !musicPrompt.trim() : !voiceText.trim())}
          className={`
            w-full py-4 px-6 rounded-xl font-medium text-base
            transition-all duration-300 relative overflow-hidden active:scale-[0.98] group
            ${isGenerating
              ? "bg-indigo-600/80 text-white cursor-wait"
              : (mode === "music" ? musicPrompt.trim() : voiceText.trim())
                ? "bg-[#0070f3] hover:bg-[#0060df] text-white shadow-lg shadow-[0_0_24px_rgba(0,112,243,0.4)]"
                : "bg-[#222] text-[#555] cursor-not-allowed"
            }
          `}
        >
          <span className="relative flex items-center justify-center gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{genProgress}% — {statusMessage || "Обработка..."}</span>
              </>
            ) : mode === "music" ? (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Создать песню</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Озвучить текст</span>
              </>
            )}
          </span>
        </button>
        <p className="text-center text-[#666] text-xs mt-2">
          <span className="text-indigo-400 font-medium">{creditCost}</span> кредитов · Осталось: <span className="text-white/90">{creditBalance.toFixed(0)}</span>
        </p>
      </div>

      {/* Right Panel - Results: фиксированная высота, скролл внутри */}
      <div className="flex-1 min-h-0 p-4 md:p-6 overflow-y-auto lg:w-[60%]">
        <div className="space-y-6">
        {/* Audio Player */}
        <AudioPlayer 
          audio={currentAudio} 
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onEnded={() => setIsPlaying(false)}
        />

        {/* Recent Generations */}
        <RecentGenerations 
          generations={generations}
          onSelect={(audio) => {
            setCurrentAudio(audio);
            setIsPlaying(false);
          }}
        />
        </div>
      </div>

      {/* Voice Clone Modal */}
      <VoiceCloneModal 
        isOpen={showCloneModal}
        onClose={() => setShowCloneModal(false)}
        onCloneCreated={handleCloneCreated}
      />
    </div>
  );
};

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
  FileText,
  PenLine,
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
  elevenlabsId?: string;
}

const presetVoices: Voice[] = [
  { id: "male-professional", name: "Мужской - Профессиональный", type: "preset" },
  { id: "male-casual", name: "Мужской - Повседневный", type: "preset" },
  { id: "female-professional", name: "Женский - Профессиональный", type: "preset" },
  { id: "female-warm", name: "Женский - Тёплый", type: "preset" },
  { id: "robot-futuristic", name: "Робот - Футуристичный", type: "preset" },
];

const genres = ["Поп", "Электроника", "Хип-Хоп", "Классика", "Рок", "Джаз", "Эмбиент", "Шансон", "R&B", "Метал", "Кантри"];

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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recordingSecs, setRecordingSecs] = useState(0);
  const [cloneError, setCloneError] = useState<string | null>(null);

  // Stop recording if modal closes
  useEffect(() => {
    if (!isOpen) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    }
  }, [isOpen]);

  const startRecording = async () => {
    try {
      setCloneError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const ext = mimeType.includes("mp4") ? "mp4" : "webm";
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const file = new File([blob], `voice-sample.${ext}`, { type: mimeType });
        setUploadedFile(file);
        stream.getTracks().forEach(t => t.stop());
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        setIsRecording(false);
      };

      recorder.start(250);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSecs(0);

      timerRef.current = setInterval(() => {
        setRecordingSecs(prev => {
          if (prev >= 29) { recorder.stop(); return 30; }
          return prev + 1;
        });
      }, 1000);
    } catch (err) {
      console.error("Microphone access denied:", err);
      setCloneError("Нет доступа к микрофону. Разрешите доступ в настройках браузера.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  };

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
    setCloneError(null);

    try {
      const formData = new FormData();
      formData.append("name", voiceName);
      formData.append("file", uploadedFile);

      const res = await fetch("/api/audio/clone-voice", {
        method: "POST",
        headers: { "Cache-Control": "no-cache, no-store", "Pragma": "no-cache" },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Ошибка клонирования" })) as { error?: string; detail?: string; status?: number; keyTail?: string };
        console.error("[Clone] Backend error:", { httpStatus: res.status, error: errData.error, detail: errData.detail, elStatus: errData.status, keyUsedEndsWith: errData.keyTail });
        const detail = errData.detail ? ` (${errData.detail.slice(0, 200)})` : "";
        const keyInfo = errData.keyTail ? ` [Key ends with: ${errData.keyTail}]` : "";
        throw new Error((errData.error || "Клонирование не удалось") + detail + keyInfo);
      }

      const data = await res.json() as { voice_id: string };

      const newVoice: Voice = {
        id: `cloned-${Date.now()}`,
        name: voiceName,
        type: "cloned",
        elevenlabsId: data.voice_id,
      };

      onCloneCreated(newVoice);
      setUploadedFile(null);
      setVoiceName("");
      onClose();
    } catch (err) {
      console.error("Clone error:", err);
      setCloneError(err instanceof Error ? err.message : "Клонирование не удалось");
    } finally {
      setIsProcessing(false);
    }
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
          onClick={isRecording ? stopRecording : startRecording}
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
          {isRecording ? (
            <span>Запись {recordingSecs}с / 30с — Нажмите чтобы остановить</span>
          ) : (
            <span>Записать с микрофона (до 30с)</span>
          )}
        </button>

        {/* Recording timer bar */}
        {isRecording && (
          <div className="mt-2 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-red-500 to-rose-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(recordingSecs / 30) * 100}%` }}
            />
          </div>
        )}

        {/* Clone error */}
        {cloneError && (
          <div className="mt-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
            <p className="text-xs text-red-400">{cloneError}</p>
          </div>
        )}

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
  const [useMyVoice, setUseMyVoice] = useState(false);
  const [clonedVoiceId, setClonedVoiceId] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(presetVoices[0]);
  const [clonedVoices, setClonedVoices] = useState<Voice[]>([]);
  const [showCloneModal, setShowCloneModal] = useState(false);
  
  const [musicPrompt, setMusicPrompt] = useState("");
  const [voiceText, setVoiceText] = useState("");
  const [editedLyrics, setEditedLyrics] = useState("");
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);
  const [lyricsReady, setLyricsReady] = useState(false);
  
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

  // Step logic: 1 = choose genre/settings, 2 = write lyrics, 3 = create music
  const LYRICS_LIMITS: Record<Duration, number> = { "30s": 200, "60s": 400, "2min": 600 };
  const lyricsMaxChars = LYRICS_LIMITS[duration];
  const currentStep = !selectedGenre ? 1 : !lyricsReady ? 2 : 3;
  const canGenerateLyrics = !!selectedGenre && !!musicPrompt.trim() && !isGeneratingLyrics && !isGenerating;
  const lyricsOverLimit = editedLyrics.length > lyricsMaxChars;
  const canCreateMusic = lyricsReady && editedLyrics.trim().length >= 10 && !lyricsOverLimit && !isGenerating && !isGeneratingLyrics;

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

  // Poll audio prediction status — MiniMax Music-1.5 is heavy, needs up to 5-8 min
  // 100 polls × 5s interval = ~8 min max. No auto-cancel — MiniMax cold starts are normal.
  const pollAudioStatus = async (
    taskId: string,
    onStatus?: (status: string, elapsedSec: number) => void,
  ): Promise<string> => {
    const startedAt = Date.now();
    const MAX_POLLS = 100;
    const POLL_INTERVAL = 5000;

    for (let i = 0; i < MAX_POLLS; i++) {
      await new Promise(r => setTimeout(r, POLL_INTERVAL));
      const elapsedSec = Math.round((Date.now() - startedAt) / 1000);
      try {
        const res = await fetch(`/api/audio/status/${encodeURIComponent(taskId)}`);
        if (!res.ok) throw new Error(`Сервер вернул ошибку ${res.status}. Попробуйте позже.`);
        const data = await res.json() as { status: string; url?: string; error?: string };
        if (onStatus) onStatus(data.status, elapsedSec);

        if (data.status === "completed" && data.url) return data.url;
        if (data.status === "failed") throw new Error(data.error || "Генерация не удалась.");
      } catch (err) {
        if (err instanceof Error && (
          err.message.includes("не удалась") ||
          err.message.includes("ошибку")
        )) throw err;
      }
    }
    throw new Error("Таймаут генерации (~8 мин). Попробуйте снова.");
  };

  const handleGenerateLyrics = async () => {
    if (!musicPrompt.trim()) return;
    setIsGeneratingLyrics(true);
    setError(null);
    setLyricsReady(false);
    setEditedLyrics("");

    try {
      const durationSeconds = duration === "30s" ? 30 : duration === "60s" ? 60 : 120;
      const res = await fetch("/api/audio/generate-lyrics", {
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

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ error: "Ошибка" })) as { error?: string };
        throw new Error(errData.error || "Не удалось сгенерировать текст");
      }

      const data = await res.json() as { lyrics: string };
      setEditedLyrics(data.lyrics);
      setLyricsReady(true);
    } catch (err) {
      console.error("Lyrics generation error:", err);
      setError(err instanceof Error ? err.message : "Ошибка генерации текста.");
    } finally {
      setIsGeneratingLyrics(false);
    }
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

        // If lyrics were pre-generated, skip GPT phase and go straight to music
        const hasEditedLyrics = lyricsReady && editedLyrics.trim().length >= 10;
        setStatusMessage(hasEditedLyrics ? "Отправляем в студию..." : "Сочиняем текст песни...");
        startProgressSim(hasEditedLyrics ? 3_000 : 8_000, 20);

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
            voiceId: useMyVoice && clonedVoiceId ? clonedVoiceId : undefined,
            lyrics: hasEditedLyrics ? editedLyrics.trim() : undefined,
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

      // Phase 2: status-aware polling with detailed progress for MiniMax
      let phase: "starting" | "processing" | "done" = "starting";
      if (mode === "music") {
        stopProgressSim();
        setGenProgress(20);
        setStatusMessage("Подключаемся к студии...");
        startProgressSim(120_000, 40, 20);  // starting: slow crawl 20→40% over 2 min (cold start)
      } else {
        setStatusMessage("XTTS синтезирует речь...");
      }

      const audioUrl = await pollAudioStatus(createData.id, (status, elapsedSec) => {
        if (mode !== "music") return;

        if (status === "starting") {
          // MiniMax cold start — reassure the user
          if (elapsedSec < 30) {
            setStatusMessage("Подключаемся к студии...");
          } else if (elapsedSec < 90) {
            setStatusMessage("Нейросеть загружается (это нормально, ~1-2 мин)...");
          } else {
            setStatusMessage(`Модель всё ещё запускается (${Math.floor(elapsedSec / 60)}:${String(elapsedSec % 60).padStart(2, "0")})...`);
          }
        }

        if (status === "processing" && phase === "starting") {
          phase = "processing";
          stopProgressSim();
          setGenProgress(40);
          setStatusMessage("Нейросеть сочиняет музыку...");
          const simMs = duration === "30s" ? 60_000 : duration === "60s" ? 120_000 : 180_000;
          startProgressSim(simMs, 92, 40);  // processing: 40→92%
        }

        if (status === "processing" && phase === "processing") {
          // Update message during processing
          if (elapsedSec > 120) {
            setStatusMessage("Сводим вокал и инструменты...");
          } else if (elapsedSec > 60) {
            setStatusMessage("Нейросеть записывает вокал...");
          }
        }
      });

      // Speech-to-Speech: apply cloned voice if enabled
      let finalAudioUrl = audioUrl;
      if (mode === "music" && useMyVoice && clonedVoiceId) {
        stopProgressSim();
        setGenProgress(93);
        setStatusMessage("Применяем ваш голос...");
        startProgressSim(25_000, 99, 93);

        try {
          const stsRes = await fetch("/api/audio/speech-to-speech", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ audioUrl, voiceId: clonedVoiceId }),
          });

          if (stsRes.ok) {
            const stsData = await stsRes.json() as { url?: string };
            if (stsData.url) finalAudioUrl = stsData.url;
          } else {
            const stsErr = await stsRes.json().catch(() => ({})) as { error?: string };
            console.warn("[Audio] S2S failed, using original audio:", stsErr.error);
          }
        } catch (stsErr) {
          console.warn("[Audio] S2S error, using original audio:", stsErr);
        }
      }
      
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
        audioUrl: finalAudioUrl,
      };
      
      setCurrentAudio(newAudio);
      setGenerations(prev => [newAudio, ...prev]);
      
      try {
        addToHistory({
          type: "audio",
          prompt: mode === "music" ? savedPrompt : savedText || "",
          model: mode === "music" ? (useMyVoice && clonedVoiceId ? "MiniMax Music-1.5 + S2S" : "MiniMax Music-1.5") : "XTTS-v2",
          result: finalAudioUrl,
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
    if (voice.elevenlabsId) {
      setClonedVoiceId(voice.elevenlabsId);
      setUseMyVoice(true);
    }
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

        {/* Music Generator Controls — Step-by-step wizard */}
        {mode === "music" && (
          <div className="space-y-5">
            {/* ═══ Visual Stepper ═══ */}
            <div className="flex items-center gap-0">
              {[
                { num: 1, label: "Настроение", icon: "🎸" },
                { num: 2, label: "Слова", icon: "✍️" },
                { num: 3, label: "Запись", icon: "🎤" },
              ].map((step, i) => (
                <div key={step.num} className="flex items-center flex-1">
                  <div className="flex flex-col items-center flex-1">
                    <div className={`
                      w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold
                      transition-all duration-500 border-2
                      ${currentStep > step.num
                        ? "bg-green-500/20 border-green-500/60 text-green-400"
                        : currentStep === step.num
                          ? "bg-indigo-500/30 border-indigo-400 text-white shadow-[0_0_12px_rgba(99,102,241,0.4)]"
                          : "bg-white/[0.03] border-[#333] text-[#555]"
                      }
                    `}>
                      {currentStep > step.num ? <Check className="w-4 h-4" /> : step.icon}
                    </div>
                    <span className={`
                      text-[10px] mt-1.5 font-medium transition-colors duration-300
                      ${currentStep > step.num ? "text-green-400/70" : currentStep === step.num ? "text-indigo-300" : "text-[#555]"}
                    `}>
                      {step.label}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={`
                      h-[2px] flex-1 -mt-4 mx-1 rounded-full transition-all duration-500
                      ${currentStep > step.num ? "bg-green-500/40" : "bg-[#222]"}
                    `} />
                  )}
                </div>
              ))}
            </div>

            {/* ═══ STEP 1: Настроение (Genre + Settings) ═══ */}
            <div className={`space-y-4 p-4 rounded-xl border transition-all duration-300 ${
              currentStep === 1
                ? "border-indigo-500/30 bg-indigo-500/[0.03]"
                : currentStep > 1
                  ? "border-green-500/20 bg-green-500/[0.02]"
                  : "border-[#222] bg-white/[0.01] opacity-50"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/80 flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    currentStep > 1 ? "bg-green-500/20 text-green-400" : "bg-indigo-500/20 text-indigo-300"
                  }`}>{currentStep > 1 ? "✓" : "1"}</span>
                  Настроение
                </span>
                {currentStep === 1 && !selectedGenre && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 animate-pulse">
                    Выберите жанр 🎸
                  </span>
                )}
              </div>

              {/* Genre */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-[#777]">Жанр</label>
                <div className="flex flex-wrap gap-2">
                  {genres.map((genre) => (
                    <button
                      key={genre}
                      onClick={() => {
                        setSelectedGenre(selectedGenre === genre ? null : genre);
                        if (lyricsReady) { setLyricsReady(false); setEditedLyrics(""); }
                      }}
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

              {/* Vocal + Language row */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-[#777]">Вокал</label>
                  <div className="flex gap-1.5">
                    {(["male", "female"] as VocalGender[]).map((g) => (
                      <button
                        key={g}
                        onClick={() => setVocalGender(g)}
                        className={`
                          flex-1 py-1.5 rounded-lg text-xs font-medium
                          transition-all duration-300 border
                          ${vocalGender === g
                            ? "bg-indigo-500/20 border-indigo-500/50 text-white"
                            : "bg-white/[0.02] border-[#333] text-[#888] hover:text-white hover:border-[#444]"
                          }
                        `}
                      >
                        {g === "male" ? "♂ Муж" : "♀ Жен"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-medium text-[#777]">Язык</label>
                  <div className="flex gap-1.5">
                    {(["ru", "en"] as SongLanguage[]).map((lang) => (
                      <button
                        key={lang}
                        onClick={() => setSongLanguage(lang)}
                        className={`
                          flex-1 py-1.5 rounded-lg text-xs font-medium
                          transition-all duration-300 border
                          ${songLanguage === lang
                            ? "bg-indigo-500/20 border-indigo-500/50 text-white"
                            : "bg-white/[0.02] border-[#333] text-[#888] hover:text-white hover:border-[#444]"
                          }
                        `}
                      >
                        {lang === "ru" ? "🇷🇺 Рус" : "🇬🇧 Eng"}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Duration */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-[#777]">Длительность</label>
                <div className="flex gap-2">
                  {(["30s", "60s", "2min"] as Duration[]).map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`
                        flex-1 py-2 rounded-lg text-xs font-medium
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
                <p className="text-[10px] text-indigo-400/50">
                  {duration === "30s" ? `1 куплет (до ${LYRICS_LIMITS["30s"]} сим.)` : duration === "60s" ? `Куплет + припев (до ${LYRICS_LIMITS["60s"]} сим.)` : `Полная песня с бриджем (до ${LYRICS_LIMITS["2min"]} сим.)`}
                </p>
              </div>
            </div>

            {/* ═══ STEP 2: Слова песни (Keywords + Lyrics) ═══ */}
            <div className={`space-y-4 p-4 rounded-xl border transition-all duration-300 ${
              currentStep === 2
                ? "border-indigo-500/30 bg-indigo-500/[0.03]"
                : currentStep > 2
                  ? "border-green-500/20 bg-green-500/[0.02]"
                  : "border-[#222] bg-white/[0.01] opacity-40 pointer-events-none"
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white/80 flex items-center gap-2">
                  <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                    currentStep > 2 ? "bg-green-500/20 text-green-400" : currentStep === 2 ? "bg-indigo-500/20 text-indigo-300" : "bg-[#222] text-[#555]"
                  }`}>{currentStep > 2 ? "✓" : "2"}</span>
                  Слова песни
                </span>
                {currentStep === 2 && !lyricsReady && musicPrompt.trim() && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 animate-pulse">
                    Нажмите «Сгенерировать» ✍️
                  </span>
                )}
                {currentStep === 2 && !musicPrompt.trim() && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300">
                    Опишите тему песни
                  </span>
                )}
              </div>

              {/* Keywords */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-medium text-[#777]">О чём будет ваша песня?</label>
                <textarea
                  value={musicPrompt}
                  onChange={(e) => {
                    setMusicPrompt(e.target.value);
                    if (lyricsReady) { setLyricsReady(false); setEditedLyrics(""); }
                  }}
                  placeholder="летняя любовь, танцы на закате, свобода и ветер..."
                  className="w-full h-20 px-4 py-3 rounded-xl bg-white/[0.03] border border-[#333] text-white placeholder-[#555] resize-none focus:border-indigo-500/50 focus:outline-none transition-colors"
                />
              </div>

              {/* Generate Lyrics Button */}
              <button
                type="button"
                onClick={handleGenerateLyrics}
                disabled={!canGenerateLyrics}
                className={`
                  w-full py-2.5 rounded-xl text-sm font-medium transition-all duration-300
                  flex items-center justify-center gap-2
                  ${isGeneratingLyrics
                    ? "bg-indigo-600/50 text-white cursor-wait"
                    : canGenerateLyrics
                      ? "bg-gradient-to-r from-indigo-500/30 to-blue-500/30 border border-indigo-500/40 text-indigo-200 hover:from-indigo-500/40 hover:to-blue-500/40 shadow-[0_0_12px_rgba(99,102,241,0.15)]"
                      : "bg-[#111] border border-[#222] text-[#555] cursor-not-allowed"
                  }
                `}
              >
                {isGeneratingLyrics ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /><span>AI пишет текст...</span></>
                ) : (
                  <><FileText className="w-4 h-4" /><span>Сгенерировать текст</span></>
                )}
              </button>

              {/* Editable Lyrics */}
              {(lyricsReady || editedLyrics) && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-medium text-[#777] flex items-center gap-1.5">
                      <PenLine className="w-3.5 h-3.5" />
                      Текст (можно редактировать)
                    </label>
                    <span className={`text-[10px] font-medium ${
                      lyricsOverLimit
                        ? "text-red-400"
                        : editedLyrics.length > lyricsMaxChars * 0.85
                          ? "text-yellow-400"
                          : "text-[#555]"
                    }`}>
                      {editedLyrics.length} / {lyricsMaxChars}
                    </span>
                  </div>
                  <textarea
                    value={editedLyrics}
                    onChange={(e) => setEditedLyrics(e.target.value)}
                    className={`w-full h-48 px-4 py-3 rounded-xl bg-white/[0.03] border text-white placeholder-[#555] resize-y focus:outline-none transition-colors font-mono text-sm leading-relaxed ${
                      lyricsOverLimit
                        ? "border-red-500/50 focus:border-red-500/70"
                        : "border-indigo-500/30 focus:border-indigo-500/50"
                    }`}
                  />
                  {lyricsOverLimit ? (
                    <p className="text-[10px] text-red-400 font-medium leading-relaxed">
                      Текст слишком длинный — MiniMax принимает максимум {lyricsMaxChars} символов. Сократите на {editedLyrics.length - lyricsMaxChars} сим.
                    </p>
                  ) : (
                    <p className="text-[10px] text-indigo-300/60 leading-relaxed">
                      Отредактируйте текст как хотите — AI споёт именно то, что вы напишете.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ═══ STEP 3: Hint — Запись хита ═══ */}
            <div className={`p-3 rounded-xl border transition-all duration-300 ${
              currentStep === 3
                ? "border-green-500/30 bg-green-500/[0.03]"
                : "border-[#222] bg-white/[0.01] opacity-40"
            }`}>
              <div className="flex items-center gap-2">
                <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
                  currentStep === 3 ? "bg-green-500/20 text-green-400" : "bg-[#222] text-[#555]"
                }`}>3</span>
                <span className={`text-xs font-semibold ${currentStep === 3 ? "text-green-300" : "text-[#555]"}`}>
                  Запись хита
                </span>
                {currentStep === 3 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/20 text-green-300 ml-auto animate-pulse">
                    Всё готово! Жмите кнопку ↓ 🎤
                  </span>
                )}
              </div>
            </div>

            {/* Voice Clone / My Voice */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#888]">Мой голос</label>
              {clonedVoiceId ? (
                <label
                  onClick={() => setUseMyVoice(!useMyVoice)}
                  className={`
                    flex items-center gap-3 cursor-pointer group p-3 rounded-xl border transition-all
                    ${useMyVoice
                      ? "border-indigo-500/50 bg-indigo-500/10"
                      : "border-[#333] hover:border-indigo-500/30 bg-white/[0.02]"
                    }
                  `}
                >
                  <div className={`
                    w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all
                    ${useMyVoice ? "bg-indigo-500 border-indigo-500" : "border-[#444] group-hover:border-[#666]"}
                  `}>
                    {useMyVoice && <Check className="w-3 h-3 text-white" />}
                  </div>
                  <div>
                    <span className="text-sm text-white">Петь моим голосом</span>
                    <p className="text-[10px] text-[#666]">Клонированный голос будет использован</p>
                  </div>
                </label>
              ) : (
                <button
                  onClick={() => setShowCloneModal(true)}
                  className="w-full py-2.5 rounded-xl bg-white/[0.03] border border-[#333] text-sm font-medium text-[#888] hover:text-white hover:border-indigo-500/30 transition-all flex items-center justify-center gap-2"
                >
                  <Mic className="w-4 h-4" />
                  Записать свой голос
                </button>
              )}
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
                  <h3 className="text-sm font-medium text-white">Voice Lab · Speech-to-Speech</h3>
                  <p className="text-xs text-[#666]">Озвучка текста и замена голоса через ElevenLabs S2S</p>
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
            disabled={isGenerating || (mode === "music" ? !canCreateMusic : !voiceText.trim())}
            className={`
              w-full py-3.5 rounded-xl font-medium text-sm
              transition-all duration-300 relative overflow-hidden
              active:scale-[0.98] group
              ${isGenerating
                ? "bg-indigo-600/80 text-white cursor-wait"
                : (mode === "music" ? canCreateMusic : voiceText.trim())
                  ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg shadow-[0_0_20px_rgba(34,197,94,0.3)]"
                  : "bg-[#222] text-[#555] cursor-not-allowed"
              }
            `}
          >
            {!isGenerating && (mode === "music" ? canCreateMusic : voiceText.trim()) && (
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
                  <span>{canCreateMusic ? "Шаг 3: Записать хит 🎤" : !selectedGenre ? "Сначала выберите жанр" : !lyricsReady ? "Сначала сгенерируйте текст" : "Создать песню"}</span>
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
          disabled={isGenerating || (mode === "music" ? !canCreateMusic : !voiceText.trim())}
          className={`
            w-full py-4 px-6 rounded-xl font-medium text-base
            transition-all duration-300 relative overflow-hidden active:scale-[0.98] group
            ${isGenerating
              ? "bg-indigo-600/80 text-white cursor-wait"
              : (mode === "music" ? canCreateMusic : voiceText.trim())
                ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white shadow-lg shadow-[0_0_24px_rgba(34,197,94,0.4)]"
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
                <span>{canCreateMusic ? "Записать хит 🎤" : !selectedGenre ? "Выберите жанр" : !lyricsReady ? "Сгенерируйте текст" : "Создать песню"}</span>
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

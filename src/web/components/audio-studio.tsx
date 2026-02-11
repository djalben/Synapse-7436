import { useState, useRef, useCallback } from "react";
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

type AudioMode = "music" | "voice";
type MusicType = "instrumental" | "lyrics";
type Duration = "30s" | "60s" | "2min";

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

// Audio Player component
const AudioPlayer = ({ 
  audio, 
  isPlaying, 
  onPlayPause 
}: { 
  audio: GeneratedAudio | null; 
  isPlaying: boolean;
  onPlayPause: () => void;
}) => {
  const [progress, setProgress] = useState(0);

  return (
    <div className="bg-white/[0.02] border border-[#333] rounded-2xl p-6 space-y-4">
      {/* Waveform */}
      <div className="bg-black/40 rounded-xl p-4 border border-[#222]">
        <WaveformVisualizer isPlaying={isPlaying} />
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={onPlayPause}
          disabled={!audio}
          className={`
            w-12 h-12 rounded-full flex items-center justify-center
            transition-all duration-300
            ${audio 
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

        {/* Timeline */}
        <div className="flex-1 space-y-1">
          <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-[#666]">
            <span>0:00</span>
            <span>{audio?.duration || "0:00"}</span>
          </div>
        </div>

        {/* Volume */}
        <button className="p-2 rounded-lg bg-white/[0.03] border border-[#333] text-[#888] hover:text-white transition-colors">
          <Volume2 className="w-4 h-4" />
        </button>

        {/* Download */}
        <button 
          disabled={!audio}
          className={`
            p-2 rounded-lg border transition-colors
            ${audio 
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
            {audio.type === "music" ? "Генерация музыки" : "Синтез речи"} • {audio.duration}
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
  const [musicType, setMusicType] = useState<MusicType>("lyrics");
  const [duration, setDuration] = useState<Duration>("60s");
  const [selectedGenre, setSelectedGenre] = useState<string | null>(null);
  const [selectedVoice, setSelectedVoice] = useState<Voice>(presetVoices[0]);
  const [clonedVoices, setClonedVoices] = useState<Voice[]>([]);
  const [showCloneModal, setShowCloneModal] = useState(false);
  
  const [musicPrompt, setMusicPrompt] = useState("");
  const [voiceText, setVoiceText] = useState("");
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<GeneratedAudio | null>(null);
  const [generations, setGenerations] = useState<GeneratedAudio[]>([]);
  
  const CREDIT_COST_MUSIC = 10;
  const CREDIT_COST_VOICE = 3;
  const creditCost = mode === "music" ? CREDIT_COST_MUSIC : CREDIT_COST_VOICE;
  const { setShowPaywall, setPaywallReason, creditBalance, checkCredits, deductCredits } = useUsage();

  const handleGenerate = async () => {
    if (!checkCredits(creditCost)) return;
    setIsGenerating(true);
    deductCredits(creditCost);
    try {
      // TODO: replace with real API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      const newAudio: GeneratedAudio = {
        id: Date.now().toString(),
        type: mode,
        prompt: mode === "music" ? musicPrompt : undefined,
        text: mode === "voice" ? voiceText : undefined,
        duration: duration,
        createdAt: new Date(),
      };
      setCurrentAudio(newAudio);
      setGenerations(prev => [newAudio, ...prev]);
    } finally {
      setIsGenerating(false);
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

        {/* Music Generator Controls */}
        {mode === "music" && (
          <div className="space-y-6">
            {/* Prompt */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#888]">Опишите вашу песню</label>
              <textarea
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                placeholder="энергичная поп-песня о летней любви, электронный бит с запоминающейся мелодией..."
                className="w-full h-32 px-4 py-3 rounded-xl bg-white/[0.03] border border-[#333] text-white placeholder-[#555] resize-none focus:border-indigo-500/50 focus:outline-none transition-colors"
              />
              <div className="flex justify-between mt-2">
                <span className="text-xs text-[#666]">Подробное описание даёт лучший результат</span>
                <span className="text-xs text-[#666]">{musicPrompt.length}/500</span>
              </div>
            </div>

            {/* Music Type Toggle */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#888]">Тип</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setMusicType("lyrics")}
                  className={`
                    flex-1 py-2.5 px-4 rounded-xl text-sm font-medium
                    transition-all duration-300 border
                    ${musicType === "lyrics"
                      ? "bg-indigo-500/20 border-indigo-500/50 text-white"
                      : "bg-white/[0.02] border-[#333] text-[#888] hover:text-white hover:border-[#444]"
                    }
                  `}
                >
                  С вокалом
                </button>
                <button
                  onClick={() => setMusicType("instrumental")}
                  className={`
                    flex-1 py-2.5 px-4 rounded-xl text-sm font-medium
                    transition-all duration-300 border
                    ${musicType === "instrumental"
                      ? "bg-indigo-500/20 border-indigo-500/50 text-white"
                      : "bg-white/[0.02] border-[#333] text-[#888] hover:text-white hover:border-[#444]"
                    }
                  `}
                >
                  Инструментал
                </button>
              </div>
            </div>

            {/* Genre Quick Select */}
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#888]">Жанр (опционально)</label>
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

        {/* Кнопка генерации — на десктопе sticky внизу левой панели (как в Изображениях/Видео) */}
        <div className="hidden md:block sticky bottom-0 z-[50] mt-5 pt-2 pb-2 -mx-6 px-6">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || (mode === "music" ? !musicPrompt.trim() : !voiceText.trim())}
            className={`
              w-full py-4 px-6 rounded-xl font-medium text-base mb-3
              transition-all duration-300 relative overflow-hidden
              active:scale-[0.98]
              group
              ${!isGenerating && (mode === "music" ? musicPrompt.trim() : voiceText.trim())
                ? "bg-[#0070f3] hover:bg-[#0060df] text-white shadow-lg shadow-[0_0_24px_rgba(0,112,243,0.4)]"
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
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>{mode === "music" ? "Создание..." : "Синтез..."}</span>
                </>
              ) : mode === "music" ? (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Создать музыку</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Озвучить текст</span>
                </>
              )}
            </span>
          </button>
          <p className="text-center text-[#666] text-xs mb-3">
            {mode === "music" ? <><span className="text-indigo-400 font-medium">{CREDIT_COST_MUSIC}</span> кредитов за трек</> : <><span className="text-indigo-400 font-medium">{CREDIT_COST_VOICE}</span> кредита за запрос</>} · Осталось: <span className="text-white/90">{creditBalance.toFixed(0)}</span>
          </p>
        </div>
      </div>

      {/* Фиксированная кнопка на мобильных — как в Изображениях и Видео */}
      <div className="md:hidden w-full px-4 pt-3 pb-[calc(env(safe-area-inset-bottom)+12px)] bg-black/95 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.4)] fixed bottom-0 left-0 right-0 z-50">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || (mode === "music" ? !musicPrompt.trim() : !voiceText.trim())}
          className={`
            w-full py-4 px-6 rounded-xl font-medium text-base
            transition-all duration-300 relative overflow-hidden active:scale-[0.98] group
            ${!isGenerating && (mode === "music" ? musicPrompt.trim() : voiceText.trim())
              ? "bg-[#0070f3] hover:bg-[#0060df] text-white shadow-lg shadow-[0_0_24px_rgba(0,112,243,0.4)]"
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
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>{mode === "music" ? "Создание..." : "Синтез..."}</span>
              </>
            ) : mode === "music" ? (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Создать музыку</span>
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

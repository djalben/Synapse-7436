import { useState, useRef, useCallback, useEffect } from "react";
import {
  Camera,
  Sparkles,
  Box,
  Zap,
  Download,
  Maximize2,
  Square,
  RectangleHorizontal,
  RectangleVertical,
  X,
  Loader2,
  Lock,
  Upload,
  ImageIcon,
  Wand2,
  Trash2,
  Palette,
  Star,
} from "lucide-react";
import { useUsage, MAX_FREE_IMAGE_PER_DAY } from "./usage-context";
import { type UserPlan, canAccessModel } from "./model-selector";
import { 
  type SynapseTier, 
  getRequiredTierForImageModel, 
  checkTierAccess, 
  planToTier,
  FRONTEND_TO_BACKEND,
} from "../../config/tiers";
import { addToHistory } from "./placeholder-pages";

// ===== TYPES & INTERFACES =====

// Studio mode - top level
type StudioMode = "generate" | "enhance";

// Generation mode type
type GenerationMode = "text-to-image" | "image-to-image";

// Enhancement tool type
type EnhancementTool = "face-restore" | "colorize" | "beauty-retouch";

// Style option interface
interface StyleOption {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

// Aspect ratio interface
interface AspectRatio {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

// Enhancement tool interface
interface EnhancementToolOption {
  id: EnhancementTool;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  badge: string;
  accentColor: string;
}

// Generated image interface
interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  aspectRatio: string;
  style: string;
  createdAt: string;
}

// Enhanced image result interface
interface EnhancedResult {
  originalUrl: string;
  enhancedUrl: string;
  tool: EnhancementTool;
}

// ===== CONSTANTS =====

// Image engine (model) for generation — только модели из тарифной сетки Synapse
// Включает альтернативные модели для тестирования
type ImageEngineId = "flux-schnell" | "dall-e-3" | "nana-banana" | "flux-pro" | "gemini-pro" | "gpt-4o-latest";

interface ImageEngineOption {
  id: ImageEngineId;
  label: string;
  subtitle?: string; // Метка тарифа (START, CREATOR, PRO STUDIO)
  creditCost: number;
  requiredPlan: UserPlan;
  isLocked?: boolean; // Показывать замок 🔒
}

const imageEngineOptions: ImageEngineOption[] = [
  { id: "flux-schnell", label: "Flux Schnell", subtitle: "START", creditCost: 0, requiredPlan: "free" },
  { id: "dall-e-3", label: "DALL-E 3", subtitle: "CREATOR", creditCost: 1, requiredPlan: "standard" },
  { id: "nana-banana", label: "Nana Banana", subtitle: "CREATOR", creditCost: 1, requiredPlan: "standard" },
  { id: "flux-pro", label: "Flux Pro", subtitle: "PRO STUDIO", creditCost: 2, requiredPlan: "ultra", isLocked: false }, // Разблокировано для тестирования
  // Альтернативные модели для тестирования (все открыты)
  { id: "gemini-pro", label: "Gemini 2.0 Pro", subtitle: "TESTING", creditCost: 1, requiredPlan: "free" },
  { id: "gpt-4o-latest", label: "GPT-4o Latest", subtitle: "TESTING", creditCost: 1, requiredPlan: "free" },
];

const styleOptions: StyleOption[] = [
  { id: "photorealistic", label: "Фотореализм", icon: Camera, description: "Неотличимо от реальности." },
  { id: "anime", label: "Аниме/Манга", icon: Sparkles, description: "Японский анимационный стиль." },
  { id: "3d", label: "3D Рендер", icon: Box, description: "Pixar уровень CGI и персонажи." },
  { id: "cyberpunk", label: "Киберпанк", icon: Zap, description: "Неоновые огни и технологии будущего." },
];

const aspectRatios: AspectRatio[] = [
  { id: "1:1", label: "Квадрат", icon: Square },
  { id: "16:9", label: "Пейзаж", icon: RectangleHorizontal },
  { id: "9:16", label: "Портрет", icon: RectangleVertical },
];

const enhancementTools: EnhancementToolOption[] = [
  {
    id: "face-restore",
    label: "Восстановление лиц",
    icon: Wand2,
    description: "Исправляет размытые лица и улучшает детали",
    badge: "AI",
    accentColor: "blue",
  },
  {
    id: "colorize",
    label: "Колоризация",
    icon: Palette,
    description: "Превращает ч/б фото в цветные",
    badge: "Старые фото",
    accentColor: "rainbow",
  },
  {
    id: "beauty-retouch",
    label: "Ретушь",
    icon: Star,
    description: "Гладкая кожа, свет, профессиональный вид",
    badge: "Портрет",
    accentColor: "pink",
  },
];

// ===== STUDIO MODE TOGGLE (Top Level) =====

interface StudioModeToggleProps {
  mode: StudioMode;
  onChange: (mode: StudioMode) => void;
}

const StudioModeToggle = ({ mode, onChange }: StudioModeToggleProps) => {
  return (
    <div className="relative flex rounded-2xl bg-[#0a0a0a] border border-[#333] p-1.5 mb-6">
      {/* Sliding background indicator */}
      <div 
        className={`
          absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-xl
          bg-gradient-to-r from-indigo-600/40 to-blue-600/40
          border border-indigo-500/40
          shadow-lg shadow-indigo-500/20
          transition-transform duration-300 ease-out
          ${mode === "enhance" ? "translate-x-[calc(100%+6px)]" : "translate-x-0"}
        `}
      />
      
      <button
        onClick={() => onChange("generate")}
        className={`
          relative flex-1 flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl
          transition-all duration-300
          ${mode === "generate" ? "text-white" : "text-[#666] hover:text-[#888]"}
        `}
      >
        <Sparkles className="w-5 h-5" />
        <span className="text-sm font-semibold tracking-wide">Создать новое</span>
      </button>
      
      <button
        onClick={() => onChange("enhance")}
        className={`
          relative flex-1 flex items-center justify-center gap-2.5 py-4 px-6 rounded-xl
          transition-all duration-300
          ${mode === "enhance" ? "text-white" : "text-[#666] hover:text-[#888]"}
        `}
      >
        <Wand2 className="w-5 h-5" />
        <span className="text-sm font-semibold tracking-wide">Улучшить фото</span>
      </button>
    </div>
  );
};

// ===== GENERATION MODE TOGGLE =====

interface ModeToggleProps {
  mode: GenerationMode;
  onChange: (mode: GenerationMode) => void;
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
          ${mode === "image-to-image" ? "translate-x-[calc(100%+8px)]" : "translate-x-0"}
        `}
      />
      
      <button
        onClick={() => onChange("text-to-image")}
        className={`
          relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
          transition-all duration-300
          ${mode === "text-to-image" ? "text-white" : "text-[#666] hover:text-[#888]"}
        `}
      >
        <Wand2 className="w-4 h-4" />
        <span className="text-sm font-medium">Текст в изображение</span>
      </button>
      
      <button
        onClick={() => onChange("image-to-image")}
        className={`
          relative flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg
          transition-all duration-300
          ${mode === "image-to-image" ? "text-white" : "text-[#666] hover:text-[#888]"}
        `}
      >
        <ImageIcon className="w-4 h-4" />
        <span className="text-sm font-medium">Изображение в изображение</span>
      </button>
    </div>
  );
};

// ===== IMAGE UPLOAD DROPZONE =====

interface ImageUploadProps {
  image: string | null;
  onImageChange: (image: string | null) => void;
  required?: boolean;
  disabled?: boolean;
  large?: boolean;
  title?: string;
  subtitle?: string;
}

const ImageUpload = ({ 
  image, 
  onImageChange, 
  required, 
  disabled, 
  large = false,
  title = "Загрузить изображение",
  subtitle = "Перетащите или нажмите для выбора"
}: ImageUploadProps) => {
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
    // Reset input so same file can be selected again
    e.target.value = "";
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onImageChange(null);
  };

  if (image) {
    return (
      <div className={`relative rounded-xl overflow-hidden border border-[#333] group ${large ? "aspect-square" : ""}`}>
        <img 
          src={image} 
          alt="Reference" 
          className={`w-full object-cover ${large ? "h-full" : "h-48"}`}
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
            Изменить фото
          </button>
        </div>
        <div className="absolute top-2 right-2 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm">
          <span className="text-xs text-emerald-400">Фото готово</span>
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
          relative rounded-xl
          border-2 border-dashed
          flex flex-col items-center justify-center gap-3
          cursor-pointer
          transition-all duration-300
          ${large ? "p-12 py-16" : "p-8"}
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
        
        <div className={`
          relative rounded-2xl flex items-center justify-center
          transition-all duration-300
          ${large ? "w-20 h-20" : "w-14 h-14"}
          ${isDragging 
            ? "bg-indigo-500/20" 
            : required 
              ? "bg-amber-500/10"
              : "bg-white/[0.05]"
          }
        `}>
          <Upload className={`
            transition-colors
            ${large ? "w-10 h-10" : "w-6 h-6"}
            ${isDragging 
              ? "text-indigo-400" 
              : required 
                ? "text-amber-400"
                : "text-[#666]"
            }
          `} />
        </div>
        
        <div className="relative text-center">
          <p className={`
            font-medium
            ${large ? "text-base" : "text-sm"}
            ${required ? "text-amber-400" : "text-white/80"}
          `}>
            {required ? `${title} (Обязательно)` : title}
          </p>
          <p className={`text-[#666] mt-1 ${large ? "text-sm" : "text-xs"}`}>
            {subtitle}
          </p>
          <p className={`text-[#555] mt-0.5 ${large ? "text-xs" : "text-xs"}`}>
            JPG, PNG, WebP до 10МБ
          </p>
        </div>
      </div>
    </>
  );
};

// ===== ENHANCEMENT TOOL SELECTOR =====

interface EnhancementToolSelectorProps {
  selected: EnhancementTool | null;
  onChange: (tool: EnhancementTool) => void;
}

const EnhancementToolSelector = ({ selected, onChange }: EnhancementToolSelectorProps) => {
  const getAccentClasses = (tool: EnhancementToolOption, isSelected: boolean) => {
    if (!isSelected) return {
      bg: "bg-white/[0.05] group-hover:bg-white/[0.08]",
      icon: "text-[#666] group-hover:text-[#888]",
      badge: "bg-white/5 text-[#666]"
    };
    
    switch (tool.accentColor) {
      case "blue":
        return {
          bg: "bg-gradient-to-br from-blue-500/30 to-cyan-500/20",
          icon: "text-blue-400",
          badge: "bg-blue-500/20 text-blue-300 border-blue-500/30"
        };
      case "rainbow":
        return {
          bg: "bg-gradient-to-br from-pink-500/20 via-purple-500/20 to-blue-500/20",
          icon: "text-purple-400",
          badge: "bg-purple-500/20 text-purple-300 border-purple-500/30"
        };
      case "pink":
        return {
          bg: "bg-gradient-to-br from-pink-500/30 to-rose-500/20",
          icon: "text-pink-400",
          badge: "bg-pink-500/20 text-pink-300 border-pink-500/30"
        };
      default:
        return {
          bg: "bg-gradient-to-br from-indigo-500/30 to-blue-500/20",
          icon: "text-indigo-400",
          badge: "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
        };
    }
  };

  return (
    <div className="space-y-3">
      {enhancementTools.map((tool) => {
        const Icon = tool.icon;
        const isSelected = selected === tool.id;
        const accentClasses = getAccentClasses(tool, isSelected);

        return (
          <button
            key={tool.id}
            onClick={() => onChange(tool.id)}
            className={`
              relative w-full p-4 rounded-xl text-left
              transition-all duration-300
              group
              ${isSelected
                ? `bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/20 shadow-lg shadow-${tool.accentColor === 'blue' ? 'blue' : tool.accentColor === 'pink' ? 'pink' : 'purple'}-500/10`
                : "bg-white/[0.02] border border-[#333] hover:border-[#444] hover:bg-white/[0.04]"
              }
            `}
          >
            {/* Glow effect for selected */}
            {isSelected && (
              <div className={`absolute inset-0 rounded-xl blur-xl opacity-40
                ${tool.accentColor === 'blue' ? 'bg-blue-500/20' : 
                  tool.accentColor === 'pink' ? 'bg-pink-500/20' : 
                  'bg-purple-500/20'}
              `} />
            )}

            <div className="relative flex items-center gap-4">
              {/* Icon */}
              <div className={`
                w-12 h-12 rounded-xl flex items-center justify-center
                transition-all duration-300
                ${accentClasses.bg}
              `}>
                <Icon className={`w-6 h-6 transition-colors ${accentClasses.icon}`} />
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className={`font-semibold transition-colors ${isSelected ? "text-white" : "text-white/80"}`}>
                    {tool.label}
                  </p>
                  <span className={`
                    px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wide
                    border transition-colors
                    ${accentClasses.badge}
                  `}>
                    {tool.badge}
                  </span>
                </div>
                <p className="text-xs text-[#666]">{tool.description}</p>
              </div>

              {/* Selected indicator */}
              {isSelected && (
                <div className={`
                  w-3 h-3 rounded-full animate-pulse
                  ${tool.accentColor === 'blue' ? 'bg-blue-500' : 
                    tool.accentColor === 'pink' ? 'bg-pink-500' : 
                    'bg-purple-500'}
                `} />
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
};

// ===== IMAGE ENGINE SELECTOR (единая сетка моделей над промптом) =====

interface ImageEngineSelectorProps {
  selected: ImageEngineId;
  onChange: (value: ImageEngineId) => void;
  userPlan: "free" | "lite" | "standard" | "ultra";
  onPremiumClick: () => void;
}

const ImageEngineSelector = ({ selected, onChange, userPlan, onPremiumClick }: ImageEngineSelectorProps) => {
  const userTier = planToTier(userPlan);
  
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-[#888]">Модель</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {imageEngineOptions.map((engine) => {
          const isSelected = selected === engine.id;
          // ВРЕМЕННО ОТКЛЮЧЕНО: Проверка доступа по тарифу (режим тестирования)
          // const backendId = FRONTEND_TO_BACKEND[engine.id] || engine.id;
          // const requiredTier = getRequiredTierForImageModel(backendId);
          // const accessCheck = checkTierAccess(userTier, requiredTier);
          // const isLocked = !accessCheck.allowed || engine.isLocked;
          const isLocked = false; // Все модели доступны для тестирования
          
          // Определяем requiredTier из engine.subtitle для отображения цвета метки
          // Преобразуем "PRO STUDIO" -> "PRO_STUDIO" для совместимости с типом SynapseTier
          // Модели "TESTING" отображаются как START для единообразия
          const requiredTier: SynapseTier = engine.subtitle === "START" ? "START" :
            engine.subtitle === "CREATOR" ? "CREATOR" :
            engine.subtitle === "PRO STUDIO" ? "PRO_STUDIO" :
            engine.subtitle === "MAXIMAL" ? "MAXIMAL" :
            engine.subtitle === "TESTING" ? "START" : "START"; // TESTING модели отображаются как START

          return (
            <button
              key={engine.id}
              type="button"
              onClick={() => {
                if (isLocked) {
                  onPremiumClick();
                  return;
                }
                onChange(engine.id);
              }}
              className={`
                relative flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-xl
                transition-all duration-300 backdrop-blur-xl
                min-h-[52px]
                ${engine.isExclusive && isSelected
                  ? "bg-amber-500/20 border border-amber-500/40"
                  : isSelected
                    ? "bg-indigo-500/20 border border-indigo-500/40"
                    : isLocked
                      ? "bg-white/[0.02] border border-[#333] hover:border-amber-500/30"
                      : "bg-white/[0.04] border border-[#333] hover:border-[#444] hover:bg-white/[0.06]"
                }
              `}
            >
              {isLocked && (
                <Lock className="w-3.5 h-3.5 absolute top-1.5 right-1.5 text-amber-400" aria-hidden />
              )}
              <span className={`text-xs font-medium truncate w-full text-center ${engine.isExclusive && isSelected ? "text-amber-200" : isSelected ? "text-indigo-200" : "text-white/90"}`}>
                {engine.label}
              </span>
              {engine.subtitle && (
                <span className={`text-[9px] font-medium ${
                  requiredTier === "START" ? "text-emerald-400" :
                  requiredTier === "CREATOR" ? "text-blue-400" :
                  requiredTier === "PRO_STUDIO" ? "text-amber-400" :
                  "text-purple-400"
                }`}>
                  {engine.subtitle}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ===== STYLE SELECTOR =====

interface StyleSelectorProps {
  selected: string;
  onChange: (value: string) => void;
}

const StyleSelector = ({ selected, onChange }: StyleSelectorProps) => {
  return (
    <div className="grid grid-cols-2 gap-3">
      {styleOptions.map((style) => {
        const Icon = style.icon;
        const isSelected = selected === style.id;

        return (
          <button
            key={style.id}
            onClick={() => onChange(style.id)}
            className={`
              relative p-4 rounded-xl text-left
              transition-all duration-300
              group
              backdrop-blur-xl
              ${isSelected
                ? "bg-gradient-to-br from-indigo-500/20 via-blue-500/15 to-purple-500/10 border border-indigo-500/40"
                : "bg-white/[0.04] border border-[#333] hover:border-[#444] hover:bg-white/[0.06]"
              }
            `}
          >
            {/* Glow effect for selected */}
            {isSelected && (
              <div className="absolute inset-0 rounded-xl bg-indigo-500/10 blur-xl opacity-60" />
            )}

            <div className="relative">
              <div
                className={`
                  w-10 h-10 rounded-lg flex items-center justify-center mb-3
                  transition-all duration-300
                  ${isSelected
                    ? "bg-gradient-to-br from-indigo-500/30 to-blue-500/30"
                    : "bg-white/[0.05] group-hover:bg-white/[0.08]"
                  }
                `}
              >
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isSelected ? "text-indigo-400" : "text-[#666] group-hover:text-[#888]"
                  }`}
                />
              </div>
              <p
                className={`text-sm font-medium transition-colors ${
                  isSelected ? "text-white" : "text-white/80"
                }`}
              >
                {style.label}
              </p>
              <p className="text-xs text-[#555] mt-0.5">{style.description}</p>
            </div>

            {/* Selected indicator */}
            {isSelected && (
              <div className="absolute top-3 right-3 w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
            )}
          </button>
        );
      })}
    </div>
  );
};

// ===== ASPECT RATIO SELECTOR =====

interface AspectRatioSelectorProps {
  selected: string;
  onChange: (value: string) => void;
}

const AspectRatioSelector = ({ selected, onChange }: AspectRatioSelectorProps) => {
  return (
    <div className="flex gap-2">
      {aspectRatios.map((ratio) => {
        const Icon = ratio.icon;
        const isSelected = selected === ratio.id;

        return (
          <button
            key={ratio.id}
            onClick={() => onChange(ratio.id)}
            className={`
              flex-1 flex items-center justify-center gap-2 py-3 rounded-xl
              transition-all duration-300
              ${isSelected
                ? "bg-gradient-to-r from-indigo-500/20 to-blue-500/20 border border-indigo-500/40"
                : "bg-white/[0.02] border border-[#333] hover:border-[#444]"
              }
            `}
          >
            <Icon
              className={`w-4 h-4 ${isSelected ? "text-indigo-400" : "text-[#666]"}`}
            />
            <span
              className={`text-sm font-medium ${
                isSelected ? "text-white" : "text-[#888]"
              }`}
            >
              {ratio.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};

// ===== IMAGE COUNT SLIDER =====

interface ImageCountSliderProps {
  value: number;
  onChange: (value: number) => void;
}

const ImageCountSlider = ({ value, onChange }: ImageCountSliderProps) => {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#666]">1</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-mono font-semibold text-white">{value}</span>
          <span className="text-sm text-[#666]">изображений</span>
        </div>
        <span className="text-xs text-[#666]">4</span>
      </div>
      <input
        type="range"
        min="1"
        max="4"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="
          w-full h-1.5 bg-[#222] rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-5
          [&::-webkit-slider-thumb]:h-5
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-gradient-to-r
          [&::-webkit-slider-thumb]:from-indigo-500
          [&::-webkit-slider-thumb]:to-blue-500
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:shadow-lg
          [&::-webkit-slider-thumb]:shadow-indigo-500/40
          [&::-webkit-slider-thumb]:transition-shadow
          [&::-webkit-slider-thumb]:hover:shadow-indigo-500/60
          [&::-moz-range-thumb]:w-5
          [&::-moz-range-thumb]:h-5
          [&::-moz-range-thumb]:rounded-full
          [&::-moz-range-thumb]:bg-gradient-to-r
          [&::-moz-range-thumb]:from-indigo-500
          [&::-moz-range-thumb]:to-blue-500
          [&::-moz-range-thumb]:border-0
          [&::-moz-range-thumb]:cursor-pointer
        "
        style={{
          background: `linear-gradient(to right, #6366f1 0%, #6366f1 ${((value - 1) / 3) * 100}%, #222 ${((value - 1) / 3) * 100}%, #222 100%)`,
        }}
      />
    </div>
  );
};

// ===== LIGHTBOX MODAL =====

interface LightboxProps {
  image: GeneratedImage | null;
  onClose: () => void;
}

const Lightbox = ({ image, onClose }: LightboxProps) => {
  if (!image) return null;

  const handleDownload = async () => {
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synapse-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/90 backdrop-blur-sm" />
      
      {/* Content */}
      <div
        className="relative z-10 max-w-[90vw] max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="
            absolute -top-12 right-0 p-2 rounded-lg
            bg-white/10 backdrop-blur-md border border-white/20
            text-white/80 hover:text-white hover:bg-white/20
            transition-all duration-200
          "
        >
          <X className="w-5 h-5" />
        </button>

        {/* Image */}
        <div className="relative rounded-xl overflow-hidden border border-[#333]">
          <img
            src={image.url}
            alt={image.prompt}
            className="max-w-full max-h-[75vh] object-contain"
          />
        </div>

        {/* Info panel */}
        <div className="mt-4 p-4 rounded-xl bg-white/5 backdrop-blur-md border border-[#333]">
          <p className="text-sm text-white/80 line-clamp-2">{image.prompt}</p>
          <div className="flex items-center gap-4 mt-3">
            <span className="text-xs text-[#666]">Стиль: <span className="text-white/60 capitalize">{image.style}</span></span>
            <span className="text-xs text-[#666]">Соотношение: <span className="text-white/60">{image.aspectRatio}</span></span>
            <button
              onClick={handleDownload}
              className="
                ml-auto flex items-center gap-2 px-4 py-2 rounded-lg
                bg-gradient-to-r from-indigo-600 to-blue-600
                text-white text-sm font-medium
                hover:shadow-lg hover:shadow-indigo-500/30
                transition-all duration-200
              "
            >
              <Download className="w-4 h-4" />
              Скачать
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== IMAGE CARD =====

interface ImageCardProps {
  image: GeneratedImage;
  onImageClick: (image: GeneratedImage) => void;
}

const ImageCard = ({ image, onImageClick }: ImageCardProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const response = await fetch(image.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synapse-${image.id}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  // Calculate height based on aspect ratio
  const getHeightClass = () => {
    switch (image.aspectRatio) {
      case "9:16": return "h-80";
      case "16:9": return "h-44";
      default: return "h-64";
    }
  };

  return (
    <div
      className={`
        relative rounded-xl overflow-hidden
        ${getHeightClass()}
        border border-[#222] hover:border-[#444]
        group cursor-pointer
        transition-all duration-300
        hover:scale-[1.02] hover:shadow-xl hover:shadow-indigo-500/10
        mb-4
      `}
      onClick={() => onImageClick(image)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Skeleton loader */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] animate-pulse flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-indigo-500/50 animate-spin" />
        </div>
      )}

      {/* Image */}
      <img
        src={image.url}
        alt={image.prompt}
        className={`
          w-full h-full object-cover
          transition-all duration-500
          ${isLoaded ? "opacity-100" : "opacity-0"}
          ${isHovered ? "scale-105" : "scale-100"}
        `}
        onLoad={() => setIsLoaded(true)}
      />

      {/* Hover overlay */}
      <div
        className={`
          absolute inset-0
          bg-gradient-to-t from-black/80 via-black/40 to-transparent
          transition-opacity duration-300
          ${isHovered ? "opacity-100" : "opacity-0"}
        `}
      >
        {/* Action buttons */}
        <div
          className={`
            absolute bottom-4 left-4 right-4
            flex gap-2
            transition-all duration-300
            ${isHovered ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}
          `}
        >
          <button
            onClick={handleDownload}
            className="
              flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg
              bg-white/10 backdrop-blur-md border border-white/20
              text-white text-sm font-medium
              hover:bg-white/20 transition-colors
            "
          >
            <Download className="w-4 h-4" />
            <span>Скачать</span>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onImageClick(image);
            }}
            className="
              px-3 py-2.5 rounded-lg
              bg-white/10 backdrop-blur-md border border-white/20
              text-white
              hover:bg-white/20 transition-colors
            "
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Subtle gradient overlay at top for depth */}
      <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
};

// ===== BEFORE/AFTER SLIDER COMPONENT =====

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
}

const BeforeAfterSlider = ({ beforeImage, afterImage }: BeforeAfterSliderProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoaded, setIsLoaded] = useState({ before: false, after: false });

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    handleMove(e.clientX);
  }, [handleMove]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setIsDragging(true);
    handleMove(e.touches[0].clientX);
  }, [handleMove]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return;
    handleMove(e.touches[0].clientX);
  }, [isDragging, handleMove]);

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse up listener for better UX
  const handleGlobalMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  // Attach global listeners when dragging
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    window.addEventListener('mouseup', handleGlobalMouseUp);
    window.addEventListener('mousemove', handleGlobalMouseMove);
    
    return () => {
      window.removeEventListener('mouseup', handleGlobalMouseUp);
      window.removeEventListener('mousemove', handleGlobalMouseMove);
    };
  }, [handleGlobalMouseUp, handleGlobalMouseMove]);

  const allLoaded = isLoaded.before && isLoaded.after;

  return (
    <div 
      ref={containerRef}
      className={`
        relative w-full aspect-square rounded-xl overflow-hidden 
        border border-[#333] cursor-ew-resize select-none
        ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
      `}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Loading skeleton */}
      {!allLoaded && (
        <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] animate-pulse flex items-center justify-center z-20">
          <Loader2 className="w-8 h-8 text-indigo-500/50 animate-spin" />
        </div>
      )}

      {/* After Image (Full) - Bottom layer */}
      <img
        src={afterImage}
        alt="After enhancement"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${allLoaded ? 'opacity-100' : 'opacity-0'}`}
        onLoad={() => setIsLoaded(prev => ({ ...prev, after: true }))}
        draggable={false}
      />

      {/* Before Image (Clipped) - Top layer */}
      <div 
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
      >
        <img
          src={beforeImage}
          alt="Before enhancement"
          className={`w-full h-full object-cover transition-opacity duration-300 ${allLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setIsLoaded(prev => ({ ...prev, before: true }))}
          draggable={false}
        />
      </div>

      {/* Slider Handle */}
      <div 
        className={`
          absolute top-0 bottom-0 w-1 -translate-x-1/2 z-10
          transition-opacity duration-300
          ${allLoaded ? 'opacity-100' : 'opacity-0'}
        `}
        style={{ left: `${sliderPosition}%` }}
      >
        {/* Vertical line */}
        <div className="absolute inset-0 bg-white shadow-lg shadow-black/50" />
        
        {/* Handle circle */}
        <div 
          className={`
            absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2
            w-12 h-12 rounded-full
            bg-white/10 backdrop-blur-md border-2 border-white
            flex items-center justify-center
            shadow-xl shadow-black/30
            transition-all duration-200
            ${isDragging ? 'scale-110 shadow-2xl shadow-indigo-500/30' : 'hover:scale-105'}
          `}
        >
          {/* Arrows */}
          <div className="flex items-center gap-1 text-white">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>

        {/* Glow effect */}
        {isDragging && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-indigo-500/30 blur-xl pointer-events-none" />
        )}
      </div>

      {/* Labels */}
      <div 
        className={`
          absolute top-4 left-4 px-3 py-1.5 rounded-lg 
          bg-black/60 backdrop-blur-sm
          transition-all duration-300
          ${allLoaded ? 'opacity-100' : 'opacity-0'}
          ${sliderPosition < 15 ? 'opacity-0' : ''}
        `}
      >
        <span className="text-xs font-medium text-white/80">До</span>
      </div>
      
      <div 
        className={`
          absolute top-4 right-4 px-3 py-1.5 rounded-lg 
          bg-gradient-to-r from-indigo-600/80 to-blue-600/80 backdrop-blur-sm
          transition-all duration-300
          ${allLoaded ? 'opacity-100' : 'opacity-0'}
          ${sliderPosition > 85 ? 'opacity-0' : ''}
        `}
      >
        <span className="text-xs font-medium text-white">После</span>
      </div>

      {/* Hint text */}
      {allLoaded && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg bg-black/40 backdrop-blur-sm opacity-60 pointer-events-none">
          <span className="text-[10px] text-white/70">Перетащите для сравнения</span>
        </div>
      )}
    </div>
  );
};

// ===== BEFORE/AFTER COMPARISON WRAPPER =====

interface BeforeAfterComparisonProps {
  result: EnhancedResult;
  onDownload: (url: string, type: 'before' | 'after') => void;
}

const BeforeAfterComparison = ({ result, onDownload }: BeforeAfterComparisonProps) => {
  const getToolLabel = (tool: EnhancementTool) => {
    switch (tool) {
      case "face-restore": return "Лицо восстановлено";
      case "colorize": return "Колоризировано";
      case "beauty-retouch": return "Отретушировано";
    }
  };

  return (
    <div className="space-y-6">
      {/* Slider Component */}
      <BeforeAfterSlider 
        beforeImage={result.originalUrl} 
        afterImage={result.enhancedUrl} 
      />

      {/* Enhancement Info */}
      <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-[#333]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-indigo-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-white">{getToolLabel(result.tool)}</p>
            <p className="text-xs text-[#666]">AI улучшение завершено</p>
          </div>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-500/10 border border-emerald-500/30">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-emerald-400 font-medium">Готово</span>
        </div>
      </div>

      {/* Download Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={() => onDownload(result.originalUrl, 'before')}
          className="
            py-3 rounded-xl bg-white/5 border border-[#333] 
            text-sm text-[#888] font-medium
            hover:bg-white/10 hover:border-[#444] 
            transition-all duration-200 
            flex items-center justify-center gap-2
            active:scale-[0.98]
          "
        >
          <Download className="w-4 h-4" />
          Оригинал
        </button>
        
        <button
          onClick={() => onDownload(result.enhancedUrl, 'after')}
          className="
            py-3 rounded-xl 
            bg-gradient-to-r from-indigo-600 to-blue-600 
            text-sm text-white font-medium
            hover:shadow-lg hover:shadow-indigo-500/30 
            transition-all duration-200 
            flex items-center justify-center gap-2
            active:scale-[0.98]
          "
        >
          <Download className="w-4 h-4" />
          Улучшенное
        </button>
      </div>
    </div>
  );
};

// ===== ENHANCE PHOTO PANEL =====

interface EnhancePhotoPanelProps {
  imageCount: number;
  limits: { maxImages: number };
  atLimit: boolean;
  checkImageLimit: () => boolean;
  incrementImages: () => void;
  setShowPaywall: (show: boolean) => void;
  setPaywallReason: (reason: string) => void;
}

const EnhancePhotoPanel = ({ 
  imageCount, 
  limits, 
  atLimit, 
  checkImageLimit,
  incrementImages,
  setShowPaywall, 
  setPaywallReason 
}: EnhancePhotoPanelProps) => {
  const [enhanceImage, setEnhanceImage] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<EnhancementTool | null>(null);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enhancedResult, setEnhancedResult] = useState<EnhancedResult | null>(null);

  const canEnhance = enhanceImage && selectedTool && !isEnhancing && !atLimit;

  const handleEnhance = async () => {
    if (!canEnhance) return;
    
    // Check limit before processing (enhancement costs 2 credits, but we check for at least 1)
    if (!checkImageLimit()) return;
    
    setIsEnhancing(true);
    setError(null);

    try {
      const response = await fetch("/api/enhance", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image: enhanceImage,
          tool: selectedTool,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to enhance image");
      }

      setEnhancedResult({
        originalUrl: enhanceImage,
        enhancedUrl: data.enhancedUrl,
        tool: selectedTool,
      });
      
      // Increment usage after successful enhancement (costs 2 credits)
      incrementImages();
      incrementImages();
    } catch (err) {
      console.error("Enhancement error:", err);
      setError(err instanceof Error ? err.message : "Failed to enhance image");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleDownload = async (url: string, type: 'before' | 'after') => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = `synapse-${type}-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleNewEnhancement = () => {
    setEnhancedResult(null);
    setEnhanceImage(null);
    setSelectedTool(null);
  };

  return (
    <div className="flex flex-col md:flex-row h-full min-h-screen">
      {/* Left Panel - Controls */}
      <div className="w-full md:w-[35%] md:min-w-[360px] border-b md:border-b-0 md:border-r border-[#222] p-4 md:p-6 overflow-y-auto">
        <div className="space-y-5 md:space-y-6">
          {/* Header */}
          <div>
            <h2 className="font-mono text-xl md:text-2xl font-semibold text-white mb-1 flex items-center gap-3">
              <span className="text-2xl">✨</span>
              Enhance Photo
            </h2>
            <p className="text-sm text-[#666]">
              Works with blurry, old, or B&W photos
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 md:p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Upload Zone */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#888]">
              Ваше фото
              <span className="text-indigo-400 ml-1">*</span>
            </label>
            <ImageUpload
              image={enhanceImage}
              onImageChange={(img) => {
                setEnhanceImage(img);
                setEnhancedResult(null);
              }}
              required
              disabled={isEnhancing}
              large
              title="Загрузите фото для улучшения"
              subtitle="Перетащите фото или нажмите для выбора"
            />
          </div>

          {/* Magic Tools Section */}
          {enhanceImage && (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <label className="text-sm font-medium text-[#888]">Выберите улучшение</label>
              <EnhancementToolSelector
                selected={selectedTool}
                onChange={(tool) => {
                  setSelectedTool(tool);
                  setEnhancedResult(null);
                }}
              />
            </div>
          )}

          {/* Limit warning */}
          {atLimit && (
            <button
              onClick={() => {
                setPaywallReason("images");
                setShowPaywall(true);
              }}
              className="
                w-full p-3 md:p-4 rounded-xl
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
                Free enhancements exhausted
              </span>
              <span className="text-amber-400/60 text-xs group-hover:text-amber-400 transition-colors">
                Upgrade →
              </span>
            </button>
          )}

          {/* Enhance Button */}
          <button
            onClick={enhancedResult ? handleNewEnhancement : handleEnhance}
            disabled={!enhancedResult && !canEnhance}
            className={`
              w-full py-4 rounded-xl
              font-medium text-base
              transition-all duration-300
              relative overflow-hidden
              group
              active:scale-[0.98]
              ${enhancedResult
                ? "bg-white/10 border border-white/20 text-white hover:bg-white/15"
                : canEnhance
                  ? "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
                  : "bg-[#222] text-[#555] cursor-not-allowed"
              }
            `}
          >
            {/* Shimmer effect */}
            {canEnhance && !enhancedResult && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            )}
            
            <div className="relative flex items-center justify-center gap-2">
              {isEnhancing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Улучшаем...</span>
                </>
              ) : enhancedResult ? (
                <>
                  <Sparkles className="w-5 h-5" />
                  <span>Улучшить ещё фото</span>
                </>
              ) : atLimit ? (
                <>
                  <Lock className="w-5 h-5 text-[#555]" />
                  <span>Обновите для улучшения</span>
                </>
              ) : (
                <>
                  <Wand2 className={`w-5 h-5 ${canEnhance ? "text-white/90" : "text-[#555]"}`} />
                  <span>Улучшить фото ⚡</span>
                </>
              )}
            </div>
          </button>

          {/* Credits Note */}
          <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-white/[0.02] border border-[#222]">
            <span className="text-xs text-[#666]">
              Расход: <span className="text-indigo-400 font-medium">2 кредита</span> за улучшение
            </span>
            <span className="text-[#444]">•</span>
            <span className={`text-xs ${atLimit ? "text-red-400" : "text-[#666]"}`}>
              <span className={`font-medium ${atLimit ? "text-red-400" : "text-white/80"}`}>
                {imageCount}/{limits.maxImages}
              </span> использовано
            </span>
          </div>
        </div>
      </div>

      {/* Right Panel - Results */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="mb-6">
            <h3 className="font-mono text-lg font-semibold text-white">Результат</h3>
            <p className="text-sm text-[#666]">
              {enhancedResult ? "Ваше улучшенное фото готово" : "Здесь появится результат улучшения"}
            </p>
          </div>

          {/* Enhanced Result */}
          {enhancedResult ? (
            <BeforeAfterComparison result={enhancedResult} onDownload={handleDownload} />
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center h-[40vh] md:h-[60vh] text-center px-4">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-[#333] flex items-center justify-center mb-4 md:mb-6">
                <Wand2 className="w-8 h-8 md:w-10 md:h-10 text-[#444]" />
              </div>
              <h3 className="text-base md:text-lg font-medium text-white/80 mb-2">
                {enhanceImage 
                  ? "Выберите инструмент улучшения"
                  : "Загрузите фото для улучшения"
                }
              </h3>
              <p className="text-sm text-[#666] max-w-xs">
                {enhanceImage 
                  ? "Выберите Face Restore, Colorize или Beauty Retouch для преображения фото"
                  : "Наш ИИ восстановит размытые лица, добавит цвет к ч/б фото или применит ретушь"
                }
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ===== GENERATE PANEL =====

interface GeneratePanelProps {
  imageCount: number;
  limits: { maxImages: number };
  atLimit: boolean;
  checkImageLimit: () => boolean;
  incrementImages: () => void;
  userPlan: "free" | "lite" | "standard" | "ultra";
  freeImageCountToday: number;
  checkFreeImageDailyLimit: () => boolean;
  incrementFreeImageDaily: () => void;
  setShowPaywall: (show: boolean) => void;
  setPaywallReason: (reason: string) => void;
}

const GeneratePanel = ({
  imageCount: usedImages,
  limits,
  atLimit,
  checkImageLimit,
  incrementImages,
  userPlan,
  freeImageCountToday,
  checkFreeImageDailyLimit,
  incrementFreeImageDaily,
  setShowPaywall,
  setPaywallReason,
}: GeneratePanelProps) => {
  const [prompt, setPrompt] = useState("");
  const [mode, setMode] = useState<GenerationMode>("text-to-image");
  const [referenceImage, setReferenceImage] = useState<string | null>(null);
  const [selectedEngine, setSelectedEngine] = useState<ImageEngineId>("flux-schnell");
  const [selectedStyle, setSelectedStyle] = useState("photorealistic");
  const [aspectRatio, setAspectRatio] = useState("1:1");
  const [imageCount, setImageCount] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  const isNanaBanana = selectedEngine === "nana-banana";
  const isFreeEngine = selectedEngine === "kandinsky-3.1" || selectedEngine === "flux-schnell";
  const atFreeDailyLimit = isFreeEngine && freeImageCountToday >= MAX_FREE_IMAGE_PER_DAY;
  const effectiveAtLimit = isNanaBanana ? atLimit : (isFreeEngine ? atFreeDailyLimit : atLimit);

  // Check if image-to-image mode is ready
  const isImg2ImgReady = mode === "text-to-image" || (mode === "image-to-image" && referenceImage);

  const handleGenerate = async () => {
    if (!prompt.trim() || isGenerating) return;
    
    if (mode === "image-to-image" && !referenceImage) {
      setError("Пожалуйста, загрузите референсное изображение для режима Image-to-Image");
      return;
    }
    
    if (isNanaBanana) {
      if (!checkImageLimit()) return;
    } else if (isFreeEngine) {
      if (!checkFreeImageDailyLimit()) return;
    } else {
      if (!checkImageLimit()) return;
    }

    setIsGenerating(true);
    setError(null);

    // Log generation start time
    const generationStartTime = Date.now();

    try {
      // Диагностика: сначала проверяем доступность API
      const debugResponse = await fetch("/api/debug").catch(() => null);
      if (debugResponse) {
        const debugData = await debugResponse.json().catch(() => null);
        console.log("[Image Studio] API Debug Info:", debugData);
      }
      
      const apiUrl = "/api/image";
      console.log("[Image Studio] Sending request to:", apiUrl, {
        method: "POST",
        prompt: prompt.trim().substring(0, 50) + "...",
        aspectRatio,
        numImages: imageCount,
        startTime: new Date(generationStartTime).toISOString(),
      });
      
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-User-Plan": userPlan,
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
          aspectRatio,
          numImages: imageCount,
          style: isNanaBanana ? "niji-v6" : selectedStyle,
          mode,
          referenceImage: mode === "image-to-image" ? referenceImage : null,
          specializedEngine: isNanaBanana ? "niji-v6" : null,
          engine: selectedEngine,
        }),
      });
      
      console.log("[Image Studio] Response received:", {
        status: response.status,
        statusText: response.statusText,
        url: response.url,
        ok: response.ok,
        elapsedTime: Date.now() - generationStartTime,
      });

      // Проверяем статус ответа перед парсингом JSON
      if (!response.ok) {
        // Пытаемся прочитать текст ответа для отладки
        const text = await response.text();
        console.error("[Image Studio] Server error response:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url,
          headers: Object.fromEntries(response.headers.entries()),
          body: text.substring(0, 1000), // Первые 1000 символов для отладки
          requestBody: {
            engine: selectedEngine,
            specializedEngine: isNanaBanana ? "niji-v6" : null,
            mode,
            promptLength: prompt.trim().length,
          },
        });
        
        // Пытаемся распарсить как JSON, если не получилось - используем текст
        let errorMessage = "Failed to generate images";
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorMessage;
          console.error("[Image Studio] Parsed error data:", errorData);
        } catch {
          // Если это HTML страница ошибки, показываем понятное сообщение
          if (text.includes("<!DOCTYPE") || text.includes("<html")) {
            errorMessage = `Server returned HTML instead of JSON (status ${response.status}). Please check API configuration.`;
            console.error("[Image Studio] Server returned HTML error page");
          } else {
            errorMessage = text.substring(0, 200) || errorMessage;
          }
        }
        
        throw new Error(errorMessage);
      }

      // Только если response.ok === true, парсим JSON
      const data = await response.json();

      // Check if this is a Replicate prediction ID (needs polling)
      if (data.id && data.provider === "replicate") {
        const predictionId = data.id;
        console.log("[Image Studio] Received Replicate prediction ID, starting polling:", predictionId);
        
        // Poll for result on frontend
        const pollStartTime = Date.now();
        let pollAttempts = 0;
        const maxPollAttempts = 120; // 2 minutes max (1 second intervals)
        
        while (pollAttempts < maxPollAttempts) {
          await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second between polls
          pollAttempts++;
          
          const statusResponse = await fetch(`/api/image/status/${predictionId}`);
          
          if (!statusResponse.ok) {
            throw new Error(`Failed to check prediction status: ${statusResponse.statusText}`);
          }
          
          const statusData = await statusResponse.json();
          console.log(`[Image Studio] Poll attempt ${pollAttempts}:`, {
            status: statusData.status,
            elapsedTime: Date.now() - pollStartTime,
          });
          
          if (statusData.status === "succeeded") {
            const imageUrl = Array.isArray(statusData.output) ? statusData.output[0] : statusData.output;
            
            if (imageUrl) {
              const totalTime = Date.now() - generationStartTime;
              console.log("[Image Studio] Generation completed:", {
                totalTimeMs: totalTime,
                totalTimeSeconds: (totalTime / 1000).toFixed(2),
                pollAttempts,
                pollTimeMs: Date.now() - pollStartTime,
              });
              
              const generatedImage = {
                id: `${Date.now()}-0`,
                url: imageUrl,
                prompt: prompt.trim(),
                aspectRatio: data.aspectRatio,
                style: data.style,
                mode: data.mode,
                createdAt: new Date().toISOString(),
                creditCost: 1,
              };
              
              setGeneratedImages((prev) => [generatedImage, ...prev]);
              incrementImages();
              
              // Сохранить в историю
              const engineCost = imageEngineOptions.find(e => e.id === selectedEngine)?.creditCost || 0;
              addToHistory({
                type: "image",
                prompt: prompt.trim(),
                model: selectedEngine,
                result: imageUrl,
                credits: engineCost,
              });
              
              setPrompt("");
              return; // Success, exit function
            }
          } else if (statusData.status === "failed" || statusData.status === "canceled") {
            throw new Error(statusData.error || "Image generation failed");
          }
          // Continue polling if status is "starting" or "processing"
        }
        
        // If we exit the loop, it means we timed out
        throw new Error("Image generation timed out. Please try again.");
      }

      // Handle regular OpenRouter response (immediate images)
      if (data.images && Array.isArray(data.images)) {
        const totalTime = Date.now() - generationStartTime;
        console.log("[Image Studio] Generation completed:", {
          totalTimeMs: totalTime,
          totalTimeSeconds: (totalTime / 1000).toFixed(2),
          imageCount: data.images.length,
        });

        setGeneratedImages((prev) => [...data.images, ...prev]);
        if (isNanaBanana) {
          incrementImages();
        } else if (isFreeEngine) {
          incrementFreeImageDaily();
        } else {
          incrementImages();
        }
        
        // Сохранить каждое изображение в историю
        const engineCost = imageEngineOptions.find(e => e.id === selectedEngine)?.creditCost || 0;
        data.images.forEach((img: { url: string }) => {
          addToHistory({
            type: "image",
            prompt: prompt.trim(),
            model: selectedEngine,
            result: img.url,
            credits: engineCost,
          });
        });
        
        setPrompt("");
      } else {
        throw new Error("Unexpected response format from server");
      }
    } catch (err) {
      console.error("Generation error:", err);
      setError(err instanceof Error ? err.message : "Failed to generate images");
    } finally {
      setIsGenerating(false);
    }
  };

  // Dynamic placeholder based on mode
  const getPromptPlaceholder = () => {
    if (mode === "image-to-image") {
      return "Опишите, как трансформировать изображение... (например, 'в стиле киберпанк', 'в аниме стиле', 'как картина эпохи Возрождения')";
    }
    return "Опишите ваше изображение детально...";
  };

  return (
    <div className="flex flex-col md:flex-row h-full min-h-screen">
      {/* Left Panel - Controls: scrollable + sticky bottom bar */}
      <div className="w-full md:w-[35%] md:min-w-[360px] border-b md:border-b-0 md:border-r border-[#222] flex flex-col min-h-0">
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 min-h-0 max-h-[calc(100vh-200px)] md:max-h-none pb-36 md:pb-24">
          <div className="space-y-3 md:space-y-4 pb-4">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="font-mono text-xl md:text-2xl font-semibold text-white mb-1">
                Изображения
              </h2>
              <p className="text-sm text-[#666]">
                Генерируйте и трансформируйте изображения с ИИ
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-3 md:p-4 rounded-xl bg-red-500/10 border border-red-500/30">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#888]">Режим</label>
            <ModeToggle mode={mode} onChange={setMode} />
          </div>

          {/* Reference Image Upload */}
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#888]">
              Референс
              {mode === "image-to-image" && (
                <span className="text-amber-400 ml-1">*</span>
              )}
            </label>
            <ImageUpload
              image={referenceImage}
              onImageChange={setReferenceImage}
              required={mode === "image-to-image"}
              disabled={isGenerating}
            />
            {mode === "image-to-image" && (
              <p className="text-xs text-[#555]">
                Загрузите изображение для трансформации. ИИ использует ваш промпт для его изменения.
              </p>
            )}
            {mode === "text-to-image" && (
              <p className="text-xs text-[#555]">
                Опционально: загрузите референс для вдохновения стилем.
              </p>
            )}
          </div>

          {/* Model grid — над полем ввода промпта */}
          <ImageEngineSelector
            selected={selectedEngine}
            onChange={setSelectedEngine}
            userPlan={userPlan}
            onPremiumClick={() => {
              setPaywallReason("images");
              setShowPaywall(true);
            }}
          />

          {/* Prompt Area */}
          <div className="space-y-1.5" data-tour="image-prompt">
            <label className="text-xs font-medium text-[#888]">Промпт</label>
            <div className="relative">
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={getPromptPlaceholder()}
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
                style={{ fontSize: '16px' }} /* Prevent iOS zoom */
              />
              <div className="absolute bottom-3 right-3 text-xs text-[#555]">
                {prompt.length}/500
              </div>
            </div>
          </div>

          {/* Style Selector — не применяется при выборе Nana Banana */}
          <div className={`space-y-1.5 ${isNanaBanana ? "opacity-60" : ""}`} data-tour="style-selector">
            <label className="text-xs font-medium text-[#888] flex items-center gap-2">
              Стиль
              {isNanaBanana && <span className="text-[10px] text-amber-400/80">(не применяется)</span>}
            </label>
            <StyleSelector selected={selectedStyle} onChange={setSelectedStyle} />
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-1.5" data-tour="aspect-ratio">
            <label className="text-xs font-medium text-[#888]">Соотношение сторон</label>
            <AspectRatioSelector selected={aspectRatio} onChange={setAspectRatio} />
          </div>

          {/* Number of Images */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[#888]">Количество</label>
            <div className="p-4 rounded-xl bg-white/[0.02] border border-[#333]">
              <ImageCountSlider value={imageCount} onChange={setImageCount} />
            </div>
          </div>

          {/* Кнопка "Сгенерировать" — на десктопе sticky внизу списка */}
          <div className="hidden md:block sticky bottom-0 z-[50] mt-5 pt-2 pb-2 -mx-6 px-6">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating || effectiveAtLimit || !isImg2ImgReady}
              data-tour="generate-button"
              className={`
                w-full py-4 px-6 rounded-xl font-medium text-base mb-3
                transition-all duration-300 relative overflow-hidden
                active:scale-[0.98]
                group
                ${prompt.trim() && !isGenerating && !effectiveAtLimit && isImg2ImgReady
                  ? "bg-[#0070f3] hover:bg-[#0060df] text-white shadow-lg shadow-[0_0_24px_rgba(0,112,243,0.4)]"
                  : "bg-[#222] text-[#555] cursor-not-allowed"
                }
              `}
            >
              {prompt.trim() && !isGenerating && !effectiveAtLimit && isImg2ImgReady && (
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              )}
              <span className="relative flex items-center justify-center gap-2">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span>Генерация...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Сгенерировать</span>
                  </>
                )}
              </span>
            </button>
          </div>
          </div>
        </div>

        {/* Нижняя панель: предупреждение о лимите и счётчик (на десктопе) */}
        <div
          className="
            hidden md:flex flex-shrink-0 p-6 pt-0 space-y-3
            sticky bottom-0 z-10
          "
        >
          {/* Limit warning */}
          {effectiveAtLimit && (
            <button
              onClick={() => {
                setPaywallReason("images")
                setShowPaywall(true)
              }}
              className="
                w-full p-3 md:p-4 rounded-xl
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
                {isFreeEngine ? "Лимит 3 генерации в сутки исчерпан" : "Бесплатные генерации исчерпаны"}
              </span>
              <span className="text-amber-400/60 text-xs group-hover:text-amber-400 transition-colors">
                Пополнить →
              </span>
            </button>
          )}

          {/* Credits indicator — отдельный контейнер с отступом */}
          <div className="mt-3">
            <div 
              className={`
                flex items-center justify-center gap-2 py-2 px-3 rounded-lg
                ${effectiveAtLimit 
                  ? "bg-red-500/5 border border-red-500/20" 
                  : "bg-white/[0.02] border border-[#222]"
                }
              `}
            >
              <div className={`w-2 h-2 rounded-full ${effectiveAtLimit ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
              <span className={`text-xs ${effectiveAtLimit ? "text-red-400" : "text-gray-400"}`}>
                {isFreeEngine ? (
                  effectiveAtLimit ? (
                    "0/3 генераций сегодня"
                  ) : (
                    <>Осталось: {MAX_FREE_IMAGE_PER_DAY - freeImageCountToday}/{MAX_FREE_IMAGE_PER_DAY} генераций</>
                  )
                ) : (
                  effectiveAtLimit ? (
                    "Бесплатные генерации закончились"
                  ) : (
                    <>Осталось: {Math.max(0, limits.maxImages - usedImages)}/{limits.maxImages}</>
                  )
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Фиксированная кнопка "Сгенерировать" на мобильных — как в чате (Telegram/WhatsApp стиль) */}
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
        {/* Limit warning banner (если есть лимит) */}
        {effectiveAtLimit && (
          <button
            onClick={() => {
              setPaywallReason("images")
              setShowPaywall(true)
            }}
            className="
              w-full mb-3 p-3 rounded-xl
              bg-gradient-to-r from-red-500/10 via-amber-500/10 to-red-500/10
              border border-red-500/30
              flex flex-col items-center justify-center gap-2
              group transition-all duration-300
              hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/10
              active:scale-[0.98]
            "
          >
            <Lock className="w-5 h-5 text-amber-400" />
            <span className="text-amber-400 font-medium text-sm text-center">
              {isFreeEngine ? "Лимит 3 генерации в сутки исчерпан" : "Бесплатные генерации исчерпаны"}
            </span>
            <span className="text-amber-400/60 text-xs group-hover:text-amber-400 transition-colors">
              Пополнить →
            </span>
          </button>
        )}

        {/* Счетчик лимитов — над кнопкой на мобильных */}
        <div className="mb-3 flex items-center justify-center gap-2">
          <div className={`w-2 h-2 rounded-full ${effectiveAtLimit ? "bg-red-500" : "bg-emerald-500 animate-pulse"}`} />
          <span className={`text-xs ${effectiveAtLimit ? "text-red-400" : "text-gray-400"}`}>
            {isFreeEngine ? (
              effectiveAtLimit ? "0/3 генераций сегодня" : <>Осталось: {MAX_FREE_IMAGE_PER_DAY - freeImageCountToday}/{MAX_FREE_IMAGE_PER_DAY} генераций</>
            ) : (
              effectiveAtLimit ? "Бесплатные генерации закончились" : <>Осталось: {Math.max(0, limits.maxImages - usedImages)}/{limits.maxImages}</>
            )}
          </span>
        </div>

        {/* Кнопка "Сгенерировать" */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!prompt.trim() || isGenerating || effectiveAtLimit || !isImg2ImgReady}
          data-tour="generate-button-mobile"
          className={`
            w-full py-4 px-6 rounded-xl font-medium text-base
            transition-all duration-300 relative overflow-hidden
            active:scale-[0.98]
            group
            ${prompt.trim() && !isGenerating && !effectiveAtLimit && isImg2ImgReady
              ? "bg-[#0070f3] hover:bg-[#0060df] text-white shadow-lg shadow-[0_0_24px_rgba(0,112,243,0.4)]"
              : "bg-[#222] text-[#555] cursor-not-allowed"
            }
          `}
        >
          {prompt.trim() && !isGenerating && !effectiveAtLimit && isImg2ImgReady && (
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
          )}
          <span className="relative flex items-center justify-center gap-2">
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Генерация...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Сгенерировать</span>
              </>
            )}
          </span>
        </button>
      </div>

      {/* Right Panel - Gallery */}
      <div className="flex-1 p-4 md:p-6 overflow-y-auto min-h-0" data-tour="gallery">
        {/* Gallery Header */}
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <div>
            <h3 className="font-mono text-lg font-semibold text-white">Галерея</h3>
            <p className="text-sm text-[#666]">
              {generatedImages.length} {generatedImages.length === 1 ? "изображение" : generatedImages.length < 5 ? "изображения" : "изображений"} сгенерировано
            </p>
          </div>
        </div>

        {/* Empty state */}
        {generatedImages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-[40vh] md:h-[60vh] text-center px-4">
            <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/[0.02] border border-[#333] flex items-center justify-center mb-4 md:mb-6">
              <Sparkles className="w-8 h-8 md:w-10 md:h-10 text-[#444]" />
            </div>
            <h3 className="text-base md:text-lg font-medium text-white/80 mb-2">Пока нет изображений</h3>
            <p className="text-sm text-[#666] max-w-xs">
              {mode === "image-to-image" 
                ? "Загрузите референс и опишите, как его трансформировать"
                : "Введите промпт и нажмите \"Сгенерировать\" для создания вашего первого шедевра"
              }
            </p>
          </div>
        )}

        {/* Masonry Grid */}
        {generatedImages.length > 0 && (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4">
            {generatedImages.map((image) => (
              <ImageCard
                key={image.id}
                image={image}
                onImageClick={setSelectedImage}
              />
            ))}
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      <Lightbox
        image={selectedImage}
        onClose={() => setSelectedImage(null)}
      />
    </div>
  );
};

// ===== MAIN IMAGE STUDIO COMPONENT =====

export const ImageStudio = () => {
  const [studioMode, setStudioMode] = useState<StudioMode>("generate");
  const {
    checkImageLimit,
    incrementImages,
    canGenerateImage,
    imageCount,
    limits,
  userPlan,
  freeImageCountToday,
  effectiveFreeImageCountToday,
  checkFreeImageDailyLimit,
  incrementFreeImageDaily,
  setShowPaywall,
  setPaywallReason,
} = useUsage();
  const atLimit = !canGenerateImage;

  return (
    <div className="h-full">
      {/* Top-level Mode Toggle */}
      <div className="p-4 md:p-6 pb-0">
        <StudioModeToggle mode={studioMode} onChange={setStudioMode} />
      </div>

      {/* Content based on mode */}
      {studioMode === "generate" ? (
        <GeneratePanel
          imageCount={imageCount}
          limits={limits}
          atLimit={atLimit}
          checkImageLimit={checkImageLimit}
          incrementImages={incrementImages}
          userPlan={userPlan}
          freeImageCountToday={effectiveFreeImageCountToday}
          checkFreeImageDailyLimit={checkFreeImageDailyLimit}
          incrementFreeImageDaily={incrementFreeImageDaily}
          setShowPaywall={setShowPaywall}
          setPaywallReason={setPaywallReason}
        />
      ) : (
        <EnhancePhotoPanel
          imageCount={imageCount}
          limits={limits}
          atLimit={atLimit}
          checkImageLimit={checkImageLimit}
          incrementImages={incrementImages}
          setShowPaywall={setShowPaywall}
          setPaywallReason={setPaywallReason}
        />
      )}
    </div>
  );
};

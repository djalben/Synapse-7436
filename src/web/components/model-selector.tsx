import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Lock, Diamond, Sparkles, Zap } from "lucide-react";
import { useUsage } from "./usage-context";
import { toast } from "sonner";

// Provider logos as SVG components
const OpenAILogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

const AnthropicLogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M17.304 3.541h-3.672l6.696 16.918h3.672l-6.696-16.918zm-10.608 0L0 20.459h3.744l1.37-3.553h7.005l1.369 3.553h3.744L10.536 3.541H6.696zm.847 10.4 2.378-6.161 2.377 6.161H7.543z" />
  </svg>
);

const DeepSeekLogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
  </svg>
);

// Plan types
export type UserPlan = "free" | "lite" | "standard" | "ultra";

// Model definition
export interface Model {
  id: string;
  backendId: string;
  name: string;
  subtitle: string;
  creditCost: number;
  dotColor: string;
  providerLogo: React.ReactNode;
  requiredPlan: UserPlan;
  isGodMode?: boolean;
  badge?: string;
}

// Available models with tiered access
export const models: Model[] = [
  {
    id: "deepseek-r1",
    backendId: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    subtitle: "Бесплатно / Быстрый",
    creditCost: 0.1,
    dotColor: "bg-emerald-400",
    providerLogo: <DeepSeekLogo />,
    requiredPlan: "free",
    badge: "Рекомендуем",
  },
  {
    id: "gpt-4o-mini",
    backendId: "openai/gpt-4o-mini",
    name: "GPT-4o Mini",
    subtitle: "Быстрый и эффективный",
    creditCost: 0.1,
    dotColor: "bg-emerald-500",
    providerLogo: <OpenAILogo />,
    requiredPlan: "free",
  },
  {
    id: "gpt-4o",
    backendId: "openai/gpt-4o",
    name: "GPT-4o",
    subtitle: "Умный агент",
    creditCost: 1,
    dotColor: "bg-blue-500",
    providerLogo: <OpenAILogo />,
    requiredPlan: "lite",
  },
  {
    id: "claude-3.5-sonnet",
    backendId: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    subtitle: "Гений кода",
    creditCost: 1,
    dotColor: "bg-violet-500",
    providerLogo: <AnthropicLogo />,
    requiredPlan: "standard",
  },
  {
    id: "gpt-5-o1",
    backendId: "openai/o1",
    name: "GPT-5 / o1",
    subtitle: "Режим бога",
    creditCost: 5,
    dotColor: "bg-gradient-to-r from-amber-400 to-orange-500",
    providerLogo: <OpenAILogo />,
    requiredPlan: "ultra",
    isGodMode: true,
  },
];

// Plan hierarchy for access checking
const PLAN_HIERARCHY: Record<UserPlan, number> = {
  free: 0,
  lite: 1,
  standard: 2,
  ultra: 3,
};

// Check if a user can access a model based on their plan
export const canAccessModel = (userPlan: UserPlan, requiredPlan: UserPlan): boolean => {
  return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[requiredPlan];
};

// Get credit cost for a model
export const getModelCreditCost = (modelId: string): number => {
  const model = models.find(m => m.id === modelId);
  return model?.creditCost ?? 0.1;
};

// Get backend model ID
export const getBackendModelId = (modelId: string): string => {
  const model = models.find(m => m.id === modelId);
  return model?.backendId ?? "deepseek/deepseek-r1";
};

interface ModelSelectorProps {
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  userPlan?: UserPlan;
}

export const ModelSelector = ({
  selectedModel,
  onModelChange,
  userPlan = "free",
}: ModelSelectorProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setShowPaywall, setPaywallReason } = useUsage();

  const currentModel = models.find((m) => m.id === selectedModel) || models[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false);
    };

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  // ГЛАВНАЯ ЛОГИКА ВЫБОРА МОДЕЛИ
  const handleSelect = (model: Model) => {
    const isLocked = !canAccessModel(userPlan, model.requiredPlan);

    // Если модель заблокирована — открываем окно тарифов
    if (isLocked) {
      setPaywallReason("messages");
      setShowPaywall(true);
      setIsOpen(false);
      return;
    }

    // Предупреждение для дорогих моделей
    if (model.isGodMode) {
      toast.warning("⚠️ Режим высокой мощности: 5 кредитов за сообщение", {
        description: "Эта модель потребляет значительно больше кредитов.",
        duration: 5000,
      });
    }

    // Выбираем модель и закрываем dropdown
    onModelChange(model.id);
    setIsOpen(false);
  };

  return (
    // КОНТЕЙНЕР: overflow-visible чтобы dropdown не обрезался!
    <div ref={containerRef} className="relative" style={{ overflow: "visible" }}>
      
      {/* КНОПКА ТРИГГЕР */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-xl
          bg-white/[0.04] hover:bg-white/[0.08]
          border border-[#333] hover:border-[#444]
          transition-all duration-200
          ${isOpen ? "bg-white/[0.08] border-[#444]" : ""}
          ${currentModel.isGodMode ? "border-amber-500/30" : ""}
          ${currentModel.badge ? "border-emerald-500/30" : ""}
        `}
      >
        <div className={`w-2 h-2 rounded-full ${currentModel.dotColor} flex-shrink-0`} />
        <div className="text-[#888]">{currentModel.providerLogo}</div>
        <span className={`text-sm font-medium ${currentModel.isGodMode ? "text-amber-200" : currentModel.badge ? "text-emerald-200" : "text-white/90"}`}>
          {currentModel.name}
        </span>
        {currentModel.isGodMode && <Diamond className="w-3.5 h-3.5 text-amber-400" />}
        {currentModel.badge && <Zap className="w-3.5 h-3.5 text-emerald-400" />}
        <span className={`text-xs px-1.5 py-0.5 rounded-md ${
          currentModel.isGodMode 
            ? "bg-amber-500/20 text-amber-400 font-medium" 
            : currentModel.badge
              ? "bg-emerald-500/20 text-emerald-400 font-medium"
              : "bg-white/[0.06] text-[#888]"
        }`}>
          {currentModel.creditCost} кр
        </span>
        <ChevronDown className={`w-4 h-4 text-[#666] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {/* ВЫПАДАЮЩИЙ СПИСОК */}
      {isOpen && (
        <div
          className="
            absolute top-full left-0 mt-2 w-[340px]
            bg-[#0f0f0f] border border-[#333] rounded-xl
            shadow-2xl shadow-black/80
            z-[9999]
          "
          style={{
            position: "absolute",
            zIndex: 9999,
          }}
        >
          {/* ЗАГОЛОВОК */}
          <div className="px-4 py-3 border-b border-[#222]">
            <p className="text-xs text-[#666] uppercase tracking-wider font-medium">
              Выберите модель
            </p>
          </div>

          {/* СПИСОК МОДЕЛЕЙ */}
          <ul className="max-h-[400px] overflow-y-auto p-2 space-y-1">
            {models.map((model) => {
              const isSelected = model.id === selectedModel;
              const isLocked = !canAccessModel(userPlan, model.requiredPlan);

              return (
                <li key={model.id}>
                  <button
                    onClick={() => handleSelect(model)}
                    className={`
                      w-full flex items-center gap-3 px-3 py-3 rounded-lg
                      transition-all duration-200 cursor-pointer
                      border
                      ${isSelected 
                        ? "border-emerald-500 bg-emerald-500/10 text-white" 
                        : "border-transparent hover:border-emerald-500/50 hover:bg-emerald-500/5"
                      }
                      ${isLocked ? "opacity-60" : ""}
                    `}
                  >
                    {/* Цветная точка статуса */}
                    <div className={`w-2.5 h-2.5 rounded-full ${model.dotColor} flex-shrink-0`} />
                    
                    {/* Лого провайдера */}
                    <div className={`flex-shrink-0 ${isSelected ? "text-white" : "text-[#888]"}`}>
                      {model.providerLogo}
                    </div>
                    
                    {/* Информация о модели */}
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-medium ${isSelected ? "text-white" : "text-white/80"}`}>
                          {model.name}
                        </span>
                        {model.isGodMode && <Diamond className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />}
                        {model.badge && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium border border-emerald-500/30 whitespace-nowrap">
                            {model.badge}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-[#666] mt-0.5">{model.subtitle}</p>
                    </div>
                    
                    {/* Стоимость в кредитах */}
                    <div className={`text-xs px-2 py-1 rounded font-medium flex-shrink-0 ${
                      model.isGodMode 
                        ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" 
                        : "bg-white/[0.06] text-[#888]"
                    }`}>
                      {model.creditCost} кр
                    </div>
                    
                    {/* Иконка: замок или галочка */}
                    <div className="flex-shrink-0 w-5 flex justify-center">
                      {isLocked ? (
                        <Lock className="w-4 h-4 text-amber-500" />
                      ) : isSelected ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : null}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* ФУТЕР */}
          <div className="px-4 py-3 border-t border-[#222] bg-white/[0.02]">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-[#888]">
                  Ваш план: <span className="text-white font-medium capitalize">{userPlan}</span>
                </span>
              </div>
              <button
                onClick={() => {
                  setPaywallReason("messages");
                  setShowPaywall(true);
                  setIsOpen(false);
                }}
                className="text-xs text-emerald-400 hover:text-emerald-300 transition-colors font-medium"
              >
                Улучшить →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

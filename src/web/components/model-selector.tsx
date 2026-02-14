import { useState, useRef, useEffect } from "react";
import { Lock, ChevronDown } from "lucide-react";
import { useUsage } from "./usage-context";
import { 
  type SynapseTier, 
  getRequiredTierForChatModel, 
  checkTierAccess, 
  planToTier,
  CHAT_MODEL_TIERS 
} from "../../config/tiers";

// Provider logos
const OpenAILogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#10a37f" aria-hidden>
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073zM13.26 22.43a4.476 4.476 0 0 1-2.876-1.04l.141-.081 4.779-2.758a.795.795 0 0 0 .392-.681v-6.737l2.02 1.168a.071.071 0 0 1 .038.052v5.583a4.504 4.504 0 0 1-4.494 4.494zM3.6 18.304a4.47 4.47 0 0 1-.535-3.014l.142.085 4.783 2.759a.771.771 0 0 0 .78 0l5.843-3.369v2.332a.08.08 0 0 1-.033.062L9.74 19.95a4.5 4.5 0 0 1-6.14-1.646zM2.34 7.896a4.485 4.485 0 0 1 2.366-1.973V11.6a.766.766 0 0 0 .388.677l5.815 3.355-2.02 1.168a.076.076 0 0 1-.071 0l-4.83-2.786A4.504 4.504 0 0 1 2.34 7.896zm16.597 3.855l-5.833-3.387L15.119 7.2a.076.076 0 0 1 .071 0l4.83 2.791a4.494 4.494 0 0 1-.676 8.105v-5.678a.79.79 0 0 0-.407-.667zm2.01-3.023l-.141-.085-4.774-2.782a.776.776 0 0 0-.785 0L9.409 9.23V6.897a.066.066 0 0 1 .028-.061l4.83-2.787a4.5 4.5 0 0 1 6.68 4.66zm-12.64 4.135l-2.02-1.164a.08.08 0 0 1-.038-.057V6.075a4.5 4.5 0 0 1 7.375-3.453l-.142.08-4.778 2.758a.795.795 0 0 0-.393.681zm1.097-2.365l2.602-1.5 2.607 1.5v2.999l-2.597 1.5-2.607-1.5z" />
  </svg>
);

const AnthropicLogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#d97706" aria-hidden>
    <path d="M17.304 3.541h-3.672l6.696 16.918h3.672l-6.696-16.918zm-10.608 0L0 20.459h3.744l1.37-3.553h7.005l1.369 3.553h3.744L10.536 3.541H6.696zm.847 10.4 2.378-6.161 2.377 6.161H7.543z" />
  </svg>
);

const DeepSeekLogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#3b82f6" aria-hidden>
    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
  </svg>
);

const MistralLogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#ff6b35" aria-hidden>
    <path d="M12 2L4 22h4l4-8 4 8h4L12 2z" />
  </svg>
);

const XiaomiLogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4 flex-shrink-0" fill="#ff6900" aria-hidden>
    <path d="M12 2l2.5 7.5H22L15 13l2.5 7.5L12 16l-5.5 4.5L9 13 2 9.5h7.5L12 2z" />
  </svg>
);

export type UserPlan = "free" | "lite" | "standard" | "ultra";

export interface Model {
  id: string;
  backendId: string;
  name: string;
  subtitle: string;
  description: string;
  intelligence: number;
  speed: number;
  creditCost: number;
  dotColor: string;
  providerLogo: React.ReactNode;
  requiredPlan: UserPlan;
  isPremium: boolean;
}

/** Chat models with metadata for dropdown cards. */
/** Только модели из тарифной сетки Synapse */
export const models: Model[] = [
  {
    id: "deepseek-r1",
    backendId: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    subtitle: "START",
    description: "Рассуждение и логика. Лучший для сложных вычислений.",
    intelligence: 9,
    speed: 6,
    creditCost: 0.1,
    dotColor: "bg-emerald-400",
    providerLogo: <DeepSeekLogo />,
    requiredPlan: "free",
    isPremium: false,
  },
  {
    id: "gpt-4o-mini",
    backendId: "openai/gpt-4o-mini",
    name: "GPT-4o mini",
    subtitle: "START",
    description: "Быстрый и экономный. Подходит для простых чатов.",
    intelligence: 6,
    speed: 10,
    creditCost: 0.1,
    dotColor: "bg-emerald-500",
    providerLogo: <OpenAILogo />,
    requiredPlan: "free",
    isPremium: false,
  },
  {
    id: "gpt-4o",
    backendId: "openai/gpt-4o",
    name: "GPT-4o",
    subtitle: "CREATOR",
    description: "Универсальный флагман. Творчество и анализ.",
    intelligence: 9,
    speed: 8,
    creditCost: 1,
    dotColor: "bg-blue-500",
    providerLogo: <OpenAILogo />,
    requiredPlan: "free",
    isPremium: false,
  },
  {
    id: "claude-3.5-sonnet",
    backendId: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    subtitle: "CREATOR",
    description: "Мастер текстов и кодинга. Очень человечный.",
    intelligence: 9,
    speed: 8,
    creditCost: 1,
    dotColor: "bg-violet-500",
    providerLogo: <AnthropicLogo />,
    requiredPlan: "free",
    isPremium: false,
  },
  {
    id: "gpt-5-o1",
    backendId: "openai/o1-preview", // FIXME: replace with openai/gpt-5-preview when available
    name: "GPT-5 Pro",
    subtitle: "PRO STUDIO",
    description: "Максимальный интеллект. Решает невозможные задачи.",
    intelligence: 10,
    speed: 4,
    creditCost: 5,
    dotColor: "bg-amber-500",
    providerLogo: <OpenAILogo />,
    requiredPlan: "free",
    isPremium: false,
  },
];

const PLAN_HIERARCHY: Record<UserPlan, number> = {
  free: 0,
  lite: 1,
  standard: 2,
  ultra: 3,
};

export const canAccessModel = (userPlan: UserPlan, requiredPlan: UserPlan): boolean => {
  return PLAN_HIERARCHY[userPlan] >= PLAN_HIERARCHY[requiredPlan];
};

// Новая функция проверки доступа через систему тарифов Synapse
export const canAccessModelByTier = (
  userPlan: UserPlan,
  backendModelId: string
): { allowed: boolean; requiredTier?: SynapseTier; userTier?: SynapseTier } => {
  const userTier = planToTier(userPlan);
  const requiredTier = getRequiredTierForChatModel(backendModelId);
  const allowed = checkTierAccess(userTier, requiredTier).allowed;
  
  return { allowed, requiredTier, userTier };
};

export const getModelCreditCost = (modelId: string): number => {
  const model = models.find((m) => m.id === modelId);
  return model?.creditCost ?? 0.1;
};

export const getBackendModelId = (modelId: string): string => {
  const model = models.find((m) => m.id === modelId);
  return model?.backendId ?? "deepseek/deepseek-r1";
};

// Mini progress bar (0–10)
const ProgressBar = ({ value, label, accentClass }: { value: number; label: string; accentClass: string }) => (
  <div className="flex items-center gap-2 min-w-0">
    <span className="text-[10px] text-[#666] w-14 shrink-0">{label}</span>
    <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${accentClass}`}
        style={{ width: `${(value / 10) * 100}%` }}
      />
    </div>
    <span className="text-[10px] text-[#888] w-5 shrink-0">{value}/10</span>
  </div>
);

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
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const { setShowPaywall, setPaywallReason } = useUsage();

  const selected = models.find((m) => m.id === selectedModel) ?? models[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const handleSelect = (model: Model) => {
    // ВРЕМЕННО ОТКЛЮЧЕНО: Проверка доступа (режим тестирования)
    // const isLocked = !canAccessModel(userPlan, model.requiredPlan);
    // if (isLocked) {
    //   setPaywallReason("messages");
    //   setShowPaywall(true);
    //   return;
    // }
    onModelChange(model.id);
    setOpen(false);
  };

  const listItems = models.map((model) => {
    const isSelected = model.id === selectedModel;
    // ВРЕМЕННО ОТКЛЮЧЕНО: Проверка доступа (режим тестирования)
    const isLocked = false; // !canAccessModel(userPlan, model.requiredPlan);
    return (
      <button
        key={model.id}
        type="button"
        onClick={() => handleSelect(model)}
        className={`
          w-full text-left px-4 py-3 md:px-4 md:py-3 flex items-start gap-3
          transition-colors duration-200
          hover:bg-white/10 active:bg-white/[0.12]
          ${isSelected ? "bg-indigo-500/15 border-l-2 border-indigo-400 md:border-l-0 md:bg-indigo-500/15" : ""}
        `}
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center [&_svg]:w-5 [&_svg]:h-5">
          {model.providerLogo}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-white/95">{model.name}</span>
            {model.requiredPlan === "free" ? (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-medium">Бесплатно</span>
            ) : (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-[#888]">{model.subtitle}</span>
            )}
            {isLocked && (
              <Lock className="w-3.5 h-3.5 shrink-0 text-amber-400" aria-hidden />
            )}
          </div>
          <p className="text-xs text-[#888] mt-0.5 leading-snug">{model.description}</p>
          <div className="flex flex-col gap-1 mt-2">
            <ProgressBar value={model.intelligence} label="Интеллект" accentClass="bg-indigo-500" />
            <ProgressBar value={model.speed} label="Скорость" accentClass="bg-emerald-500" />
          </div>
        </div>
      </button>
    );
  });

  const panelContent = (
    <div
      className="
        bg-black backdrop-blur-xl
        border border-white/10 rounded-xl md:rounded-2xl
        shadow-2xl shadow-black/50
        overflow-hidden
      "
    >
      <div className="max-h-[350px] overflow-y-auto overscroll-contain py-2 md:py-2 scroll-smooth">
        {listItems}
      </div>
    </div>
  );

  return (
    <div ref={containerRef} className="relative flex justify-start" data-tour="model-selector">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="
          inline-flex items-center gap-2 md:gap-3
          min-h-[48px] md:min-h-0
          px-4 py-2.5 md:px-5 md:py-3
          rounded-xl md:rounded-2xl
          bg-black/40 backdrop-blur-xl border border-white/10
          text-white/95 hover:bg-white/[0.08] hover:border-white/20
          transition-all duration-200
          shadow-lg shadow-black/20
        "
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-label="Выбрать модель"
      >
        <span className="flex items-center [&_svg]:block [&_svg]:w-4 [&_svg]:h-4 md:[&_svg]:w-5 md:[&_svg]:h-5" aria-hidden>
          {selected.providerLogo}
        </span>
        <span className="text-sm md:text-base font-medium truncate max-w-[140px] md:max-w-[200px]">
          {selected.name}
        </span>
        <ChevronDown
          className={`w-4 h-4 md:w-5 md:h-5 flex-shrink-0 text-[#888] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          aria-hidden
        />
      </button>

      {open && (
        <>
          {/* Desktop: выпадает влево-вниз под кнопкой, поверх всего */}
          <div
            className="
              hidden md:block absolute top-full left-0 mt-2 z-[9999]
              w-[min(100vw-2rem,400px)]
            "
          >
            {panelContent}
          </div>
          {/* Mobile: только нижнее меню (Bottom Sheet), без плавающего списка */}
          <div
            className="md:hidden fixed inset-0 z-[9999] flex flex-col justify-end"
            aria-modal
            role="dialog"
          >
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              className="
                relative bg-black border-t border-white/10
                rounded-t-2xl
                max-h-[50vh] flex flex-col
                animate-in slide-in-from-bottom duration-300 ease-out
                pb-[env(safe-area-inset-bottom)]
              "
            >
              <div className="flex-shrink-0 flex justify-center py-3">
                <div className="w-10 h-1 rounded-full bg-white/20" aria-hidden />
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto max-h-[350px] overscroll-contain py-2 pb-4 scroll-smooth">
                {listItems}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

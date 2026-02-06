import { Lock } from "lucide-react";
import { useUsage } from "./usage-context";

// Provider logos — оригинальные иконки с явными цветами (не currentColor), чтобы не сливаться с фоном
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
  creditCost: number;
  dotColor: string;
  providerLogo: React.ReactNode;
  requiredPlan: UserPlan;
  isPremium: boolean; // true = show lock, click opens paywall/pricing
}

/** Chat models: 4 free (DeepSeek R1, GPT-4o mini, MiMo, Devstral) + 3 premium (Lock). */
export const models: Model[] = [
  {
    id: "deepseek-r1",
    backendId: "deepseek/deepseek-r1",
    name: "DeepSeek R1",
    subtitle: "Бесплатно",
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
    subtitle: "Бесплатно",
    creditCost: 0.1,
    dotColor: "bg-emerald-500",
    providerLogo: <OpenAILogo />,
    requiredPlan: "free",
    isPremium: false,
  },
  {
    id: "mimo-v2-flash",
    backendId: "xiaomi/mimo-v2-flash",
    name: "Xiaomi MiMo-V2-Flash",
    subtitle: "Бесплатно",
    creditCost: 0,
    dotColor: "bg-orange-400",
    providerLogo: <XiaomiLogo />,
    requiredPlan: "free",
    isPremium: false,
  },
  {
    id: "devstral-2512",
    backendId: "mistralai/devstral-2512:free",
    name: "Devstral 2 2512",
    subtitle: "Бесплатно",
    creditCost: 0,
    dotColor: "bg-amber-400",
    providerLogo: <MistralLogo />,
    requiredPlan: "free",
    isPremium: false,
  },
  {
    id: "gpt-4o",
    backendId: "openai/gpt-4o",
    name: "GPT-4o",
    subtitle: "Премиум",
    creditCost: 1,
    dotColor: "bg-blue-500",
    providerLogo: <OpenAILogo />,
    requiredPlan: "lite",
    isPremium: true,
  },
  {
    id: "claude-3.5-sonnet",
    backendId: "anthropic/claude-3.5-sonnet",
    name: "Claude 3.5 Sonnet",
    subtitle: "Премиум",
    creditCost: 1,
    dotColor: "bg-violet-500",
    providerLogo: <AnthropicLogo />,
    requiredPlan: "standard",
    isPremium: true,
  },
  {
    id: "gpt-5-o1",
    backendId: "openai/o1",
    name: "GPT-5 (o1)",
    subtitle: "Премиум",
    creditCost: 5,
    dotColor: "bg-amber-500",
    providerLogo: <OpenAILogo />,
    requiredPlan: "ultra",
    isPremium: true,
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

export const getModelCreditCost = (modelId: string): number => {
  const model = models.find((m) => m.id === modelId);
  return model?.creditCost ?? 0.1;
};

export const getBackendModelId = (modelId: string): string => {
  const model = models.find((m) => m.id === modelId);
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
  const { setShowPaywall, setPaywallReason } = useUsage();

  const handleModelClick = (model: Model) => {
    const isLocked = model.isPremium && !canAccessModel(userPlan, model.requiredPlan);

    if (isLocked) {
      setPaywallReason("messages");
      setShowPaywall(true);
      return;
    }

    onModelChange(model.id);
  };

  return (
    <div
      className="w-full flex items-center gap-2 py-0.5 overflow-x-auto overflow-y-hidden flex-nowrap md:flex-wrap md:justify-center md:overflow-visible"
      data-tour="model-selector"
      style={{ WebkitOverflowScrolling: "touch" }}
    >
      {models.map((model) => {
        const isActive = selectedModel === model.id;
        const isLocked = model.isPremium && !canAccessModel(userPlan, model.requiredPlan);

        return (
          <button
            key={model.id}
            type="button"
            onClick={() => handleModelClick(model)}
            className={`
              group inline-flex items-center gap-1 md:gap-1.5 px-2 py-1.5 md:px-2.5 md:py-2 rounded-lg md:rounded-xl
              border transition-all duration-300 ease-out flex-shrink-0
              hover:scale-105 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]
              active:scale-[0.98]
              ${isActive
                ? "bg-indigo-500/20 border-indigo-400/60 text-white shadow-[0_0_16px_rgba(99,102,241,0.25)]"
                : "bg-white/[0.04] border-[#333] text-[#888] hover:bg-white/[0.08] hover:border-[#444] hover:text-white/90"
              }
              ${isLocked ? "cursor-pointer" : ""}
            `}
          >
            <div className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full flex-shrink-0 ${model.dotColor}`} />
            <span className="flex items-center [&_svg]:block [&_svg]:w-3.5 [&_svg]:h-3.5 md:[&_svg]:w-4 md:[&_svg]:h-4" aria-hidden>
              {model.providerLogo}
            </span>
            <span className="text-xs md:text-sm font-medium whitespace-nowrap">
              {model.name}
            </span>
            {model.isPremium && (
              <Lock
                className={`w-3.5 h-3.5 md:w-4 md:h-4 flex-shrink-0 ${isLocked ? "text-amber-400/90" : "text-white/50"}`}
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

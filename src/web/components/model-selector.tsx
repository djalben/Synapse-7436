import { Lock } from "lucide-react";
import { useUsage } from "./usage-context";

// Provider logos as SVG components
const OpenAILogo = () => (
  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="M22.282 9.821a5.985 5.985 0 0 0-.516-4.91 6.046 6.046 0 0 0-6.51-2.9A6.065 6.065 0 0 0 4.981 4.18a5.985 5.985 0 0 0-3.998 2.9 6.046 6.046 0 0 0 .743 7.097 5.98 5.98 0 0 0 .51 4.911 6.051 6.051 0 0 0 6.515 2.9A5.985 5.985 0 0 0 13.26 24a6.056 6.056 0 0 0 5.772-4.206 5.99 5.99 0 0 0 3.997-2.9 6.056 6.056 0 0 0-.747-7.073z" />
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

/** Chat models: 1 free (DeepSeek R1) + 3 premium (Lock). */
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
    <div className="flex items-center gap-2 flex-wrap" data-tour="model-selector">
      {models.map((model) => {
        const isActive = selectedModel === model.id;
        const isLocked = model.isPremium && !canAccessModel(userPlan, model.requiredPlan);

        return (
          <button
            key={model.id}
            type="button"
            onClick={() => handleModelClick(model)}
            className={`
              group inline-flex items-center gap-2 px-3 py-2 rounded-xl
              border transition-all duration-300 ease-out
              hover:scale-105 hover:shadow-[0_0_20px_rgba(99,102,241,0.15)]
              active:scale-[0.98]
              ${isActive
                ? "bg-indigo-500/20 border-indigo-400/60 text-white shadow-[0_0_16px_rgba(99,102,241,0.25)]"
                : "bg-white/[0.04] border-[#333] text-[#888] hover:bg-white/[0.08] hover:border-[#444] hover:text-white/90"
              }
              ${isLocked ? "cursor-pointer" : ""}
            `}
          >
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${model.dotColor}`} />
            <span className="text-[#888] group-hover:text-white/90 transition-colors duration-300">
              {model.providerLogo}
            </span>
            <span className="text-sm font-medium whitespace-nowrap">
              {model.name}
            </span>
            {model.isPremium && (
              <Lock
                className={`w-4 h-4 flex-shrink-0 ${isLocked ? "text-amber-400/90" : "text-white/50"}`}
                aria-hidden
              />
            )}
          </button>
        );
      })}
    </div>
  );
};

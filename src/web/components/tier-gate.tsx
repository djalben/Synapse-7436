import { Lock, Crown } from "lucide-react";
import { useUsage } from "./usage-context";
import { planToTier, type SynapseTier, TIER_HIERARCHY } from "../../config/tiers";

interface TierGateProps {
  requiredTier: SynapseTier;
  children: React.ReactNode;
  featureName: string;
}

const TIER_NAMES: Record<SynapseTier, string> = {
  START: "START",
  CREATOR: "CREATOR",
  PRO_STUDIO: "PRO STUDIO",
  MAXIMAL: "МАКСИМАЛЬНЫЙ",
};

export const TierGate = ({ requiredTier, children, featureName }: TierGateProps) => {
  const { userPlan = "free", setShowPaywall } = useUsage();
  const userTier = planToTier(userPlan);
  
  const hasAccess = TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
  
  if (hasAccess) {
    return <>{children}</>;
  }
  
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-4">
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/40 flex items-center justify-center mb-6">
        <Lock className="w-10 h-10 text-amber-400" />
      </div>
      <h3 className="text-xl font-semibold text-white mb-2">
        Модуль в разработке
      </h3>
      <p className="text-sm text-[#888] mb-6 max-w-md">
        Модуль "{featureName}" в разработке. Доступно только в {TIER_NAMES[requiredTier]}.
      </p>
      <button
        onClick={() => setShowPaywall(true)}
        className="
          px-6 py-3 rounded-xl
          bg-gradient-to-r from-amber-600 to-orange-600
          text-white font-medium
          hover:shadow-lg hover:shadow-amber-500/30
          transition-all duration-200
          flex items-center gap-2
        "
      >
        <Crown className="w-4 h-4" />
        Обновить тариф
      </button>
    </div>
  );
};

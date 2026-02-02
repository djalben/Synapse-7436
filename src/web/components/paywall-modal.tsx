import { useState } from "react";
import { X, Check, Sparkles, Zap, Crown, Rocket, XCircle } from "lucide-react";
import { useUsage } from "./usage-context";

interface Feature {
  text: string;
  included: boolean;
}

interface PricingTier {
  id: string;
  name: string;
  price: number;
  tagline: string;
  icon: React.ComponentType<{ className?: string }>;
  features: Feature[];
  highlighted?: boolean;
  badge?: string;
  buttonText: string;
  accentColor?: string;
}

const pricingTiers: PricingTier[] = [
  {
    id: "lite",
    name: "Lite",
    price: 690,
    tagline: "Perfect for beginners",
    icon: Zap,
    buttonText: "Start Lite",
    features: [
      { text: "GPT-4o Mini access", included: true },
      { text: "Flux image generation", included: true },
      { text: "500 Credits included", included: true },
      { text: "Video generation", included: false },
      { text: "Voice cloning", included: false },
      { text: "Music generation", included: false },
    ],
  },
  {
    id: "standard",
    name: "Standard",
    price: 1890,
    tagline: "Best value for creators",
    icon: Sparkles,
    highlighted: true,
    badge: "Popular",
    buttonText: "Get Standard",
    features: [
      { text: "All Lite features", included: true },
      { text: "GPT-4o & Claude access", included: true },
      { text: "Music Generation", included: true },
      { text: "Midjourney/Niji styles", included: true },
      { text: "2 000 Credits included", included: true },
      { text: "Video generation", included: false },
      { text: "Voice cloning", included: false },
    ],
  },
  {
    id: "ultra",
    name: "Ultra",
    price: 4990,
    tagline: "For professionals & teams",
    icon: Crown,
    buttonText: "Go Ultra",
    badge: "Pro",
    accentColor: "amber",
    features: [
      { text: "All Standard features", included: true },
      { text: "Video generation (Veo/Kling)", included: true },
      { text: "Voice Cloning", included: true },
      { text: "Priority processing speed", included: true },
      { text: "6 000 Credits included", included: true },
      { text: "API access", included: true },
    ],
  },
];

interface PricingCardProps {
  tier: PricingTier;
  onSelect: (tierId: string) => void;
}

const PricingCard = ({ tier, onSelect }: PricingCardProps) => {
  const Icon = tier.icon;
  const isUltra = tier.id === "ultra";

  // Format price with spaces for thousands (Russian format)
  const formattedPrice = tier.price.toLocaleString("ru-RU");

  return (
    <div
      className={`
        relative flex flex-col rounded-2xl p-4 md:p-6
        transition-all duration-500
        ${tier.highlighted
          ? "bg-gradient-to-b from-indigo-500/10 via-indigo-500/5 to-transparent border-2 border-indigo-500/40 md:scale-105"
          : isUltra
            ? "bg-gradient-to-b from-amber-500/5 via-amber-500/[0.02] to-transparent border border-amber-500/30 hover:border-amber-500/50"
            : "bg-white/[0.02] border border-[#333] hover:border-[#444]"
        }
      `}
    >
      {/* Badge */}
      {tier.badge && (
        <div className={`
          absolute -top-3 left-1/2 -translate-x-1/2 px-3 md:px-4 py-1 rounded-full 
          text-xs font-semibold text-white shadow-lg whitespace-nowrap
          ${tier.highlighted 
            ? "bg-gradient-to-r from-indigo-500 to-blue-500 shadow-indigo-500/30" 
            : isUltra
              ? "bg-gradient-to-r from-amber-500 to-orange-500 shadow-amber-500/30"
              : "bg-gradient-to-r from-gray-600 to-gray-700"
          }
        `}>
          {tier.badge}
        </div>
      )}

      {/* Glow effect for highlighted */}
      {tier.highlighted && (
        <div className="absolute inset-0 -z-10 rounded-2xl bg-indigo-500/20 blur-2xl" />
      )}
      {isUltra && (
        <div className="absolute inset-0 -z-10 rounded-2xl bg-amber-500/10 blur-2xl" />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`
            w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0
            ${tier.highlighted
              ? "bg-gradient-to-br from-indigo-500/30 to-blue-500/30"
              : isUltra
                ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20"
                : "bg-white/[0.05]"
            }
          `}
        >
          <Icon
            className={`w-5 h-5 md:w-6 md:h-6 ${
              tier.highlighted 
                ? "text-indigo-400" 
                : isUltra 
                  ? "text-amber-400" 
                  : "text-[#888]"
            }`}
          />
        </div>
        <div>
          <h3 className="text-base md:text-lg font-semibold text-white">{tier.name}</h3>
          <p className="text-xs text-[#666]">{tier.tagline}</p>
        </div>
      </div>

      {/* Price */}
      <div className="mb-4 md:mb-6">
        <span className="text-2xl md:text-3xl font-bold text-white">{formattedPrice}</span>
        <span className="text-lg md:text-xl font-medium text-white ml-1">₽</span>
        <span className="text-[#666] text-sm ml-1">/мес</span>
      </div>

      {/* Features */}
      <ul className="space-y-2 md:space-y-2.5 mb-6 md:mb-8 flex-1">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 md:gap-3">
            {feature.included ? (
              <div
                className={`
                  flex-shrink-0 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center mt-0.5
                  ${tier.highlighted 
                    ? "bg-indigo-500/20" 
                    : isUltra 
                      ? "bg-amber-500/20" 
                      : "bg-emerald-500/20"
                  }
                `}
              >
                <Check
                  className={`w-2.5 h-2.5 md:w-3 md:h-3 ${
                    tier.highlighted 
                      ? "text-indigo-400" 
                      : isUltra 
                        ? "text-amber-400" 
                        : "text-emerald-400"
                  }`}
                />
              </div>
            ) : (
              <div className="flex-shrink-0 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center mt-0.5 bg-red-500/10">
                <XCircle className="w-2.5 h-2.5 md:w-3 md:h-3 text-red-400/60" />
              </div>
            )}
            <span className={`text-xs md:text-sm ${feature.included ? "text-[#aaa]" : "text-[#555]"}`}>
              {feature.text}
            </span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={() => onSelect(tier.id)}
        className={`
          w-full py-3 md:py-3.5 rounded-xl font-medium text-sm
          transition-all duration-300
          relative overflow-hidden group
          active:scale-[0.98]
          ${tier.highlighted
            ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50"
            : isUltra
              ? "bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 text-white shadow-lg shadow-amber-500/30 hover:shadow-amber-500/50"
              : "bg-white/[0.05] text-white hover:bg-white/[0.08] border border-[#333]"
          }
        `}
      >
        {/* Shimmer effect */}
        {(tier.highlighted || isUltra) && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        )}
        <span className="relative">{tier.buttonText}</span>
      </button>
    </div>
  );
};

export const PaywallModal = () => {
  const { showPaywall, setShowPaywall, paywallReason, messageCount, imageCount, limits } = useUsage();

  const handleSelect = (tierId: string) => {
    const tierName = tierId.charAt(0).toUpperCase() + tierId.slice(1);
    // For now, just show an alert - in production, this would redirect to payment
    alert(`Спасибо за интерес к тарифу ${tierName}! Интеграция платежей скоро будет доступна.`);
  };

  const handleClose = () => {
    setShowPaywall(false);
  };

  if (!showPaywall) return null;

  const reasonText = paywallReason === "messages"
    ? `Вы использовали все ${limits.maxMessages} бесплатных сообщений.`
    : `Вы использовали все ${limits.maxImages} бесплатных генераций.`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 md:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl md:rounded-3xl bg-[#0a0a0a] border border-[#333] shadow-2xl">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden rounded-2xl md:rounded-3xl pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 md:w-96 h-64 md:h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-48 md:w-64 h-48 md:h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-48 md:w-64 h-48 md:h-64 bg-amber-500/5 rounded-full blur-3xl" />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 md:top-4 md:right-4 p-2 rounded-lg bg-white/[0.05] border border-[#333] text-[#888] hover:text-white hover:bg-white/[0.08] transition-all z-10 active:scale-95"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="relative p-5 pt-10 md:p-8 md:pt-12">
          {/* Header */}
          <div className="text-center mb-6 md:mb-10">
            <div className="inline-flex items-center justify-center w-12 h-12 md:w-16 md:h-16 rounded-xl md:rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 mb-4 md:mb-6">
              <Rocket className="w-6 h-6 md:w-8 md:h-8 text-indigo-400" />
            </div>
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold text-white mb-2 md:mb-3">
              Unlock Unlimited Power 🚀
            </h2>
            <p className="text-[#888] text-sm md:text-lg max-w-xl mx-auto px-2">
              {reasonText} Upgrade your plan to continue creating with Synapse.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-4xl mx-auto">
            {pricingTiers.map((tier) => (
              <PricingCard key={tier.id} tier={tier} onSelect={handleSelect} />
            ))}
          </div>

          {/* Credit costs info */}
          <div className="mt-6 md:mt-8 p-4 rounded-xl bg-white/[0.02] border border-[#222] max-w-md mx-auto">
            <h4 className="text-sm font-medium text-white mb-2 text-center">Credit costs</h4>
            <div className="flex justify-center gap-6 text-xs text-[#666]">
              <div className="flex items-center gap-1.5">
                <span className="text-violet-400">50</span> credits — Voice clone
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-violet-400">10</span> credits — Music gen
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 md:mt-8 pt-4 md:pt-6 border-t border-[#222]">
            <p className="text-xs md:text-sm text-[#666]">
              7 дней бесплатной пробной версии. Отменить можно в любое время.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

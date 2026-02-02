import { useState } from "react";
import { X, Check, Sparkles, Zap, Crown, Rocket } from "lucide-react";
import { useUsage } from "./usage-context";

interface PricingTier {
  id: string;
  name: string;
  price: number;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  highlighted?: boolean;
  badge?: string;
}

const pricingTiers: PricingTier[] = [
  {
    id: "starter",
    name: "Starter",
    price: 5,
    icon: Zap,
    features: [
      "50 Chat messages/month",
      "10 Image generations",
      "Basic AI models",
      "Standard support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 15,
    icon: Sparkles,
    highlighted: true,
    badge: "Most Popular",
    features: [
      "Unlimited Chat messages",
      "50 Image generations",
      "All AI models",
      "Priority support",
      "Advanced customization",
    ],
  },
  {
    id: "studio",
    name: "Studio",
    price: 30,
    icon: Crown,
    features: [
      "Unlimited everything",
      "Video generation (Motion Lab)",
      "API access",
      "Priority support",
      "Early access to features",
      "Custom model fine-tuning",
    ],
  },
];

interface PricingCardProps {
  tier: PricingTier;
  onSelect: (tierId: string) => void;
}

const PricingCard = ({ tier, onSelect }: PricingCardProps) => {
  const Icon = tier.icon;
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        relative flex flex-col rounded-2xl p-6
        transition-all duration-500
        ${tier.highlighted
          ? "bg-gradient-to-b from-indigo-500/10 via-indigo-500/5 to-transparent border-2 border-indigo-500/40 scale-105"
          : "bg-white/[0.02] border border-[#333] hover:border-[#444]"
        }
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Badge */}
      {tier.badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30">
          {tier.badge}
        </div>
      )}

      {/* Glow effect for highlighted */}
      {tier.highlighted && (
        <div className="absolute inset-0 -z-10 rounded-2xl bg-indigo-500/20 blur-2xl" />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`
            w-12 h-12 rounded-xl flex items-center justify-center
            ${tier.highlighted
              ? "bg-gradient-to-br from-indigo-500/30 to-blue-500/30"
              : "bg-white/[0.05]"
            }
          `}
        >
          <Icon
            className={`w-6 h-6 ${tier.highlighted ? "text-indigo-400" : "text-[#888]"}`}
          />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-white">{tier.name}</h3>
        </div>
      </div>

      {/* Price */}
      <div className="mb-6">
        <span className="text-4xl font-bold text-white">${tier.price}</span>
        <span className="text-[#666] text-sm">/month</span>
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-1">
        {tier.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-3">
            <div
              className={`
                flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5
                ${tier.highlighted ? "bg-indigo-500/20" : "bg-white/[0.05]"}
              `}
            >
              <Check
                className={`w-3 h-3 ${tier.highlighted ? "text-indigo-400" : "text-[#888]"}`}
              />
            </div>
            <span className="text-sm text-[#aaa]">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={() => onSelect(tier.id)}
        className={`
          w-full py-3.5 rounded-xl font-medium text-sm
          transition-all duration-300
          relative overflow-hidden group
          ${tier.highlighted
            ? "bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50"
            : "bg-white/[0.05] text-white hover:bg-white/[0.08] border border-[#333]"
          }
        `}
      >
        {/* Shimmer effect */}
        {tier.highlighted && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        )}
        <span className="relative">Subscribe</span>
      </button>
    </div>
  );
};

export const PaywallModal = () => {
  const { showPaywall, setShowPaywall, paywallReason, messageCount, imageCount, limits } = useUsage();

  const handleSelect = (tierId: string) => {
    // For now, just show an alert - in production, this would redirect to Stripe
    alert(`Thanks for your interest in ${tierId.charAt(0).toUpperCase() + tierId.slice(1)}! Payment integration coming soon.`);
  };

  const handleClose = () => {
    setShowPaywall(false);
  };

  if (!showPaywall) return null;

  const reasonText = paywallReason === "messages"
    ? `You've used all ${limits.maxMessages} free messages.`
    : `You've used all ${limits.maxImages} free image generations.`;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-3xl bg-[#0a0a0a] border border-[#333] shadow-2xl">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden rounded-3xl pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
        </div>

        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-2 rounded-lg bg-white/[0.05] border border-[#333] text-[#888] hover:text-white hover:bg-white/[0.08] transition-all z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="relative p-8 pt-12">
          {/* Header */}
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 mb-6">
              <Rocket className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Unlock Unlimited Power 🚀
            </h2>
            <p className="text-[#888] text-lg max-w-xl mx-auto">
              {reasonText} Upgrade your plan to continue creating with Synapse.
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {pricingTiers.map((tier) => (
              <PricingCard key={tier.id} tier={tier} onSelect={handleSelect} />
            ))}
          </div>

          {/* Footer */}
          <div className="text-center mt-10 pt-6 border-t border-[#222]">
            <p className="text-sm text-[#666]">
              All plans include a 7-day free trial. Cancel anytime.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

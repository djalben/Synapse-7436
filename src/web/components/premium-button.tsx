import { Crown } from "lucide-react";
import { useUsage } from "./usage-context";

interface PremiumButtonProps {
  className?: string;
  compact?: boolean;
}

export const PremiumButton = ({ className = "", compact = false }: PremiumButtonProps) => {
  const { setShowPaywall, setPaywallReason } = useUsage();

  const handleClick = () => {
    setPaywallReason("messages");
    setShowPaywall(true);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        relative group overflow-hidden
        ${compact 
          ? "px-3 py-2 rounded-lg" 
          : "px-4 py-2.5 rounded-xl"
        }
        bg-gradient-to-r from-amber-500 to-orange-500
        text-white font-medium text-sm
        shadow-lg shadow-amber-500/20
        hover:shadow-amber-500/40
        transition-all duration-300
        animate-premium-pulse
        ${className}
      `}
      style={{
        animation: "premium-pulse 3s ease-in-out infinite",
      }}
    >
      {/* Shimmer effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
      
      {/* Glow */}
      <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-amber-400/20 blur-xl" />
      
      {/* Content */}
      <span className="relative flex items-center gap-2">
        <Crown className={`${compact ? "w-3.5 h-3.5" : "w-4 h-4"}`} />
        {!compact && <span>Premium</span>}
      </span>
    </button>
  );
};

// Add CSS animation via style tag
const PremiumButtonStyles = () => (
  <style>{`
    @keyframes premium-pulse {
      0%, 100% {
        box-shadow: 0 10px 20px -5px rgba(245, 158, 11, 0.2);
        transform: scale(1);
      }
      50% {
        box-shadow: 0 10px 30px -5px rgba(245, 158, 11, 0.35);
        transform: scale(1.02);
      }
    }
  `}</style>
);

// Wrapper component that includes styles
export const PremiumButtonWithStyles = (props: PremiumButtonProps) => (
  <>
    <PremiumButtonStyles />
    <PremiumButton {...props} />
  </>
);

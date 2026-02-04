import { useState } from "react";
import { X, Check, Sparkles, Zap, Crown, Rocket, XCircle, Star } from "lucide-react";
import { useUsage } from "./usage-context";
import { toast } from "sonner";

// Process referral reward
const processReferralReward = () => {
  const referredBy = localStorage.getItem("referredBy");
  
  if (referredBy) {
    // In a real app, this would be an API call to the server
    // For now, we simulate by storing rewards in localStorage with referrer ID
    
    // Get current referrer stats (or create new)
    const referrerStatsKey = `referrer_${referredBy}`;
    const currentStats = JSON.parse(localStorage.getItem(referrerStatsKey) || '{"friends": 0, "credits": 0}');
    
    // Add reward
    currentStats.friends += 1;
    currentStats.credits += 500;
    
    localStorage.setItem(referrerStatsKey, JSON.stringify(currentStats));
    
    // Also update global stats if this is the referrer's browser
    const userId = localStorage.getItem("userId");
    if (userId === referredBy) {
      const newFriendsInvited = parseInt(localStorage.getItem("friendsInvited") || "0") + 1;
      const newCreditsEarned = parseInt(localStorage.getItem("creditsEarned") || "0") + 500;
      localStorage.setItem("friendsInvited", newFriendsInvited.toString());
      localStorage.setItem("creditsEarned", newCreditsEarned.toString());
    }
    
    // Clear referredBy so it doesn't trigger again
    localStorage.removeItem("referredBy");
    
    toast.success("Ваш реферал заработал 500 кредитов! 🎉", {
      description: "Спасибо что присоединились по его ссылке!",
    });
    
    return true;
  }
  
  return false;
};

// Credit Package Types - NEW WITH LAVA 12% COMMISSION
interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number; // Price in RUB (including 12% Lava commission)
  pricePerCredit: string;
  savings?: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  highlighted?: boolean;
  badge?: string;
  accentColor?: "indigo" | "amber" | "emerald";
}

// Credit packages with prices accounting for Lava 12% commission
// UPDATED: Reduced prices for RF market entry
const creditPackages: CreditPackage[] = [
  {
    id: "start",
    name: "START",
    credits: 100,
    price: 390,
    pricePerCredit: "3.9 ₽",
    description: "Для старта",
    icon: Zap,
    features: [
      "DeepSeek R1",
      "GPT-4o Mini",
      "Генерация изображений Flux",
    ],
    accentColor: "emerald",
  },
  {
    id: "creator",
    name: "CREATOR",
    credits: 300,
    price: 990,
    pricePerCredit: "3.3 ₽",
    savings: "Экономия 15%",
    description: "Для активных креаторов",
    icon: Sparkles,
    highlighted: true,
    badge: "ХИТ",
    features: [
      "GPT-4o, Claude Sonnet",
      "Nana Banana стили",
      "Генерация музыки",
      "Все базовые функции",
    ],
    accentColor: "indigo",
  },
  {
    id: "pro_studio",
    name: "PRO STUDIO",
    credits: 1000,
    price: 2990,
    pricePerCredit: "2.99 ₽",
    savings: "Экономия 23%",
    description: "Для профессионалов",
    icon: Crown,
    badge: "Pro",
    features: [
      "Видео генерация",
      "Клонирование голоса",
      "AI Аватары",
      "o1 модель",
    ],
    accentColor: "amber",
  },
  {
    id: "agency",
    name: "МАКСИМАЛЬНЫЙ",
    credits: 3500,
    price: 8990,
    pricePerCredit: "2.57 ₽",
    savings: "Экономия 34%",
    description: "Максимальные возможности",
    icon: Star,
    badge: "Best Value",
    features: [
      "Все функции PRO STUDIO",
      "Приоритетная обработка",
      "API доступ",
      "Ранний доступ к новинкам",
    ],
    accentColor: "amber",
  },
];

interface PackageCardProps {
  pkg: CreditPackage;
  onSelect: (packageId: string) => void;
}

const PackageCard = ({ pkg, onSelect }: PackageCardProps) => {
  const Icon = pkg.icon;
  const isHighlighted = pkg.highlighted;
  const isPro = pkg.id === "pro_studio" || pkg.id === "agency";

  // Format price with spaces for thousands (Russian format)
  const formattedPrice = pkg.price.toLocaleString("ru-RU");
  const formattedCredits = pkg.credits.toLocaleString("ru-RU");

  const accentStyles = {
    indigo: {
      border: "border-indigo-500/40",
      hoverBorder: "hover:border-indigo-500/60",
      glow: "bg-indigo-500/20",
      iconBg: "from-indigo-500/30 to-blue-500/30",
      iconColor: "text-indigo-400",
      checkBg: "bg-indigo-500/20",
      checkColor: "text-indigo-400",
      button: "from-indigo-600 via-blue-600 to-indigo-600",
      buttonShadow: "shadow-indigo-500/30 hover:shadow-indigo-500/50",
      badgeBg: "from-indigo-500 to-blue-500",
      badgeShadow: "shadow-indigo-500/30",
    },
    amber: {
      border: "border-amber-500/30",
      hoverBorder: "hover:border-amber-500/50",
      glow: "bg-amber-500/10",
      iconBg: "from-amber-500/20 to-orange-500/20",
      iconColor: "text-amber-400",
      checkBg: "bg-amber-500/20",
      checkColor: "text-amber-400",
      button: "from-amber-600 via-orange-600 to-amber-600",
      buttonShadow: "shadow-amber-500/30 hover:shadow-amber-500/50",
      badgeBg: "from-amber-500 to-orange-500",
      badgeShadow: "shadow-amber-500/30",
    },
    emerald: {
      border: "border-[#333]",
      hoverBorder: "hover:border-[#444]",
      glow: "",
      iconBg: "bg-white/[0.05]",
      iconColor: "text-emerald-400",
      checkBg: "bg-emerald-500/20",
      checkColor: "text-emerald-400",
      button: "bg-white/[0.05] hover:bg-white/[0.08] border border-[#333]",
      buttonShadow: "",
      badgeBg: "from-emerald-500 to-green-500",
      badgeShadow: "shadow-emerald-500/30",
    },
  };

  const styles = accentStyles[pkg.accentColor || "emerald"];

  return (
    <div
      className={`
        relative flex flex-col rounded-2xl p-4 md:p-5
        transition-all duration-500
        ${isHighlighted
          ? `bg-gradient-to-b from-indigo-500/10 via-indigo-500/5 to-transparent border-2 ${styles.border} md:scale-105`
          : isPro
            ? `bg-gradient-to-b from-amber-500/5 via-amber-500/[0.02] to-transparent border ${styles.border} ${styles.hoverBorder}`
            : `bg-white/[0.02] border ${styles.border} ${styles.hoverBorder}`
        }
      `}
    >
      {/* Badge */}
      {pkg.badge && (
        <div className={`
          absolute -top-3 left-1/2 -translate-x-1/2 px-3 md:px-4 py-1 rounded-full 
          text-xs font-semibold text-white shadow-lg whitespace-nowrap
          bg-gradient-to-r ${styles.badgeBg} ${styles.badgeShadow}
        `}>
          {pkg.badge}
        </div>
      )}

      {/* Glow effect */}
      {(isHighlighted || isPro) && (
        <div className={`absolute inset-0 -z-10 rounded-2xl ${styles.glow} blur-2xl`} />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className={`
            w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center flex-shrink-0
            bg-gradient-to-br ${styles.iconBg}
          `}
        >
          <Icon className={`w-5 h-5 md:w-6 md:h-6 ${styles.iconColor}`} />
        </div>
        <div>
          <h3 className="text-base md:text-lg font-semibold text-white">{pkg.name}</h3>
          <p className="text-xs text-[#666]">{pkg.description}</p>
        </div>
      </div>

      {/* Credits Amount */}
      <div className="mb-2">
        <span className="text-3xl md:text-4xl font-bold text-white">{formattedCredits}</span>
        <span className="text-lg md:text-xl font-medium text-[#888] ml-2">кредитов</span>
      </div>

      {/* Price */}
      <div className="mb-4">
        <span className="text-xl md:text-2xl font-bold text-white">{formattedPrice}</span>
        <span className="text-base font-medium text-white ml-1">₽</span>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-sm text-[#666]">{pkg.pricePerCredit}/кредит</span>
          {pkg.savings && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
              {pkg.savings}
            </span>
          )}
        </div>
      </div>

      {/* Features */}
      <ul className="space-y-2 md:space-y-2.5 mb-6 flex-1">
        {pkg.features.map((feature, index) => (
          <li key={index} className="flex items-start gap-2 md:gap-3">
            <div
              className={`
                flex-shrink-0 w-4 h-4 md:w-5 md:h-5 rounded-full flex items-center justify-center mt-0.5
                ${styles.checkBg}
              `}
            >
              <Check className={`w-2.5 h-2.5 md:w-3 md:h-3 ${styles.checkColor}`} />
            </div>
            <span className="text-xs md:text-sm text-[#aaa]">{feature}</span>
          </li>
        ))}
      </ul>

      {/* CTA Button */}
      <button
        onClick={() => onSelect(pkg.id)}
        className={`
          w-full py-3 md:py-3.5 rounded-xl font-medium text-sm
          transition-all duration-300
          relative overflow-hidden group
          active:scale-[0.98]
          ${isHighlighted || isPro
            ? `bg-gradient-to-r ${styles.button} text-white shadow-lg ${styles.buttonShadow}`
            : `${styles.button} text-white`
          }
        `}
      >
        {/* Shimmer effect */}
        {(isHighlighted || isPro) && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
        )}
        <span className="relative">Купить {pkg.name}</span>
      </button>
    </div>
  );
};

export const PaywallModal = () => {
  const { showPaywall, setShowPaywall, paywallReason, messageCount, imageCount, limits } = useUsage();

  const handleSelect = (packageId: string) => {
    const selectedPkg = creditPackages.find(p => p.id === packageId);
    if (!selectedPkg) return;
    
    // Process referral reward when someone subscribes
    processReferralReward();
    
    // For now, just show a toast - in production, this would redirect to Lava payment
    toast.info(`Оплата через Lava скоро будет доступна!`, {
      description: `Пакет ${selectedPkg.name} - ${selectedPkg.credits.toLocaleString()} кредитов за ${selectedPkg.price.toLocaleString()} ₽`,
    });
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
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl md:rounded-3xl bg-[#0a0a0a] border border-[#333] shadow-2xl">
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
              Откройте безграничные возможности 🚀
            </h2>
            <p className="text-[#888] text-sm md:text-lg max-w-xl mx-auto px-2">
              {reasonText} Пополните баланс чтобы продолжить творить с Synapse.
            </p>
          </div>

          {/* Credit Package Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 max-w-5xl mx-auto">
            {creditPackages.map((pkg) => (
              <PackageCard key={pkg.id} pkg={pkg} onSelect={handleSelect} />
            ))}
          </div>

          {/* Credit costs info */}
          <div className="mt-6 md:mt-8 p-4 rounded-xl bg-white/[0.02] border border-[#222] max-w-2xl mx-auto">
            <h4 className="text-sm font-medium text-white mb-3 text-center">Стоимость в кредитах</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="flex flex-col items-center p-2 rounded-lg bg-white/[0.02]">
                <span className="text-violet-400 font-bold text-lg">0.1-5</span>
                <span className="text-[#666]">Сообщение</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-white/[0.02]">
                <span className="text-violet-400 font-bold text-lg">3</span>
                <span className="text-[#666]">Изображение</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-white/[0.02]">
                <span className="text-violet-400 font-bold text-lg">30</span>
                <span className="text-[#666]">Клон голоса</span>
              </div>
              <div className="flex flex-col items-center p-2 rounded-lg bg-white/[0.02]">
                <span className="text-violet-400 font-bold text-lg">30</span>
                <span className="text-[#666]">Видео</span>
              </div>
            </div>
          </div>

          {/* Payment info */}
          <div className="mt-6 text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.02] border border-[#222]">
              <span className="text-xs text-[#666]">Безопасная оплата через</span>
              <span className="text-xs font-medium text-white">Lava</span>
              <span className="text-xs text-[#666]">• Карты РФ</span>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-6 md:mt-8 pt-4 md:pt-6 border-t border-[#222]">
            <p className="text-xs md:text-sm text-[#666]">
              Кредиты не сгорают. Используйте в любое время.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaywallModal;

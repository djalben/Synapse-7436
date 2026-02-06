import { useState } from "react";
import {
  MessageSquare,
  Image,
  Video,
  Music,
  User,
  Clock,
  Settings,
  Sparkles,
  Menu,
  X,
  Crown,
  Coins,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUsage } from "./usage-context";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: "chat", label: "Чат", icon: MessageSquare },
  { id: "image", label: "Изображения", icon: Image },
  { id: "motion", label: "Видео", icon: Video },
  { id: "audio", label: "Аудио", icon: Music },
  { id: "avatar", label: "Аватары", icon: User },
  { id: "history", label: "История", icon: Clock },
  { id: "settings", label: "Настройки", icon: Settings },
];

// Mobile Credits Indicator - Simplified to show only credit balance
const MobileCreditsIndicator = () => {
  const { creditBalance, userPlan, setShowPaywall, setPaywallReason } = useUsage();

  const isLowCredits = creditBalance < 5;
  const isVeryLowCredits = creditBalance < 1;

  const getCreditColorClass = () => {
    if (isVeryLowCredits) return "text-red-400";
    if (isLowCredits) return "text-amber-400";
    return "text-emerald-400";
  };

  const getCreditBgClass = () => {
    if (isVeryLowCredits) return "bg-red-500/20";
    if (isLowCredits) return "bg-amber-500/20";
    return "bg-indigo-500/20";
  };

  const getPlanName = (plan: string) => {
    const planNames: Record<string, string> = {
      free: "Бесплатный",
      lite: "Lite",
      standard: "Стандарт",
      ultra: "Ultra",
    };
    return planNames[plan] || plan;
  };

  return (
    <div className="px-4 py-4 rounded-xl bg-white/[0.03] space-y-3 shadow-sm">
      <div className="flex justify-between items-center">
        <div className="text-xs font-medium text-[#666] uppercase tracking-wider">
          Баланс
        </div>
        <div className="text-xs font-medium text-[#888] capitalize">
          {getPlanName(userPlan)}
        </div>
      </div>

      {/* Credit Balance - Primary display */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-indigo-500/10 via-blue-500/5 to-indigo-500/10 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${getCreditBgClass()}`}>
              <Coins className="w-3.5 h-3.5" />
            </div>
            <span className="text-sm font-medium text-white">Кредиты</span>
          </div>
          <span className={`text-lg font-bold ${getCreditColorClass()}`}>
            {creditBalance.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Warning message when low on credits */}
      {isLowCredits && (
        <button 
          onClick={() => {
            setPaywallReason("credits");
            setShowPaywall(true);
          }}
          className="w-full text-xs text-amber-400/80 hover:text-amber-400 bg-amber-500/10 rounded-lg py-2 px-2 transition-colors text-center"
        >
          Мало кредитов? Улучшите тариф →
        </button>
      )}
    </div>
  );
};

interface MobileNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const MobileNav = ({ activeTab, onTabChange }: MobileNavProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const { setShowPaywall, setPaywallReason } = useUsage();

  const handleTabChange = (tab: string) => {
    onTabChange(tab);
    setIsOpen(false);
  };

  const handleUpgradeClick = () => {
    setPaywallReason("messages");
    setShowPaywall(true);
    setIsOpen(false);
  };

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <button
          className="
            md:hidden fixed top-4 left-4 z-50
            w-11 h-11 rounded-xl
            bg-black/80 backdrop-blur-xl
            shadow-lg
            flex items-center justify-center
            text-white
            hover:bg-black/90
            transition-all duration-200
            active:scale-95
          "
          aria-label="Открыть меню навигации"
        >
          <Menu className="w-5 h-5" />
        </button>
      </SheetTrigger>
      
      <SheetContent 
        side="left" 
        showCloseButton={false}
        className="
          w-[280px] p-0 border-none
          bg-black/10 backdrop-blur-xl
          shadow-[8px_0_32px_rgba(0,0,0,0.3)]
        "
      >
        {/* Logo Section */}
        <div className="p-6 pb-6 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-lg blur-md opacity-50" />
              <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-600 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
            </div>
            <span className="font-mono text-xl font-semibold tracking-tight text-white">
              Synapse
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleTabChange(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                      transition-all duration-200 ease-out
                      font-medium text-[15px]
                      active:scale-[0.98]
                      ${
                        isActive
                          ? "bg-white/[0.08] text-white"
                          : "text-[#888] hover:text-white hover:bg-white/[0.04]"
                      }
                    `}
                  >
                    <div className="relative">
                      {isActive && (
                        <div className="absolute inset-0 bg-indigo-500/30 rounded-full blur-md" />
                      )}
                      <Icon
                        className={`relative w-5 h-5 transition-colors duration-200 ${
                          isActive ? "text-indigo-400" : ""
                        }`}
                      />
                    </div>
                    <span>{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-2 h-2 rounded-full bg-indigo-500" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Credits Display */}
        <div className="p-4 pt-2 space-y-4">
          <MobileCreditsIndicator />
          
          {/* Upgrade Button */}
          <button 
            onClick={handleUpgradeClick}
            className="relative w-full group overflow-hidden"
          >
            {/* Animated gradient border */}
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500 opacity-80 blur-[1px] group-hover:opacity-100 transition-opacity" />
            <div className="absolute inset-[1px] rounded-[11px] bg-black" />
            
            {/* Content */}
            <div className="relative px-4 py-3.5 flex items-center justify-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
              <span className="font-medium text-sm text-white/90 group-hover:text-white transition-colors">
                Улучшить тариф
              </span>
            </div>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

// Mobile top bar component for displaying current tab and model selector
interface MobileTopBarProps {
  activeTab: string;
  children?: React.ReactNode;
}

export const MobileTopBar = ({ activeTab, children }: MobileTopBarProps) => {
  const { setShowPaywall, setPaywallReason } = useUsage();

  const getTabTitle = () => {
    switch (activeTab) {
      case "chat": return "Чат";
      case "image": return "Изображения";
      case "motion": return "Видео";
      case "audio": return "Аудио";
      case "avatar": return "Аватары";
      case "history": return "История";
      case "settings": return "Настройки";
      default: return "Synapse";
    }
  };

  const handlePremiumClick = () => {
    setPaywallReason("messages");
    setShowPaywall(true);
  };

  return (
    <div className="
      md:hidden fixed top-0 left-0 right-0 z-40 border-none
      h-16
      bg-black/10 backdrop-blur-xl
      flex items-center justify-between
      px-4 pl-16
    ">
      <h1 className="font-mono text-lg font-semibold text-white truncate">
        {getTabTitle()}
      </h1>
      <div className="flex items-center gap-4">
        {/* Mobile Premium Button */}
        <button
          onClick={handlePremiumClick}
          className="
            relative group overflow-hidden
            px-2.5 py-1.5 rounded-lg
            bg-gradient-to-r from-amber-500 to-orange-500
            text-white font-medium text-xs
            shadow-lg shadow-amber-500/20
            active:scale-95
            transition-all duration-300
          "
          style={{
            animation: "premium-pulse 3s ease-in-out infinite",
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
          <span className="relative flex items-center gap-1.5">
            <Crown className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Премиум</span>
          </span>
        </button>
        {children}
      </div>
      
      {/* Premium pulse animation styles */}
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
    </div>
  );
};

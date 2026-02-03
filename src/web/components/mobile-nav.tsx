import { useState } from "react";
import {
  MessageSquare,
  Image,
  Video,
  Music,
  Clock,
  Settings,
  Sparkles,
  Menu,
  X,
  Crown,
} from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useUsage } from "./usage-context";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "image", label: "Image Studio", icon: Image },
  { id: "motion", label: "Motion Lab", icon: Video },
  { id: "audio", label: "Audio Studio", icon: Music },
  { id: "history", label: "History", icon: Clock },
  { id: "settings", label: "Settings", icon: Settings },
];

// Mobile Credits Indicator
const MobileCreditsIndicator = () => {
  const { messageCount, imageCount, limits, setShowPaywall, setPaywallReason } = useUsage();

  const messagesRemaining = limits.maxMessages - messageCount;
  const imagesRemaining = limits.maxImages - imageCount;

  const getColorClass = (remaining: number, max: number) => {
    const percentage = remaining / max;
    if (remaining === 0) return "text-red-400";
    if (percentage <= 0.2) return "text-amber-400";
    return "text-emerald-400";
  };

  const getBarColor = (remaining: number, max: number) => {
    const percentage = remaining / max;
    if (remaining === 0) return "bg-red-500";
    if (percentage <= 0.2) return "bg-amber-500";
    return "bg-emerald-500";
  };

  const getBarBgColor = (remaining: number, max: number) => {
    const percentage = remaining / max;
    if (remaining === 0) return "bg-red-500/20";
    if (percentage <= 0.2) return "bg-amber-500/20";
    return "bg-emerald-500/20";
  };

  return (
    <div className="px-4 py-4 rounded-xl bg-white/[0.02] border border-[#222] space-y-3">
      <div className="text-xs font-medium text-[#666] uppercase tracking-wider">
        Free Credits
      </div>

      {/* Messages */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#888] flex items-center gap-1.5">
            <MessageSquare className="w-3 h-3" />
            Messages
          </span>
          <span className={`text-xs font-medium ${getColorClass(messagesRemaining, limits.maxMessages)}`}>
            {messageCount}/{limits.maxMessages}
          </span>
        </div>
        <div className={`h-1.5 rounded-full ${getBarBgColor(messagesRemaining, limits.maxMessages)}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${getBarColor(messagesRemaining, limits.maxMessages)}`}
            style={{ width: `${(messageCount / limits.maxMessages) * 100}%` }}
          />
        </div>
      </div>

      {/* Images */}
      <div className="space-y-1.5">
        <div className="flex justify-between items-center">
          <span className="text-xs text-[#888] flex items-center gap-1.5">
            <Image className="w-3 h-3" />
            Images
          </span>
          <span className={`text-xs font-medium ${getColorClass(imagesRemaining, limits.maxImages)}`}>
            {imageCount}/{limits.maxImages}
          </span>
        </div>
        <div className={`h-1.5 rounded-full ${getBarBgColor(imagesRemaining, limits.maxImages)}`}>
          <div
            className={`h-full rounded-full transition-all duration-500 ${getBarColor(imagesRemaining, limits.maxImages)}`}
            style={{ width: `${(imageCount / limits.maxImages) * 100}%` }}
          />
        </div>
      </div>

      {/* Warning message when low */}
      {(messagesRemaining <= 1 || imagesRemaining <= 0) && (
        <button 
          onClick={() => {
            setPaywallReason(imagesRemaining <= 0 ? "images" : "messages");
            setShowPaywall(true);
          }}
          className="w-full text-xs text-amber-400/80 hover:text-amber-400 bg-amber-500/10 rounded-lg py-2 px-2 transition-colors text-center"
        >
          Running low? Upgrade now →
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
            border border-[#333]
            flex items-center justify-center
            text-white
            hover:bg-black/90 hover:border-[#444]
            transition-all duration-200
            active:scale-95
          "
          aria-label="Open navigation menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </SheetTrigger>
      
      <SheetContent 
        side="left" 
        showCloseButton={false}
        className="
          w-[280px] p-0
          bg-black/95 backdrop-blur-xl
          border-r border-[#222]
        "
      >
        {/* Logo Section */}
        <div className="p-6 pb-6 border-b border-[#222]">
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
                Upgrade Plan
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
      case "chat": return "Chat";
      case "image": return "Image Studio";
      case "motion": return "Motion Lab";
      case "audio": return "Audio Studio";
      case "history": return "History";
      case "settings": return "Settings";
      default: return "Synapse";
    }
  };

  const handlePremiumClick = () => {
    setPaywallReason("messages");
    setShowPaywall(true);
  };

  return (
    <div className="
      md:hidden fixed top-0 left-0 right-0 z-40
      h-16
      bg-black/80 backdrop-blur-xl
      border-b border-[#222]
      flex items-center justify-between
      px-4 pl-16
    ">
      <h1 className="font-mono text-lg font-semibold text-white truncate">
        {getTabTitle()}
      </h1>
      <div className="flex items-center gap-3">
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
            <span className="hidden xs:inline">Premium</span>
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

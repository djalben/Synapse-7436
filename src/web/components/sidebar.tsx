import { useState } from "react";
import {
  MessageSquare,
  Image,
  Video,
  Music,
  Clock,
  Settings,
  Sparkles,
  Coins,
} from "lucide-react";
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

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Credits indicator component
const CreditsIndicator = () => {
  const { messageCount, imageCount, creditBalance, userPlan, limits, setShowPaywall, setPaywallReason } = useUsage();

  const messagesRemaining = limits.maxMessages - messageCount;
  const imagesRemaining = limits.maxImages - imageCount;
  const isLowCredits = creditBalance < 5;
  const isVeryLowCredits = creditBalance < 1;

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

  const getCreditColorClass = () => {
    if (isVeryLowCredits) return "text-red-400";
    if (isLowCredits) return "text-amber-400";
    return "text-emerald-400";
  };

  return (
    <div className="px-3 py-4 mx-3 rounded-xl bg-white/[0.02] border border-[#222] space-y-3">
      <div className="flex justify-between items-center">
        <div className="text-xs font-medium text-[#666] uppercase tracking-wider">
          Usage
        </div>
        <div className="text-xs font-medium text-[#888] capitalize">
          {userPlan} plan
        </div>
      </div>

      {/* Credit Balance - Primary display */}
      <div className="p-3 rounded-lg bg-gradient-to-r from-indigo-500/10 via-blue-500/5 to-indigo-500/10 border border-indigo-500/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg ${isVeryLowCredits ? "bg-red-500/20" : isLowCredits ? "bg-amber-500/20" : "bg-indigo-500/20"}`}>
              <Coins className={`w-3.5 h-3.5 ${getCreditColorClass()}`} />
            </div>
            <span className="text-sm font-medium text-white">Credits</span>
          </div>
          <span className={`text-lg font-bold ${getCreditColorClass()}`}>
            {creditBalance.toFixed(1)}
          </span>
        </div>
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
      {(messagesRemaining <= 1 || imagesRemaining <= 0 || isLowCredits) && (
        <button 
          onClick={() => {
            setPaywallReason(isLowCredits ? "credits" : imagesRemaining <= 0 ? "images" : "messages");
            setShowPaywall(true);
          }}
          className="w-full text-xs text-amber-400/80 hover:text-amber-400 bg-amber-500/10 rounded-lg py-2 px-2 transition-colors text-center"
        >
          {isLowCredits ? "Low on credits? " : "Running low? "}Upgrade now →
        </button>
      )}
    </div>
  );
};

export const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);
  const { setShowPaywall, setPaywallReason } = useUsage();

  const handleUpgradeClick = () => {
    setPaywallReason("messages");
    setShowPaywall(true);
  };

  return (
    <aside className="hidden md:flex fixed left-0 top-0 h-screen w-[240px] bg-black/90 backdrop-blur-xl border-r border-[#222] flex-col z-50">
      {/* Logo Section */}
      <div className="p-6 pb-8">
        <div className="flex items-center gap-3 group cursor-default">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-lg blur-md opacity-50 group-hover:opacity-80 transition-opacity duration-500" />
            <div className="relative w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 via-blue-500 to-indigo-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
          </div>
          <span className="font-mono text-xl font-semibold tracking-tight text-white">
            Synapse
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            const isHovered = hoveredTab === item.id;

            return (
              <li key={item.id}>
                <button
                  onClick={() => onTabChange(item.id)}
                  onMouseEnter={() => setHoveredTab(item.id)}
                  onMouseLeave={() => setHoveredTab(null)}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg
                    transition-all duration-200 ease-out
                    font-medium text-[14px]
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
                      className={`relative w-[18px] h-[18px] transition-colors duration-200 ${
                        isActive ? "text-indigo-400" : ""
                      }`}
                    />
                  </div>
                  <span>{item.label}</span>
                  {isActive && (
                    <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Credits Display */}
      <div className="mb-2">
        <CreditsIndicator />
      </div>

      {/* Upgrade Button */}
      <div className="p-4 pt-0">
        <button 
          onClick={handleUpgradeClick}
          className="relative w-full group overflow-hidden"
        >
          {/* Animated gradient border */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-500 opacity-80 blur-[1px] group-hover:opacity-100 transition-opacity" />
          <div className="absolute inset-[1px] rounded-[11px] bg-black" />
          
          {/* Content */}
          <div className="relative px-4 py-3 flex items-center justify-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
            <span className="font-medium text-sm text-white/90 group-hover:text-white transition-colors">
              Upgrade Plan
            </span>
          </div>
          
          {/* Hover glow effect */}
          <div className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-gradient-to-r from-indigo-500/20 via-blue-500/20 to-indigo-500/20 blur-xl" />
        </button>
      </div>
    </aside>
  );
};

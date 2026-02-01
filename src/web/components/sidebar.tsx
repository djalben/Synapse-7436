import { useState } from "react";
import {
  MessageSquare,
  Image,
  Video,
  Clock,
  Settings,
  Sparkles,
} from "lucide-react";

interface NavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { id: "chat", label: "Chat", icon: MessageSquare },
  { id: "image", label: "Image Studio", icon: Image },
  { id: "motion", label: "Motion Lab", icon: Video },
  { id: "history", label: "History", icon: Clock },
  { id: "settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Sidebar = ({ activeTab, onTabChange }: SidebarProps) => {
  const [hoveredTab, setHoveredTab] = useState<string | null>(null);

  return (
    <aside className="fixed left-0 top-0 h-screen w-[240px] bg-black/90 backdrop-blur-xl border-r border-[#222] flex flex-col z-50">
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

      {/* Upgrade Button */}
      <div className="p-4">
        <button className="relative w-full group overflow-hidden">
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

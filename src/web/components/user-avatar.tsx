import { useState, useRef, useEffect } from "react";
import { User, Settings, LogOut, ChevronDown } from "lucide-react";
import { useAuth } from "./auth-context";
import { toast } from "sonner";

interface UserAvatarProps {
  onSettingsClick?: () => void;
}

export const UserAvatar = ({ onSettingsClick }: UserAvatarProps) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) return null;

  const handleLogout = () => {
    setIsOpen(false);
    logout();
    toast.success("Вы вышли из аккаунта", {
      description: "До встречи!",
    });
  };

  const handleSettingsClick = () => {
    setIsOpen(false);
    onSettingsClick?.();
  };

  // Get initials from name
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((word) => word[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Avatar Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="
          flex items-center gap-2 
          px-2 py-1.5 rounded-lg
          hover:bg-white/[0.05] active:scale-[0.98]
          transition-all duration-200
          group
        "
      >
        {/* Avatar */}
        <div className="relative">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              className="w-8 h-8 rounded-full border border-[#333] group-hover:border-[#444] transition-colors"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium border border-[#333]">
              {getInitials(user.name)}
            </div>
          )}
          {/* Online indicator */}
          <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-black" />
        </div>

        {/* Dropdown indicator only — no name text */}
        <ChevronDown 
          className={`hidden md:block w-3.5 h-3.5 text-[#555] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} 
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div 
          className="
            absolute right-0 top-full mt-2 
            w-56 py-2 
            bg-[#0a0a0a]/95 backdrop-blur-xl 
            border border-[#333] rounded-xl 
            shadow-2xl shadow-black/50
            z-50
            animate-in fade-in slide-in-from-top-2 duration-200
          "
        >
          {/* User Info */}
          <div className="px-4 py-3 border-b border-[#222]">
            <div className="flex items-center gap-3">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-10 h-10 rounded-full border border-[#333]"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center text-white text-sm font-medium">
                  {getInitials(user.name)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                {user.email && (
                  <p className="text-xs text-[#666] truncate">{user.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <div className="py-1">
            <button
              onClick={handleSettingsClick}
              className="
                w-full flex items-center gap-3 
                px-4 py-2.5 
                text-sm text-[#888] 
                hover:text-white hover:bg-white/[0.05]
                transition-colors
              "
            >
              <User className="w-4 h-4" />
              <span>Мой аккаунт</span>
            </button>

            <button
              onClick={handleSettingsClick}
              className="
                w-full flex items-center gap-3 
                px-4 py-2.5 
                text-sm text-[#888] 
                hover:text-white hover:bg-white/[0.05]
                transition-colors
              "
            >
              <Settings className="w-4 h-4" />
              <span>Настройки</span>
            </button>
          </div>

          {/* Logout */}
          <div className="pt-1 mt-1 border-t border-[#222]">
            <button
              onClick={handleLogout}
              className="
                w-full flex items-center gap-3 
                px-4 py-2.5 
                text-sm text-red-400/80 
                hover:text-red-400 hover:bg-red-500/10
                transition-colors
              "
            >
              <LogOut className="w-4 h-4" />
              <span>Выйти</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

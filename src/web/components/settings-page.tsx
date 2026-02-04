import { useState, useRef, useCallback, useEffect } from "react";
import {
  Settings as SettingsIcon,
  User,
  Bell,
  Globe,
  Shield,
  ExternalLink,
  Sparkles,
  Gift,
  Users,
  Coins,
  Copy,
  Check,
  Trash2,
  HelpCircle,
  MessageCircle,
  Bug,
  Twitter,
  Github,
  Instagram,
  Lock,
  X,
  CreditCard,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { useAuth } from "./auth-context";
import { useUsage } from "./usage-context";

// Generate a unique user ID for referrals
const generateUserId = () => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Get or create user ID from localStorage
const getUserId = () => {
  if (typeof window === "undefined") return "";
  
  let userId = localStorage.getItem("userId");
  if (!userId) {
    userId = generateUserId();
    localStorage.setItem("userId", userId);
  }
  return userId;
};

// Get referral stats from localStorage
const getReferralStats = () => {
  if (typeof window === "undefined") {
    return { friendsInvited: 0, creditsEarned: 0 };
  }
  
  return {
    friendsInvited: parseInt(localStorage.getItem("friendsInvited") || "0"),
    creditsEarned: parseInt(localStorage.getItem("creditsEarned") || "0"),
  };
};

// Secret knock functionality for developer mode - returns show PIN modal state
const useSecretKnock = (requiredClicks: number, timeWindowMs: number) => {
  const [showPinModal, setShowPinModal] = useState(false);
  const clickTimestamps = useRef<number[]>([]);

  const handleClick = useCallback(() => {
    const now = Date.now();
    
    clickTimestamps.current.push(now);
    clickTimestamps.current = clickTimestamps.current.filter(
      (timestamp) => now - timestamp < timeWindowMs
    );
    
    if (clickTimestamps.current.length >= requiredClicks) {
      setShowPinModal(true);
      clickTimestamps.current = [];
    }
  }, [requiredClicks, timeWindowMs]);

  const closePinModal = useCallback(() => {
    setShowPinModal(false);
  }, []);

  return { showPinModal, handleClick, closePinModal };
};

// PIN Input Modal Component
interface PinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PinModal = ({ isOpen, onClose }: PinModalProps) => {
  const [, navigate] = useLocation();
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [isLocked, setIsLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const CORRECT_PIN = "7777";
  const MAX_ATTEMPTS = 3;
  const LOCKOUT_SECONDS = 30;

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isLocked && lockTimer > 0) {
      const timer = setTimeout(() => {
        setLockTimer(lockTimer - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (isLocked && lockTimer === 0) {
      setIsLocked(false);
      setAttempts(0);
      setError("");
    }
  }, [isLocked, lockTimer]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isLocked) return;

    if (pin === CORRECT_PIN) {
      toast.success("Доступ разрешён 🔓", {
        description: "Перенаправление в панель администратора...",
      });
      setPin("");
      setError("");
      setAttempts(0);
      onClose();
      setTimeout(() => {
        navigate("/admin");
      }, 500);
    } else {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      setPin("");
      
      if (newAttempts >= MAX_ATTEMPTS) {
        setIsLocked(true);
        setLockTimer(LOCKOUT_SECONDS);
        setError("Слишком много попыток. Попробуйте позже.");
      } else {
        setError(`Неверный PIN (осталось ${MAX_ATTEMPTS - newAttempts} попыток)`);
      }
    }
  };

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "").slice(0, 4);
    setPin(value);
    if (error && !isLocked) setError("");
  };

  const handleClose = () => {
    setPin("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative w-full max-w-sm mx-4 p-6 rounded-2xl bg-gradient-to-b from-[#111] to-[#0a0a0a] border border-[#333] shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-lg bg-white/[0.05] border border-[#333] flex items-center justify-center hover:bg-white/[0.1] transition-colors"
        >
          <X className="w-4 h-4 text-[#888]" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
            <Lock className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="font-mono text-lg font-semibold text-white">🔐 Режим разработчика</h2>
            <p className="text-xs text-[#666]">Введите PIN для продолжения</p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <input
              ref={inputRef}
              type="password"
              value={pin}
              onChange={handlePinChange}
              placeholder="• • • •"
              disabled={isLocked}
              className={`w-full px-4 py-4 rounded-xl text-center text-2xl font-mono tracking-[0.5em] bg-white/[0.02] border transition-colors outline-none ${
                error 
                  ? "border-red-500/50 focus:border-red-500" 
                  : "border-[#333] focus:border-indigo-500/50"
              } ${isLocked ? "opacity-50 cursor-not-allowed" : ""}`}
            />
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400 text-center">
                {error}
                {isLocked && lockTimer > 0 && (
                  <span className="block mt-1 text-xs text-red-400/70">
                    Повторите через {lockTimer}с
                  </span>
                )}
              </p>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={pin.length !== 4 || isLocked}
            className="w-full py-3.5 rounded-xl font-medium text-sm bg-gradient-to-r from-indigo-500 to-purple-600 text-white hover:from-indigo-400 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-indigo-500 disabled:hover:to-purple-600"
          >
            {isLocked ? `Заблокировано (${lockTimer}с)` : "Подтвердить"}
          </button>
        </form>

        {/* Hint */}
        <p className="mt-4 text-center text-xs text-[#444]">
          Введите 4-значный PIN для доступа к админ-панели
        </p>
      </div>
    </div>
  );
};

// Plan display names
const planDisplayNames: Record<string, string> = {
  free: "Бесплатный",
  start: "START",
  creator: "CREATOR",
  pro_studio: "PRO STUDIO",
  agency: "МАКСИМАЛЬНЫЙ",
};

// Referral Card Component
const ReferralCard = () => {
  const { user } = useAuth();
  const [userId, setUserId] = useState("");
  const [stats, setStats] = useState({ friendsInvited: 0, creditsEarned: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    // Use user.id if available, otherwise generate
    setUserId(user?.id || getUserId());
    setStats(getReferralStats());
  }, [user]);

  const referralLink = userId ? `${window.location.origin}?ref=${userId}` : "";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      toast.success("Ссылка скопирована! Поделитесь с друзьями 📋");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Не удалось скопировать ссылку");
    }
  };

  return (
    <section className="relative overflow-hidden p-5 md:p-6 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 border border-indigo-500/20">
      <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 opacity-50" />
      
      <div className="relative">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-medium text-white">Пригласи друзей и получи бонус 🎁</h2>
            <p className="text-xs text-[#888]">
              Получи <span className="text-indigo-400 font-semibold">500 кредитов</span> за каждого друга, который оформит подписку!
            </p>
          </div>
        </div>

        {/* Referral Link */}
        <div className="mb-4">
          <label className="text-xs text-[#666] mb-2 block">Ваша реферальная ссылка</label>
          <div className="flex gap-2">
            <div className="flex-1 px-3 py-2.5 rounded-lg bg-white/[0.02] border border-[#333] text-sm text-[#888] truncate min-w-0">
              {referralLink || "Загрузка..."}
            </div>
            <button
              onClick={handleCopy}
              disabled={!referralLink}
              className="px-3 md:px-4 py-2.5 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/30 transition-colors flex items-center gap-2 disabled:opacity-50 flex-shrink-0"
            >
              {copied ? (
                <Check className="w-4 h-4" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
              <span className="text-sm hidden sm:inline">{copied ? "Скопировано!" : "Копировать"}</span>
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 md:p-4 rounded-xl bg-white/[0.02] border border-[#333]">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-indigo-400" />
              <span className="text-xs text-[#666]">Приглашено друзей</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-white">{stats.friendsInvited}</p>
          </div>
          <div className="p-3 md:p-4 rounded-xl bg-white/[0.02] border border-[#333]">
            <div className="flex items-center gap-2 mb-1">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-xs text-[#666]">Заработано кредитов</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-white">{stats.creditsEarned}</p>
          </div>
        </div>
      </div>
    </section>
  );
};

// Redeem Gift Code Card Component
const RedeemCodeCard = () => {
  const [code, setCode] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const handleRedeem = () => {
    if (!code.trim()) {
      toast.error("Пожалуйста, введите код");
      return;
    }

    setIsRedeeming(true);

    // Get gift codes from localStorage
    const giftCodesStr = localStorage.getItem("giftCodes");
    const giftCodes = giftCodesStr ? JSON.parse(giftCodesStr) : [];

    // Find the code
    const foundCode = giftCodes.find(
      (c: { code: string; status: string }) => 
        c.code.toUpperCase() === code.toUpperCase().trim() && c.status === "active"
    );

    if (!foundCode) {
      toast.error("Неверный или истёкший код");
      setIsRedeeming(false);
      return;
    }

    // Apply the reward
    if (foundCode.type === "credits") {
      // Add credits to user's balance
      const currentCredits = parseInt(localStorage.getItem("userCredits") || "0");
      const newCredits = currentCredits + foundCode.value;
      localStorage.setItem("userCredits", newCredits.toString());
      
      toast.success(`🎉 Код активирован!`, {
        description: `Вы получили ${foundCode.value} кредитов!`,
      });
    } else if (foundCode.type === "plan") {
      // Upgrade user's plan
      localStorage.setItem("userPlan", foundCode.value);
      
      toast.success(`🎉 Код активирован!`, {
        description: `Теперь у вас тариф ${foundCode.value}!`,
      });
    }

    // Mark code as redeemed
    foundCode.status = "redeemed";
    localStorage.setItem("giftCodes", JSON.stringify(giftCodes));

    // Clear input
    setCode("");
    setIsRedeeming(false);
  };

  return (
    <section className="p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-[#222]">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center flex-shrink-0">
          <Gift className="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 className="text-sm font-medium text-white">Активировать промокод</h2>
          <p className="text-xs text-[#666]">
            Есть промокод? Введите его здесь для получения кредитов или тарифа.
          </p>
        </div>
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="SYNAPSE-XXXX-XXXX"
          className="flex-1 px-4 py-3 rounded-xl bg-white/[0.02] border border-[#333] text-white text-sm placeholder-[#555] outline-none focus:border-indigo-500/50 font-mono"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleRedeem();
          }}
        />
        <button
          onClick={handleRedeem}
          disabled={isRedeeming || !code.trim()}
          className="px-5 py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-400 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
        >
          {isRedeeming ? "..." : "Активировать"}
        </button>
      </div>
    </section>
  );
};

// Section Header Component
const SectionHeader = ({ icon: Icon, title }: { icon: React.ComponentType<{ className?: string }>; title: string }) => (
  <div className="flex items-center gap-2 mb-4">
    <Icon className="w-4 h-4 text-indigo-400" />
    <h2 className="text-sm font-medium text-white">{title}</h2>
  </div>
);

interface SettingsPageProps {
  onOpenPaywall?: () => void;
}

export const SettingsPage = ({ onOpenPaywall }: SettingsPageProps) => {
  const { showPinModal, handleClick, closePinModal } = useSecretKnock(5, 3000);
  const { user } = useAuth();
  const { creditBalance, userPlan, setShowPaywall } = useUsage();

  // Get initials from name or email
  const getInitials = (name?: string, email?: string | null) => {
    if (name) {
      return name
        .split(" ")
        .map((word) => word[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return "U";
  };

  const handleOpenPaywall = () => {
    if (onOpenPaywall) {
      onOpenPaywall();
    } else {
      setShowPaywall(true);
    }
  };

  const handleDeleteAccount = () => {
    if (confirm("Вы уверены, что хотите удалить аккаунт? Это действие нельзя отменить, все ваши данные будут удалены.")) {
      if (confirm("Это последнее предупреждение. Все ваши генерации, история чата и настройки будут безвозвратно удалены. Продолжить?")) {
        // Clear all localStorage data
        localStorage.clear();
        toast.success("Аккаунт успешно удалён", {
          description: "Все ваши данные были удалены.",
        });
        // Reload the page
        setTimeout(() => window.location.reload(), 1500);
      }
    }
  };

  const displayName = user?.name || "Пользователь";
  const displayEmail = user?.email || "Не указан";
  const displayPlan = planDisplayNames[userPlan] || "Бесплатный";

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/[0.05] border border-[#333] flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-[#888]" />
            </div>
            <h1 className="font-mono text-xl md:text-2xl font-semibold text-white">Настройки</h1>
          </div>
          <p className="text-[#666] text-sm">Управление настройками Synapse</p>
        </div>

        <div className="space-y-5 md:space-y-6">
          {/* Section 1: Account / Profile */}
          <section className="p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-[#222]">
            <SectionHeader icon={User} title="Профиль" />
            
            <div className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02] border border-[#222]">
              {/* Avatar */}
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="w-12 h-12 md:w-14 md:h-14 rounded-full border border-[#333] flex-shrink-0"
                />
              ) : (
                <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-lg font-medium">
                    {getInitials(user?.name, user?.email)}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm md:text-base font-medium text-white truncate">{displayName}</p>
                <p className="text-xs text-[#666] truncate">{displayEmail}</p>
              </div>
              <button 
                onClick={() => toast.info("Редактирование профиля скоро будет доступно")}
                className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.05] text-[#888] border border-[#333] hover:bg-white/[0.08] transition-colors flex-shrink-0"
              >
                Редактировать
              </button>
            </div>
          </section>

          {/* Section 2: Balance and Plan */}
          <section className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-transparent border border-indigo-500/20">
            <SectionHeader icon={Wallet} title="Баланс и тариф" />
            
            <div className="space-y-4">
              {/* Balance */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#222]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#666] mb-1">Текущий баланс</p>
                    <p className="text-2xl md:text-3xl font-bold text-white">
                      {creditBalance.toFixed(1)} <span className="text-lg text-[#888]">кредитов</span>
                    </p>
                  </div>
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                    <Coins className="w-6 h-6 text-amber-400" />
                  </div>
                </div>
              </div>

              {/* Plan */}
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#222]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#666] mb-1">Текущий тариф</p>
                    <p className="text-lg font-semibold text-white">{displayPlan}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                    userPlan === "free" 
                      ? "bg-white/[0.05] text-[#888] border-[#333]"
                      : "bg-indigo-500/20 text-indigo-400 border-indigo-500/30"
                  }`}>
                    {userPlan === "free" ? "Бесплатный" : "Активен"}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleOpenPaywall}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-600 text-white font-medium text-sm hover:from-indigo-500 hover:via-blue-500 hover:to-indigo-500 transition-all shadow-lg shadow-indigo-500/20"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Пополнить баланс</span>
                </button>
                <button
                  onClick={handleOpenPaywall}
                  className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/[0.05] border border-[#333] text-white font-medium text-sm hover:bg-white/[0.08] transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Управление тарифом</span>
                </button>
              </div>
            </div>
          </section>

          {/* Section 3: Referral Program */}
          <ReferralCard />

          {/* Section 4: Redeem Gift Code */}
          <RedeemCodeCard />

          {/* Section 5: Preferences */}
          <section className="p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-[#222]">
            <SectionHeader icon={Globe} title="Настройки" />
            
            <div className="space-y-3">
              {/* Theme */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-[#222]">
                <div>
                  <p className="text-sm font-medium text-white">Тема</p>
                  <p className="text-xs text-[#666]">Внешний вид интерфейса</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-lg text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    Тёмная
                  </button>
                  <button className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.02] text-[#666] border border-[#333] cursor-not-allowed opacity-50">
                    Светлая
                  </button>
                </div>
              </div>

              {/* Language */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-[#222]">
                <div>
                  <p className="text-sm font-medium text-white">Язык</p>
                  <p className="text-xs text-[#666]">Выберите язык</p>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1.5 rounded-lg text-xs bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                    Русский
                  </button>
                  <button className="px-3 py-1.5 rounded-lg text-xs bg-white/[0.02] text-[#666] border border-[#333] cursor-not-allowed opacity-50">
                    English
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Section 6: Notifications */}
          <section className="p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-[#222]">
            <SectionHeader icon={Bell} title="Уведомления" />
            
            <div className="space-y-3">
              <label className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-[#222] cursor-pointer hover:bg-white/[0.03] transition-colors">
                <div>
                  <p className="text-sm font-medium text-white">Push-уведомления</p>
                  <p className="text-xs text-[#666]">Уведомления о генерациях</p>
                </div>
                <div className="relative flex-shrink-0">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-10 h-5 bg-[#333] rounded-full peer peer-checked:bg-indigo-500 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                </div>
              </label>

              <label className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-[#222] cursor-pointer hover:bg-white/[0.03] transition-colors">
                <div>
                  <p className="text-sm font-medium text-white">Email рассылка</p>
                  <p className="text-xs text-[#666]">Новости и советы</p>
                </div>
                <div className="relative flex-shrink-0">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-10 h-5 bg-[#333] rounded-full peer peer-checked:bg-indigo-500 transition-colors" />
                  <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            </div>
          </section>

          {/* Section 7: Data & Privacy */}
          <section className="p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-[#222]">
            <SectionHeader icon={Shield} title="Данные и конфиденциальность" />
            
            <div className="space-y-3">
              <button 
                onClick={() => {
                  if (confirm("Очистить всю историю чата? Это действие нельзя отменить.")) {
                    localStorage.removeItem("chatHistory");
                    toast.success("История чата очищена");
                  }
                }}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-[#222] hover:bg-white/[0.03] transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-white">Очистить историю чата</p>
                  <p className="text-xs text-[#666]">Удалить все диалоги</p>
                </div>
              </button>

              <button 
                onClick={() => {
                  if (confirm("Очистить все сгенерированные изображения? Это действие нельзя отменить.")) {
                    localStorage.removeItem("generatedImages");
                    toast.success("Изображения удалены");
                  }
                }}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-[#222] hover:bg-white/[0.03] transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-white">Очистить изображения</p>
                  <p className="text-xs text-[#666]">Удалить историю генераций</p>
                </div>
              </button>

              <button 
                onClick={() => toast.info("Экспорт данных скоро будет доступен")}
                className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-[#222] hover:bg-white/[0.03] transition-colors text-left"
              >
                <div>
                  <p className="text-sm font-medium text-white">Экспорт данных</p>
                  <p className="text-xs text-[#666]">Скачать ваши данные</p>
                </div>
                <ExternalLink className="w-4 h-4 text-[#666] flex-shrink-0" />
              </button>

              {/* Delete Account - Danger Zone */}
              <div className="pt-3 mt-3 border-t border-[#222]">
                <button 
                  onClick={handleDeleteAccount}
                  className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 hover:border-red-500/30 transition-colors text-left group"
                >
                  <div>
                    <p className="text-sm font-medium text-red-400">Удалить аккаунт</p>
                    <p className="text-xs text-red-400/60">Безвозвратно удалить все данные</p>
                  </div>
                  <Trash2 className="w-4 h-4 text-red-400/60 group-hover:text-red-400 transition-colors flex-shrink-0" />
                </button>
              </div>
            </div>
          </section>

          {/* PIN Modal for Developer Access */}
          <PinModal isOpen={showPinModal} onClose={closePinModal} />

          {/* Section 8: About */}
          <section className="p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-[#222]">
            <SectionHeader icon={Sparkles} title="О приложении" />
            
            <div className="space-y-3">
              {/* Help Links */}
              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); toast.info("Центр помощи скоро будет доступен"); }}
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-[#222] hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <HelpCircle className="w-4 h-4 text-[#666]" />
                  <span className="text-sm font-medium text-white">Центр помощи</span>
                </div>
                <ExternalLink className="w-4 h-4 text-[#666]" />
              </a>

              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); toast.info("Связь с поддержкой: support@synapse.ai"); }}
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-[#222] hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-4 h-4 text-[#666]" />
                  <span className="text-sm font-medium text-white">Связаться с поддержкой</span>
                </div>
                <ExternalLink className="w-4 h-4 text-[#666]" />
              </a>

              <a 
                href="#" 
                onClick={(e) => { e.preventDefault(); toast.info("Отчёт об ошибке скоро будет доступен"); }}
                className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-[#222] hover:bg-white/[0.03] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Bug className="w-4 h-4 text-[#666]" />
                  <span className="text-sm font-medium text-white">Сообщить об ошибке</span>
                </div>
                <ExternalLink className="w-4 h-4 text-[#666]" />
              </a>

              {/* Social Links */}
              <div className="pt-4 mt-4 border-t border-[#222]">
                <p className="text-xs text-[#666] mb-3">Подписывайтесь на нас</p>
                <div className="flex gap-3">
                  <a 
                    href="#" 
                    onClick={(e) => e.preventDefault()}
                    className="w-10 h-10 rounded-lg bg-white/[0.02] border border-[#333] flex items-center justify-center hover:bg-white/[0.05] hover:border-[#444] transition-colors"
                  >
                    <Twitter className="w-4 h-4 text-[#888]" />
                  </a>
                  <a 
                    href="#" 
                    onClick={(e) => e.preventDefault()}
                    className="w-10 h-10 rounded-lg bg-white/[0.02] border border-[#333] flex items-center justify-center hover:bg-white/[0.05] hover:border-[#444] transition-colors"
                  >
                    <Github className="w-4 h-4 text-[#888]" />
                  </a>
                  <a 
                    href="#" 
                    onClick={(e) => e.preventDefault()}
                    className="w-10 h-10 rounded-lg bg-white/[0.02] border border-[#333] flex items-center justify-center hover:bg-white/[0.05] hover:border-[#444] transition-colors"
                  >
                    <Instagram className="w-4 h-4 text-[#888]" />
                  </a>
                </div>
              </div>

              {/* Version - Secret Knock Trigger */}
              <div className="mt-4 pt-4 border-t border-[#222] text-center">
                <button
                  onClick={handleClick}
                  className="text-xs text-[#444] hover:text-[#555] transition-colors cursor-default select-none"
                >
                  Synapse v2.0
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

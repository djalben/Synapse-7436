import { useState, useEffect } from "react";
import {
  Shield,
  Server,
  CreditCard,
  Key,
  Trash2,
  ExternalLink,
  RefreshCcw,
  AlertCircle,
  CheckCircle,
  DollarSign,
  Zap,
  Image as ImageIcon,
  MessageSquare,
  Video,
  Music,
  Lock,
  Gift,
  Copy,
  Check,
  X,
  Users,
  TrendingUp,
  TrendingDown,
  Database,
  Calculator,
  PieChart,
  BarChart3,
  Wallet,
  Eye,
  Calendar,
  Activity,
} from "lucide-react";
import { toast } from "sonner";

// Types
interface ApiStatus {
  openRouter: {
    status: "connected" | "error" | "unknown";
    balance?: string;
    lastChecked: string;
  };
  replicate: {
    status: "configured" | "not-configured";
  };
}

interface UsageStats {
  totalMessages: number;
  totalImages: number;
  totalVideos: number;
  totalEnhancements: number;
}

// Gift Code Types
interface GiftCode {
  code: string;
  type: "credits" | "plan";
  value: number | string;
  status: "active" | "redeemed";
  created: number;
}

// Expense Types
interface Expense {
  id: string;
  amount: number;
  currency: "USD" | "RUB";
  service: string;
  date: string;
  note?: string;
}

// Credit Package prices in RUB (new pricing with Lava commission)
const CREDIT_PACKAGES: Record<string, { credits: number; price: number }> = {
  start: { credits: 100, price: 590 },
  creator: { credits: 500, price: 2490 },
  pro_studio: { credits: 1500, price: 5990 },
  unlimited: { credits: 5000, price: 14990 },
};

// Legacy plan prices for backwards compatibility
const PLAN_PRICES: Record<string, number> = {
  LITE: 690,
  STANDARD: 1890,
  ULTRA: 4990,
};

// Lava payment gateway commission
const LAVA_COMMISSION = 0.12; // 12%

// AI cost estimates per generation
const AI_COSTS = {
  chat: 0.001, // $0.001 per message
  image: 0.02, // $0.02 per image
  video: 0.10, // $0.10 per video
  audio: 0.05, // $0.05 per audio/enhancement
};

// USD to RUB exchange rate
const USD_TO_RUB = 90;

// Tab types
type TabType = "overview" | "finances" | "gift-codes";

// Gift code types for dropdown
const GIFT_CODE_TYPES = [
  { label: "500 Credits", type: "credits" as const, value: 500 },
  { label: "1000 Credits", type: "credits" as const, value: 1000 },
  { label: "LITE Plan (1 month)", type: "plan" as const, value: "LITE" },
  { label: "STANDARD Plan (1 month)", type: "plan" as const, value: "STANDARD" },
  { label: "ULTRA Plan (1 month)", type: "plan" as const, value: "ULTRA" },
];

// Generate random code in format SYNAPSE-XXXX-XXXX
const generateGiftCode = (): string => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const segment = () => {
    let result = "";
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };
  return `SYNAPSE-${segment()}-${segment()}`;
};

// Generate unique ID for expenses
const generateExpenseId = (): string => {
  return `exp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get gift codes from localStorage
const getGiftCodes = (): GiftCode[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("giftCodes");
  return stored ? JSON.parse(stored) : [];
};

// Save gift codes to localStorage
const saveGiftCodes = (codes: GiftCode[]) => {
  localStorage.setItem("giftCodes", JSON.stringify(codes));
};

// Get expenses from localStorage
const getExpenses = (): Expense[] => {
  if (typeof window === "undefined") return [];
  const stored = localStorage.getItem("synapse_expenses");
  return stored ? JSON.parse(stored) : [];
};

// Save expenses to localStorage
const saveExpenses = (expenses: Expense[]) => {
  localStorage.setItem("synapse_expenses", JSON.stringify(expenses));
};

// Get all registered users count
const getAllUsersCount = (): number => {
  if (typeof window === "undefined") return 0;
  const usersKey = "synapse_all_users";
  const users = JSON.parse(localStorage.getItem(usersKey) || "{}");
  return Object.keys(users).length;
};

// Get total page visits
const getTotalVisits = (): number => {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem("synapse_total_visits") || "0", 10);
};

// Get today's visits
const getTodayVisits = (): number => {
  if (typeof window === "undefined") return 0;
  const dailyVisits = JSON.parse(localStorage.getItem("synapse_daily_visits") || "{}");
  const today = new Date().toISOString().split("T")[0];
  return dailyVisits[today] || 0;
};

// Get daily visits data for sparkline
const getDailyVisitsData = (): { date: string; count: number }[] => {
  if (typeof window === "undefined") return [];
  const dailyVisits = JSON.parse(localStorage.getItem("synapse_daily_visits") || "{}");
  return Object.entries(dailyVisits)
    .map(([date, count]) => ({ date, count: count as number }))
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-7); // Last 7 days
};

// Check admin access from localStorage
const checkAdminAccess = (): boolean => {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("adminAccess") === "true";
};

// Usage stats from localStorage
const getUsageStats = (): UsageStats => {
  if (typeof window === "undefined") {
    return { totalMessages: 0, totalImages: 0, totalVideos: 0, totalEnhancements: 0 };
  }
  return {
    totalMessages: parseInt(localStorage.getItem("messageCount") || "0"),
    totalImages: parseInt(localStorage.getItem("imageCount") || "0"),
    totalVideos: parseInt(localStorage.getItem("videoCount") || "0"),
    totalEnhancements: parseInt(localStorage.getItem("enhancementCount") || "0"),
  };
};

// Calculate gross revenue from redeemed gift codes
const calculateGrossRevenue = (codes: GiftCode[]): number => {
  return codes
    .filter((c) => c.status === "redeemed")
    .reduce((total, code) => {
      if (code.type === "plan" && typeof code.value === "string") {
        return total + (PLAN_PRICES[code.value] || 0);
      }
      return total;
    }, 0);
};

// Calculate AI costs in RUB
const calculateAICosts = (stats: UsageStats): number => {
  const usdCost =
    stats.totalMessages * AI_COSTS.chat +
    stats.totalImages * AI_COSTS.image +
    stats.totalVideos * AI_COSTS.video +
    stats.totalEnhancements * AI_COSTS.audio;
  return Math.round(usdCost * USD_TO_RUB);
};

// Calculate total expenses in RUB
const calculateTotalExpenses = (expenses: Expense[]): number => {
  return expenses.reduce((total, exp) => {
    const amountInRub = exp.currency === "USD" ? exp.amount * USD_TO_RUB : exp.amount;
    return total + amountInRub;
  }, 0);
};

// Status Badge Component
const StatusBadge = ({ status }: { status: "connected" | "error" | "unknown" | "configured" | "not-configured" }) => {
  const configs = {
    connected: { color: "bg-emerald-500", text: "Connected", icon: CheckCircle },
    configured: { color: "bg-emerald-500", text: "Configured", icon: CheckCircle },
    error: { color: "bg-red-500", text: "Error", icon: AlertCircle },
    unknown: { color: "bg-yellow-500", text: "Unknown", icon: AlertCircle },
    "not-configured": { color: "bg-gray-500", text: "Not Configured", icon: AlertCircle },
  };
  
  const config = configs[status];
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.color}/20 text-white`}>
      <Icon className="w-3 h-3" />
      {config.text}
    </span>
  );
};

// Stat Card Component
const StatCard = ({ 
  icon: Icon, 
  label, 
  value, 
  color 
}: { 
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number | string;
  color: string;
}) => (
  <div className="p-4 rounded-xl bg-white/[0.02] border border-[#222]">
    <div className="flex items-center gap-3">
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-white">{value}</p>
        <p className="text-xs text-[#666]">{label}</p>
      </div>
    </div>
  </div>
);

// Finance KPI Card Component
const FinanceKPICard = ({
  icon: Icon,
  label,
  value,
  subtitle,
  trend,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtitle: string;
  trend?: "up" | "down" | "neutral";
  color: string;
}) => {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : null;
  
  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-[#222] backdrop-blur-sm relative overflow-hidden group hover:border-[#333] transition-colors">
      {/* Glow effect */}
      <div className={`absolute inset-0 ${color} opacity-5 blur-3xl`} />
      
      <div className="relative">
        <div className="flex items-center justify-between mb-3">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}/20`}>
            <Icon className={`w-5 h-5 ${color.replace("bg-", "text-")}`} />
          </div>
          {TrendIcon && (
            <TrendIcon className={`w-4 h-4 ${trend === "up" ? "text-emerald-400" : "text-red-400"}`} />
          )}
        </div>
        <p className="text-2xl font-bold text-white mb-1">{value}</p>
        <p className="text-sm font-medium text-[#888] mb-0.5">{label}</p>
        <p className="text-xs text-[#555]">{subtitle}</p>
      </div>
    </div>
  );
};

// Tab Button Component
const TabButton = ({
  active,
  onClick,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm
      transition-all duration-200
      ${active 
        ? "bg-white/[0.08] text-white border border-[#333]" 
        : "text-[#666] hover:text-white hover:bg-white/[0.03]"
      }
    `}
  >
    <Icon className="w-4 h-4" />
    {label}
  </button>
);

// Main Admin Dashboard Component
export const AdminDashboard = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [apiStatus, setApiStatus] = useState<ApiStatus>({
    openRouter: { status: "unknown", lastChecked: "" },
    replicate: { status: "not-configured" },
  });
  const [usageStats, setUsageStats] = useState<UsageStats>({
    totalMessages: 0,
    totalImages: 0,
    totalVideos: 0,
    totalEnhancements: 0,
  });
  
  // Gift Code State
  const [giftCodes, setGiftCodes] = useState<GiftCode[]>([]);
  const [selectedCodeType, setSelectedCodeType] = useState(0);
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Expense State
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState<Partial<Expense>>({
    amount: 0,
    currency: "USD",
    service: "OpenRouter",
    date: new Date().toISOString().split("T")[0],
    note: "",
  });

  // User count
  const [userCount, setUserCount] = useState(0);
  
  // Visit tracking
  const [totalVisits, setTotalVisits] = useState(0);
  const [todayVisits, setTodayVisits] = useState(0);
  const [dailyVisitsData, setDailyVisitsData] = useState<{ date: string; count: number }[]>([]);
  
  // Check authorization on mount
  useEffect(() => {
    const hasAccess = checkAdminAccess();
    setIsAuthorized(hasAccess);
    
    if (hasAccess) {
      setUsageStats(getUsageStats());
      setGiftCodes(getGiftCodes());
      setExpenses(getExpenses());
      setUserCount(getAllUsersCount());
      setTotalVisits(getTotalVisits());
      setTodayVisits(getTodayVisits());
      setDailyVisitsData(getDailyVisitsData());
      checkApiStatus();
    }
    
    setLoading(false);
  }, []);
  
  // Check API status
  const checkApiStatus = async () => {
    try {
      const response = await fetch("/api/ping");
      const isConnected = response.ok;
      
      setApiStatus({
        openRouter: {
          status: isConnected ? "connected" : "error",
          lastChecked: new Date().toLocaleTimeString(),
        },
        replicate: {
          status: "configured",
        },
      });
    } catch {
      setApiStatus(prev => ({
        ...prev,
        openRouter: { 
          status: "error", 
          lastChecked: new Date().toLocaleTimeString() 
        },
      }));
    }
  };
  
  // Clear all usage data
  const clearUsageData = () => {
    if (confirm("Are you sure you want to clear all usage data? This cannot be undone.")) {
      localStorage.removeItem("messageCount");
      localStorage.removeItem("imageCount");
      localStorage.removeItem("videoCount");
      localStorage.removeItem("enhancementCount");
      setUsageStats({ totalMessages: 0, totalImages: 0, totalVideos: 0, totalEnhancements: 0 });
    }
  };
  
  // Grant admin access
  const grantAccess = () => {
    const password = prompt("Enter admin password:");
    if (password === "synapse2024") {
      localStorage.setItem("adminAccess", "true");
      setIsAuthorized(true);
      setUsageStats(getUsageStats());
      setGiftCodes(getGiftCodes());
      setExpenses(getExpenses());
      setUserCount(getAllUsersCount());
      setTotalVisits(getTotalVisits());
      setTodayVisits(getTodayVisits());
      setDailyVisitsData(getDailyVisitsData());
      checkApiStatus();
    } else {
      alert("Incorrect password");
    }
  };
  
  // Gift Code Functions
  const handleGenerateCode = () => {
    const codeType = GIFT_CODE_TYPES[selectedCodeType];
    const newCode: GiftCode = {
      code: generateGiftCode(),
      type: codeType.type,
      value: codeType.value,
      status: "active",
      created: Date.now(),
    };
    
    const updatedCodes = [newCode, ...giftCodes];
    saveGiftCodes(updatedCodes);
    setGiftCodes(updatedCodes);
    setGeneratedCode(newCode.code);
    toast.success("Gift code generated!", {
      description: `Code: ${newCode.code}`,
    });
  };
  
  const handleCopyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(true);
      toast.success("Code copied to clipboard!");
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      toast.error("Failed to copy code");
    }
  };
  
  const handleDeleteCode = (codeToDelete: string) => {
    if (confirm("Are you sure you want to delete this code?")) {
      const updatedCodes = giftCodes.filter(c => c.code !== codeToDelete);
      saveGiftCodes(updatedCodes);
      setGiftCodes(updatedCodes);
      if (generatedCode === codeToDelete) {
        setGeneratedCode(null);
      }
      toast.success("Code deleted");
    }
  };

  // Expense Functions
  const handleAddExpense = () => {
    if (!newExpense.amount || newExpense.amount <= 0) {
      toast.error("Please enter a valid amount");
      return;
    }

    const expense: Expense = {
      id: generateExpenseId(),
      amount: newExpense.amount || 0,
      currency: newExpense.currency || "USD",
      service: newExpense.service || "OpenRouter",
      date: newExpense.date || new Date().toISOString().split("T")[0],
      note: newExpense.note,
    };

    const updatedExpenses = [expense, ...expenses];
    saveExpenses(updatedExpenses);
    setExpenses(updatedExpenses);
    setShowExpenseModal(false);
    setNewExpense({
      amount: 0,
      currency: "USD",
      service: "OpenRouter",
      date: new Date().toISOString().split("T")[0],
      note: "",
    });
    toast.success("Expense logged!");
  };

  const handleDeleteExpense = (id: string) => {
    const updatedExpenses = expenses.filter((e) => e.id !== id);
    saveExpenses(updatedExpenses);
    setExpenses(updatedExpenses);
    toast.success("Expense deleted");
  };
  
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  const getCodeLabel = (code: GiftCode) => {
    if (code.type === "credits") {
      return `${code.value} Credits`;
    }
    return `${code.value} Plan`;
  };

  // Format number with spaces
  const formatNumber = (num: number) => {
    return num.toLocaleString("ru-RU");
  };
  
  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    );
  }
  
  // Unauthorized state
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#0a0a0a] border border-[#222] text-center">
          <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Access Restricted</h1>
          <p className="text-[#666] text-sm mb-6">
            This page is restricted to administrators only.
          </p>
          <button
            onClick={grantAccess}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            Enter Admin Password
          </button>
          <a 
            href="/"
            className="block mt-4 text-sm text-[#666] hover:text-white transition-colors"
          >
            ← Return to Synapse
          </a>
        </div>
      </div>
    );
  }
  
  // Calculate financial metrics
  const grossRevenue = calculateGrossRevenue(giftCodes);
  const lavaCommission = Math.round(grossRevenue * LAVA_COMMISSION); // 12% Lava commission
  const revenueAfterLava = grossRevenue - lavaCommission;
  const aiCosts = calculateAICosts(usageStats);
  const serverExpenses = calculateTotalExpenses(expenses);
  const totalCosts = aiCosts + serverExpenses;
  const netProfit = revenueAfterLava - totalCosts;

  // Calculate totals
  const totalGenerations = usageStats.totalMessages + usageStats.totalImages + usageStats.totalVideos + usageStats.totalEnhancements;
  
  // Estimated revenue (example rates)
  const estimatedRevenue = {
    rub: Math.round(totalGenerations * 15),
    usd: (totalGenerations * 0.15).toFixed(2),
  };

  // Overview Tab Content
  const renderOverviewTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* API Status Card */}
      <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#222]">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Server className="w-5 h-5 text-indigo-400" />
            <h2 className="font-medium">API Status</h2>
          </div>
          <button
            onClick={checkApiStatus}
            className="p-2 rounded-lg hover:bg-white/[0.05] transition-colors"
            title="Refresh"
          >
            <RefreshCcw className="w-4 h-4 text-[#666]" />
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-[#222]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">OpenRouter</span>
              <StatusBadge status={apiStatus.openRouter.status} />
            </div>
            {apiStatus.openRouter.balance && (
              <p className="text-xs text-[#666]">Balance: ${apiStatus.openRouter.balance}</p>
            )}
            <p className="text-xs text-[#444]">
              Last checked: {apiStatus.openRouter.lastChecked || "Never"}
            </p>
            <a
              href="https://openrouter.ai/activity"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-2"
            >
              View Activity <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          
          <div className="p-4 rounded-xl bg-white/[0.02] border border-[#222]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Replicate</span>
              <StatusBadge status={apiStatus.replicate.status} />
            </div>
            <p className="text-xs text-[#666]">Used for video, audio, and enhancement</p>
            <a
              href="https://replicate.com/account/billing"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 mt-2"
            >
              Manage Billing <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
      
      {/* Business Metrics Card */}
      <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#222]">
        <div className="flex items-center gap-3 mb-6">
          <CreditCard className="w-5 h-5 text-emerald-400" />
          <h2 className="font-medium">Business Overview</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard icon={MessageSquare} label="Chat Messages" value={usageStats.totalMessages} color="bg-blue-500/20" />
          <StatCard icon={ImageIcon} label="Images Generated" value={usageStats.totalImages} color="bg-purple-500/20" />
          <StatCard icon={Video} label="Videos Generated" value={usageStats.totalVideos} color="bg-pink-500/20" />
          <StatCard icon={Zap} label="Enhancements" value={usageStats.totalEnhancements} color="bg-amber-500/20" />
        </div>
        
        <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Estimated Revenue</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-2xl font-bold text-white">{estimatedRevenue.rub.toLocaleString()} ₽</span>
            <span className="text-sm text-[#666]">(~${estimatedRevenue.usd})</span>
          </div>
          <p className="text-xs text-[#666] mt-1">Based on {totalGenerations} total generations</p>
        </div>
      </div>
      
      {/* Configuration Card */}
      <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#222]">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-5 h-5 text-amber-400" />
          <h2 className="font-medium">Configuration</h2>
        </div>
        
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-white/[0.02] border border-[#222]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">OPENROUTER_API_KEY</p>
                <p className="text-xs text-[#666]">••••••••••••</p>
              </div>
              <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">Set</span>
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-white/[0.02] border border-[#222]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">REPLICATE_API_TOKEN</p>
                <p className="text-xs text-[#666]">••••••••••••</p>
              </div>
              <span className="px-2 py-1 rounded text-xs bg-emerald-500/20 text-emerald-400">Set</span>
            </div>
          </div>
        </div>
        
        <p className="text-xs text-[#444] mt-4">
          API keys are managed via environment variables. Update them in your deployment settings.
        </p>
      </div>
      
      {/* Quick Actions Card */}
      <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#222]">
        <div className="flex items-center gap-3 mb-6">
          <Zap className="w-5 h-5 text-purple-400" />
          <h2 className="font-medium">Quick Actions</h2>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={clearUsageData}
            className="w-full flex items-center justify-between p-4 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Trash2 className="w-4 h-4 text-red-400" />
              <span className="text-sm font-medium text-red-400">Clear All Usage Data</span>
            </div>
            <span className="text-xs text-red-400/60 group-hover:text-red-400">Reset counters</span>
          </button>
          
          <a
            href="https://openrouter.ai/activity"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-[#222] hover:bg-white/[0.05] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="w-4 h-4 text-[#888]" />
              <span className="text-sm font-medium">OpenRouter Dashboard</span>
            </div>
            <span className="text-xs text-[#666] group-hover:text-[#888]">View logs</span>
          </a>
          
          <a
            href="https://replicate.com/account"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-[#222] hover:bg-white/[0.05] transition-colors group"
          >
            <div className="flex items-center gap-3">
              <ExternalLink className="w-4 h-4 text-[#888]" />
              <span className="text-sm font-medium">Replicate Dashboard</span>
            </div>
            <span className="text-xs text-[#666] group-hover:text-[#888]">Manage models</span>
          </a>
        </div>
        
        <div className="mt-6 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <p className="text-xs text-amber-400/80">
            <strong>Tip:</strong> Monitor your API usage regularly to avoid unexpected charges.
          </p>
        </div>
      </div>
    </div>
  );

  // Finances Tab Content
  const renderFinancesTab = () => (
    <div className="space-y-6">
      {/* Traffic Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <FinanceKPICard
          icon={Eye}
          label="Total Page Views"
          value={formatNumber(totalVisits)}
          subtitle="All-time visits"
          color="bg-blue-500"
        />
        <FinanceKPICard
          icon={Activity}
          label="Today's Visits"
          value={formatNumber(todayVisits)}
          subtitle={new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          color="bg-cyan-500"
        />
        <FinanceKPICard
          icon={Users}
          label="Total Users"
          value={formatNumber(userCount)}
          subtitle="Registered accounts"
          color="bg-indigo-500"
        />
        <FinanceKPICard
          icon={netProfit >= 0 ? TrendingUp : TrendingDown}
          label="Чистая прибыль"
          value={`${netProfit >= 0 ? "" : "-"}${formatNumber(Math.abs(netProfit))} ₽`}
          subtitle="После комиссии Lava 12%"
          trend={netProfit >= 0 ? "up" : "down"}
          color={netProfit >= 0 ? "bg-emerald-500" : "bg-red-500"}
        />
      </div>

      {/* Visit Trend Sparkline */}
      {dailyVisitsData.length > 0 && (
        <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#222]">
          <div className="flex items-center gap-3 mb-4">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h2 className="font-medium">Visits - Last 7 Days</h2>
          </div>
          <div className="flex items-end gap-2 h-20">
            {dailyVisitsData.map((day, i) => {
              const maxCount = Math.max(...dailyVisitsData.map(d => d.count), 1);
              const height = (day.count / maxCount) * 100;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-[#666]">{day.count}</span>
                  <div 
                    className="w-full rounded-t bg-gradient-to-t from-cyan-600 to-cyan-400 transition-all duration-300"
                    style={{ height: `${Math.max(height, 5)}%` }}
                  />
                  <span className="text-[10px] text-[#555]">
                    {new Date(day.date).toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Financial KPI Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FinanceKPICard
          icon={Wallet}
          label="Gross Revenue"
          value={`${formatNumber(grossRevenue)} ₽`}
          subtitle="From gift codes & subscriptions"
          trend={grossRevenue > 0 ? "up" : "neutral"}
          color="bg-emerald-500"
        />
        <FinanceKPICard
          icon={Database}
          label="AI Costs (COGS)"
          value={`${formatNumber(aiCosts)} ₽`}
          subtitle="API usage costs"
          color="bg-orange-500"
        />
        <FinanceKPICard
          icon={CreditCard}
          label="Server Expenses"
          value={`${formatNumber(serverExpenses)} ₽`}
          subtitle="Operating costs"
          color="bg-pink-500"
        />
      </div>

      {/* Profit Breakdown & Expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Profit Breakdown */}
        <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#222]">
          <div className="flex items-center gap-3 mb-6">
            <Calculator className="w-5 h-5 text-indigo-400" />
            <h2 className="font-medium">Profit Breakdown</h2>
          </div>

          <div className="space-y-3">
            {/* Lava Commission Info */}
            <div className="p-3 rounded-lg bg-white/[0.02] border border-[#222] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-[#888]">Комиссия Lava</span>
                <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">платежный шлюз</span>
              </div>
              <span className="text-sm font-medium text-white">12%</span>
            </div>

            {/* Breakdown */}
            <div className="space-y-2 pt-2">
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[#888]">Валовый доход</span>
                <span className="text-sm font-medium text-emerald-400">+{formatNumber(grossRevenue)} ₽</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[#888]">Комиссия Lava (12%)</span>
                <span className="text-sm font-medium text-red-400">-{formatNumber(lavaCommission)} ₽</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[#888]">Затраты OpenRouter</span>
                <span className="text-sm font-medium text-red-400">-{formatNumber(aiCosts)} ₽</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-sm text-[#888]">Затраты Replicate</span>
                <span className="text-sm font-medium text-red-400">-{formatNumber(serverExpenses)} ₽</span>
              </div>
              <div className="h-px bg-[#333] my-2" />
              <div className="flex justify-between items-center py-2">
                <span className="text-sm font-medium text-white">ЧИСТАЯ ПРИБЫЛЬ</span>
                <span className={`text-lg font-bold ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {netProfit >= 0 ? "+" : ""}{formatNumber(netProfit)} ₽
                </span>
              </div>
              {/* USD equivalent */}
              <div className="flex justify-end">
                <span className="text-xs text-[#555]">
                  ≈ ${Math.abs(Math.round(netProfit / USD_TO_RUB)).toLocaleString()} USD
                </span>
              </div>
            </div>
          </div>

          {/* Formula Info */}
          <div className="mt-4 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
            <p className="text-xs text-indigo-400/80 font-mono">
              Прибыль = (Доход - 12% Lava) - OpenRouter - Replicate
            </p>
          </div>
        </div>

        {/* Operating Expenses */}
        <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#222]">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CreditCard className="w-5 h-5 text-orange-400" />
              <div>
                <h2 className="font-medium">Operating Expenses</h2>
                <p className="text-xs text-[#666]">Track server and API payments</p>
              </div>
            </div>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors flex items-center gap-2"
            >
              <span>➕</span>
              Log Payment
            </button>
          </div>

          {/* Expense List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {expenses.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#222] text-center">
                <p className="text-sm text-[#666]">No expenses logged yet</p>
              </div>
            ) : (
              expenses.map((expense) => (
                <div key={expense.id} className="p-3 rounded-xl bg-white/[0.02] border border-[#222] flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-white">{expense.service}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
                        {expense.currency === "USD" ? "$" : ""}{expense.amount.toLocaleString()}{expense.currency === "RUB" ? " ₽" : ""}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-[#666]">
                      <span>{expense.date}</span>
                      {expense.note && <span>• {expense.note}</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="p-1.5 rounded hover:bg-red-500/20 transition-colors"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Total */}
          <div className="mt-4 pt-4 border-t border-[#222] flex justify-between items-center">
            <span className="text-sm text-[#888]">Total Expenses</span>
            <span className="text-lg font-bold text-orange-400">{formatNumber(serverExpenses)} ₽</span>
          </div>
        </div>
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#222]">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <h2 className="font-medium">Revenue vs Expenses</h2>
        </div>

        <div className="flex items-end gap-8 h-48 px-4">
          {/* Revenue Bar */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-emerald-400">{formatNumber(grossRevenue)} ₽</span>
            <div className="w-full bg-[#222] rounded-t-lg overflow-hidden relative" style={{ height: "100%" }}>
              <div 
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-emerald-600 to-emerald-400 rounded-t-lg transition-all duration-500"
                style={{ 
                  height: grossRevenue > 0 && totalCosts > 0 
                    ? `${Math.min(100, (grossRevenue / Math.max(grossRevenue, totalCosts)) * 100)}%` 
                    : grossRevenue > 0 ? "100%" : "0%"
                }}
              />
            </div>
            <span className="text-xs text-[#666]">Revenue</span>
          </div>

          {/* Expenses Bar */}
          <div className="flex-1 flex flex-col items-center gap-2">
            <span className="text-sm font-medium text-red-400">{formatNumber(totalCosts)} ₽</span>
            <div className="w-full bg-[#222] rounded-t-lg overflow-hidden relative" style={{ height: "100%" }}>
              <div 
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-red-600 to-orange-400 rounded-t-lg transition-all duration-500"
                style={{ 
                  height: totalCosts > 0 && grossRevenue > 0 
                    ? `${Math.min(100, (totalCosts / Math.max(grossRevenue, totalCosts)) * 100)}%` 
                    : totalCosts > 0 ? "100%" : "0%"
                }}
              />
            </div>
            <span className="text-xs text-[#666]">Expenses</span>
          </div>

          {/* Profit/Loss Indicator */}
          <div className="flex-1 flex flex-col items-center justify-center gap-2 bg-white/[0.02] rounded-xl p-4 h-full">
            <span className={`text-2xl font-bold ${netProfit >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              {grossRevenue > 0 ? Math.round((netProfit / grossRevenue) * 100) : 0}%
            </span>
            <span className="text-xs text-[#666]">Profit Margin</span>
          </div>
        </div>
      </div>
    </div>
  );

  // Gift Codes Tab Content
  const renderGiftCodesTab = () => (
    <div className="p-6 rounded-2xl bg-[#0a0a0a] border border-[#222]">
      <div className="flex items-center gap-3 mb-6">
        <Gift className="w-5 h-5 text-pink-400" />
        <h2 className="font-medium">Gift Code Manager</h2>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Generate Code Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-[#888]">Generate Gift Codes</h3>
          
          <div className="space-y-3">
            <div>
              <label className="text-xs text-[#666] mb-2 block">Code Type</label>
              <select
                value={selectedCodeType}
                onChange={(e) => setSelectedCodeType(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#333] text-white text-sm outline-none focus:border-indigo-500/50 cursor-pointer"
              >
                {GIFT_CODE_TYPES.map((type, index) => (
                  <option key={index} value={index} className="bg-[#111]">
                    {type.label}
                  </option>
                ))}
              </select>
            </div>
            
            <button
              onClick={handleGenerateCode}
              className="w-full py-3 rounded-xl font-medium text-sm bg-gradient-to-r from-pink-500 to-purple-600 text-white hover:from-pink-400 hover:to-purple-500 transition-all"
            >
              Generate Code
            </button>
          </div>
          
          {/* Generated Code Display */}
          {generatedCode && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-pink-500/10 to-purple-500/10 border border-pink-500/20">
              <p className="text-xs text-[#666] mb-2">Generated Code</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-black/30 text-pink-400 font-mono text-sm">
                  {generatedCode}
                </code>
                <button
                  onClick={() => handleCopyCode(generatedCode)}
                  className="p-2 rounded-lg bg-white/[0.05] border border-[#333] hover:bg-white/[0.1] transition-colors"
                >
                  {copiedCode ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-4 h-4 text-[#888]" />
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Active Codes List */}
        <div className="space-y-4">
          <h3 className="text-sm font-medium text-[#888]">
            Active Codes ({giftCodes.filter(c => c.status === "active").length})
          </h3>
          
          <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
            {giftCodes.length === 0 ? (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-[#222] text-center">
                <p className="text-sm text-[#666]">No codes generated yet</p>
              </div>
            ) : (
              giftCodes.map((code) => (
                <div
                  key={code.code}
                  className={`p-3 rounded-xl border ${
                    code.status === "active"
                      ? "bg-white/[0.02] border-[#222]"
                      : "bg-emerald-500/5 border-emerald-500/20"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <code className="text-xs font-mono text-white">{code.code}</code>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[10px] ${
                        code.status === "active" 
                          ? "bg-indigo-500/20 text-indigo-400" 
                          : "bg-emerald-500/20 text-emerald-400"
                      }`}>
                        {code.status}
                      </span>
                      {code.status === "active" && (
                        <button
                          onClick={() => handleDeleteCode(code.code)}
                          className="p-1 rounded hover:bg-red-500/20 transition-colors"
                          title="Delete code"
                        >
                          <X className="w-3 h-3 text-red-400" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#666]">{getCodeLabel(code)}</span>
                    <span className="text-[10px] text-[#444]">{formatDate(code.created)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-[#222]">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-mono text-lg font-semibold">Admin Dashboard</h1>
              <p className="text-xs text-[#666]">Synapse System Control</p>
            </div>
          </div>
          <a 
            href="/"
            className="px-4 py-2 rounded-lg bg-white/[0.05] border border-[#333] text-sm hover:bg-white/[0.08] transition-colors"
          >
            ← Back to App
          </a>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-[#222]">
        <div className="max-w-6xl mx-auto px-6 py-3">
          <div className="flex items-center gap-2">
            <TabButton
              active={activeTab === "overview"}
              onClick={() => setActiveTab("overview")}
              icon={PieChart}
              label="Overview"
            />
            <TabButton
              active={activeTab === "finances"}
              onClick={() => setActiveTab("finances")}
              icon={DollarSign}
              label="Finances & P&L"
            />
            <TabButton
              active={activeTab === "gift-codes"}
              onClick={() => setActiveTab("gift-codes")}
              icon={Gift}
              label="Gift Codes"
            />
          </div>
        </div>
      </div>
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {activeTab === "overview" && renderOverviewTab()}
        {activeTab === "finances" && renderFinancesTab()}
        {activeTab === "gift-codes" && renderGiftCodesTab()}
      </div>

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowExpenseModal(false)} />
          <div className="relative w-full max-w-md p-6 rounded-2xl bg-[#0a0a0a] border border-[#222]">
            <h3 className="text-lg font-semibold text-white mb-4">Log Server Payment</h3>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs text-[#666] mb-2 block">Amount</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={newExpense.amount || ""}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: parseFloat(e.target.value) || 0 })}
                    className="flex-1 px-4 py-3 rounded-xl bg-white/[0.02] border border-[#333] text-white text-sm outline-none focus:border-indigo-500/50"
                    placeholder="0.00"
                  />
                  <select
                    value={newExpense.currency}
                    onChange={(e) => setNewExpense({ ...newExpense, currency: e.target.value as "USD" | "RUB" })}
                    className="px-4 py-3 rounded-xl bg-white/[0.02] border border-[#333] text-white text-sm outline-none focus:border-indigo-500/50"
                  >
                    <option value="USD" className="bg-[#111]">USD</option>
                    <option value="RUB" className="bg-[#111]">RUB</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs text-[#666] mb-2 block">Service</label>
                <select
                  value={newExpense.service}
                  onChange={(e) => setNewExpense({ ...newExpense, service: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#333] text-white text-sm outline-none focus:border-indigo-500/50"
                >
                  <option value="OpenRouter" className="bg-[#111]">OpenRouter</option>
                  <option value="Replicate" className="bg-[#111]">Replicate</option>
                  <option value="Vercel" className="bg-[#111]">Vercel</option>
                  <option value="Cloudflare" className="bg-[#111]">Cloudflare</option>
                  <option value="Other" className="bg-[#111]">Other</option>
                </select>
              </div>

              <div>
                <label className="text-xs text-[#666] mb-2 block">Date</label>
                <input
                  type="date"
                  value={newExpense.date}
                  onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#333] text-white text-sm outline-none focus:border-indigo-500/50"
                />
              </div>

              <div>
                <label className="text-xs text-[#666] mb-2 block">Note (optional)</label>
                <input
                  type="text"
                  value={newExpense.note || ""}
                  onChange={(e) => setNewExpense({ ...newExpense, note: e.target.value })}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.02] border border-[#333] text-white text-sm outline-none focus:border-indigo-500/50"
                  placeholder="Monthly payment..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowExpenseModal(false)}
                className="flex-1 py-3 rounded-xl bg-white/[0.05] border border-[#333] text-white text-sm font-medium hover:bg-white/[0.08] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExpense}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors"
              >
                Save Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;

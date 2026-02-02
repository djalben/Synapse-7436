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

// Main Admin Dashboard Component
export const AdminDashboard = () => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
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
  
  // Check authorization on mount
  useEffect(() => {
    const hasAccess = checkAdminAccess();
    setIsAuthorized(hasAccess);
    
    if (hasAccess) {
      setUsageStats(getUsageStats());
      setGiftCodes(getGiftCodes());
      checkApiStatus();
    }
    
    setLoading(false);
  }, []);
  
  // Check API status
  const checkApiStatus = async () => {
    try {
      // Try to check OpenRouter status via our ping endpoint
      const response = await fetch("/api/ping");
      const isConnected = response.ok;
      
      setApiStatus({
        openRouter: {
          status: isConnected ? "connected" : "error",
          lastChecked: new Date().toLocaleTimeString(),
        },
        replicate: {
          status: "configured", // We assume it's configured if the API is working
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
  
  // Grant admin access (for development)
  const grantAccess = () => {
    const password = prompt("Enter admin password:");
    if (password === "synapse2024") {
      localStorage.setItem("adminAccess", "true");
      setIsAuthorized(true);
      setUsageStats(getUsageStats());
      setGiftCodes(getGiftCodes());
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
  
  // Calculate totals
  const totalGenerations = usageStats.totalMessages + usageStats.totalImages + usageStats.totalVideos + usageStats.totalEnhancements;
  
  // Estimated revenue (example rates)
  const estimatedRevenue = {
    rub: Math.round(totalGenerations * 15), // ~15 RUB per generation
    usd: (totalGenerations * 0.15).toFixed(2), // ~$0.15 per generation
  };
  
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
      
      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
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
              {/* OpenRouter */}
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
              
              {/* Replicate */}
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
          
          {/* Gift Code Manager Card - Full Width */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#0a0a0a] border border-[#222]">
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
          
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

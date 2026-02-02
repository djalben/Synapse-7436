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
} from "lucide-react";

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
  
  // Check authorization on mount
  useEffect(() => {
    const hasAccess = checkAdminAccess();
    setIsAuthorized(hasAccess);
    
    if (hasAccess) {
      setUsageStats(getUsageStats());
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
      checkApiStatus();
    } else {
      alert("Incorrect password");
    }
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
          
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;

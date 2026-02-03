import { useState, useEffect } from "react";
import {
  Clock,
  Image as ImageIcon,
  Video,
  Music,
  MessageSquare,
  Download,
  Trash2,
  RotateCcw,
  Filter,
  Sparkles,
  Calendar,
  Coins,
  ChevronDown,
  X,
} from "lucide-react";

// History item interface
interface HistoryItem {
  id: string;
  type: "image" | "video" | "audio" | "chat";
  prompt: string;
  model: string;
  result: string; // URL for media, or message content for chat
  createdAt: string;
  credits: number;
}

// Filter type
type FilterType = "all" | "image" | "video" | "audio" | "chat";

// Storage key
const HISTORY_KEY = "synapse_history";

// Helper to get history from localStorage
const getHistory = (): HistoryItem[] => {
  try {
    const stored = localStorage.getItem(HISTORY_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

// Helper to save history to localStorage
const saveHistory = (history: HistoryItem[]) => {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

// Export for other components to use
export const addToHistory = (item: Omit<HistoryItem, "id" | "createdAt">) => {
  const history = getHistory();
  const newItem: HistoryItem = {
    ...item,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
  };
  history.unshift(newItem);
  // Keep only last 100 items
  if (history.length > 100) {
    history.pop();
  }
  saveHistory(history);
};

// Filter button component
interface FilterButtonProps {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}

const FilterButton = ({ active, onClick, icon: Icon, label }: FilterButtonProps) => (
  <button
    onClick={onClick}
    className={`
      flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
      transition-all duration-200
      ${active
        ? "bg-indigo-500/20 border border-indigo-500/40 text-white"
        : "bg-white/[0.02] border border-[#333] text-[#888] hover:text-white hover:border-[#444]"
      }
    `}
  >
    <Icon className={`w-4 h-4 ${active ? "text-indigo-400" : ""}`} />
    {label}
  </button>
);

// Get type info
const getTypeInfo = (type: HistoryItem["type"]) => {
  switch (type) {
    case "image":
      return { label: "Изображение", icon: ImageIcon, color: "indigo" };
    case "video":
      return { label: "Видео", icon: Video, color: "violet" };
    case "audio":
      return { label: "Аудио", icon: Music, color: "fuchsia" };
    case "chat":
      return { label: "Чат", icon: MessageSquare, color: "blue" };
  }
};

// History card component
interface HistoryCardProps {
  item: HistoryItem;
  onDelete: (id: string) => void;
  onRepeat: (item: HistoryItem) => void;
}

const HistoryCard = ({ item, onDelete, onRepeat }: HistoryCardProps) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const typeInfo = getTypeInfo(item.type);
  const Icon = typeInfo.icon;

  const handleDownload = async () => {
    if (item.type === "chat") return;
    
    try {
      const response = await fetch(item.result);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `synapse-${item.type}-${item.id}.${item.type === "image" ? "png" : item.type === "video" ? "mp4" : "mp3"}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const truncatePrompt = (prompt: string, maxLength = 100) => {
    if (prompt.length <= maxLength) return prompt;
    return prompt.substring(0, maxLength) + "...";
  };

  return (
    <div className="group bg-white/[0.02] border border-[#333] rounded-2xl overflow-hidden hover:border-[#444] transition-all duration-200">
      {/* Preview Area */}
      <div className="relative aspect-video bg-[#0d0d0d] flex items-center justify-center">
        {item.type === "image" && item.result ? (
          <img
            src={item.result}
            alt={item.prompt}
            className="w-full h-full object-cover"
          />
        ) : item.type === "video" && item.result ? (
          <video
            src={item.result}
            className="w-full h-full object-cover"
            controls={false}
            muted
          />
        ) : (
          <div className={`w-16 h-16 rounded-xl bg-${typeInfo.color}-500/20 flex items-center justify-center`}>
            <Icon className={`w-8 h-8 text-${typeInfo.color}-400`} />
          </div>
        )}

        {/* Type Badge */}
        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-${typeInfo.color}-500/20 border border-${typeInfo.color}-500/30 backdrop-blur-sm`}>
          <span className={`text-xs font-medium text-${typeInfo.color}-400`}>{typeInfo.label}</span>
        </div>

        {/* Hover Overlay with Actions */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
          {item.type !== "chat" && (
            <button
              onClick={handleDownload}
              className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors"
              title="Скачать"
            >
              <Download className="w-5 h-5" />
            </button>
          )}
          <button
            onClick={() => onRepeat(item)}
            className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors"
            title="Повторить"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="p-3 rounded-xl bg-red-500/10 backdrop-blur-sm border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-colors"
            title="Удалить"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Info Area */}
      <div className="p-4 space-y-3">
        {/* Prompt */}
        <p className="text-sm text-white/90 line-clamp-2" title={item.prompt}>
          {truncatePrompt(item.prompt)}
        </p>

        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-[#666]">
          <div className="flex items-center gap-3">
            <span className="text-[#888]">{item.model}</span>
            <span className="flex items-center gap-1">
              <Coins className="w-3 h-3" />
              {item.credits}
            </span>
          </div>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(item.createdAt)}
          </span>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowConfirmDelete(false)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative bg-[#0a0a0a] border border-[#333] rounded-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setShowConfirmDelete(false)}
              className="absolute top-4 right-4 p-2 rounded-lg bg-white/[0.05] text-[#888] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-6 h-6 text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Удалить элемент?</h3>
              <p className="text-sm text-[#888] mb-6">Это действие нельзя отменить.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/[0.05] border border-[#333] text-white font-medium hover:bg-white/[0.08] transition-colors"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    onDelete(item.id);
                    setShowConfirmDelete(false);
                  }}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/40 text-red-400 font-medium hover:bg-red-500/30 transition-colors"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Empty state component
interface EmptyStateProps {
  onStartCreating: () => void;
}

const EmptyState = ({ onStartCreating }: EmptyStateProps) => (
  <div className="flex flex-col items-center justify-center py-20">
    <div className="relative mb-6">
      <div className="absolute inset-0 bg-indigo-500/20 rounded-2xl blur-xl animate-pulse" />
      <div className="relative w-20 h-20 rounded-2xl bg-white/[0.05] border border-[#333] flex items-center justify-center">
        <Clock className="w-8 h-8 text-[#666]" />
      </div>
    </div>
    <h3 className="text-xl font-semibold text-white mb-2">У вас пока нет генераций</h3>
    <p className="text-[#666] text-sm mb-6 text-center max-w-md">
      Создайте изображение, видео или начните чат, и ваша история появится здесь.
    </p>
    <button
      onClick={onStartCreating}
      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-medium shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all"
    >
      <Sparkles className="w-4 h-4" />
      Начать создавать
    </button>
  </div>
);

// Main History Page component
interface HistoryPageProps {
  onNavigate?: (tab: string) => void;
}

export const HistoryPage = ({ onNavigate }: HistoryPageProps) => {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");

  // Load history on mount
  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleDelete = (id: string) => {
    const newHistory = history.filter((item) => item.id !== id);
    setHistory(newHistory);
    saveHistory(newHistory);
  };

  const handleRepeat = (item: HistoryItem) => {
    // Copy prompt to clipboard
    navigator.clipboard.writeText(item.prompt);
    
    // Navigate to appropriate studio
    if (onNavigate) {
      switch (item.type) {
        case "image":
          onNavigate("image");
          break;
        case "video":
          onNavigate("motion");
          break;
        case "audio":
          onNavigate("audio");
          break;
        case "chat":
          onNavigate("chat");
          break;
      }
    }
  };

  const filteredHistory = filter === "all"
    ? history
    : history.filter((item) => item.type === filter);

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-mono font-bold text-white mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-400" />
            </div>
            История генераций
          </h1>
          <p className="text-[#666]">Все ваши созданные материалы</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
            icon={Filter}
            label="Все"
          />
          <FilterButton
            active={filter === "image"}
            onClick={() => setFilter("image")}
            icon={ImageIcon}
            label="Изображения"
          />
          <FilterButton
            active={filter === "video"}
            onClick={() => setFilter("video")}
            icon={Video}
            label="Видео"
          />
          <FilterButton
            active={filter === "audio"}
            onClick={() => setFilter("audio")}
            icon={Music}
            label="Аудио"
          />
          <FilterButton
            active={filter === "chat"}
            onClick={() => setFilter("chat")}
            icon={MessageSquare}
            label="Чат"
          />
        </div>

        {/* Count */}
        {filteredHistory.length > 0 && (
          <p className="text-sm text-[#666] mb-4">
            {filteredHistory.length} {filteredHistory.length === 1 ? "элемент" : filteredHistory.length < 5 ? "элемента" : "элементов"}
          </p>
        )}

        {/* Content */}
        {filteredHistory.length === 0 ? (
          <EmptyState onStartCreating={() => onNavigate?.("chat")} />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHistory.map((item) => (
              <HistoryCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onRepeat={handleRepeat}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Re-export placeholder for backwards compatibility
export const HistoryPlaceholder = HistoryPage;

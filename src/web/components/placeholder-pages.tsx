import { useState, useEffect, useRef } from "react";
import {
  Clock,
  Image as ImageIcon,
  Video,
  Music,
  MessageSquare,
  Download,
  Trash2,
  Play,
  ExternalLink,
  Sparkles,
  Calendar,
  Coins,
  X,
  User,
} from "lucide-react";

// History item interface
interface HistoryItem {
  id: string;
  type: "image" | "video" | "audio" | "chat" | "avatar";
  prompt: string;
  model: string;
  result: string; // URL for media, or message content for chat
  createdAt: string;
  credits: number;
}

// Filter type - новые категории
type FilterType = "all" | "chat" | "gallery" | "media";

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

// Filter button component - стиль как в ImageStudio
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
      flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium
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
      return { label: "Видео", icon: Video, color: "indigo" };
    case "audio":
      return { label: "Аудио", icon: Music, color: "indigo" };
    case "chat":
      return { label: "Чат", icon: MessageSquare, color: "indigo" };
    case "avatar":
      return { label: "Аватар", icon: User, color: "indigo" };
  }
};

// Chat list item component
interface ChatListItemProps {
  item: HistoryItem;
  onDelete: (id: string) => void;
  onOpen: (item: HistoryItem) => void;
}

const ChatListItem = ({ item, onDelete, onOpen }: ChatListItemProps) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  
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

  const getFirstWords = (text: string, count = 5) => {
    const words = text.split(" ").slice(0, count);
    return words.join(" ") + (text.split(" ").length > count ? "..." : "");
  };

  return (
    <div className="group bg-white/[0.02] border border-[#333] rounded-xl p-4 hover:border-[#444] transition-all duration-200 flex items-center justify-between gap-4">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center flex-shrink-0">
            <MessageSquare className="w-4 h-4 text-indigo-400" />
          </div>
          <h3 className="text-sm font-medium text-white truncate">
            {getFirstWords(item.prompt, 5)}
          </h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-[#666]">
          <span>{item.model}</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {formatDate(item.createdAt)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onOpen(item)}
          className="px-4 py-2 rounded-lg bg-[#0070f3] hover:bg-[#0060df] text-white text-sm font-medium transition-all duration-300 shadow-lg shadow-[0_0_24px_rgba(0,112,243,0.4)] flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Открыть
        </button>
        <button
          onClick={() => setShowConfirmDelete(true)}
          className="p-2 rounded-lg bg-transparent border border-[#333] text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
          title="Удалить"
        >
          <Trash2 className="w-4 h-4" />
        </button>
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

// Image grid card component
interface ImageCardProps {
  item: HistoryItem;
  onDelete: (id: string) => void;
  onOpen: (item: HistoryItem) => void;
}

const ImageCard = ({ item, onDelete, onOpen }: ImageCardProps) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [showLightbox, setShowLightbox] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <>
      <div className="group bg-white/[0.02] border border-[#333] rounded-2xl overflow-hidden hover:border-[#444] transition-all duration-200">
        {/* Preview Area */}
        <div className="relative aspect-square bg-[#0d0d0d] flex items-center justify-center cursor-pointer" onClick={() => setShowLightbox(true)}>
          {item.result ? (
            <img
              src={item.result}
              alt={item.prompt}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <ImageIcon className="w-8 h-8 text-indigo-400" />
            </div>
          )}

          {/* Hover Overlay */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowLightbox(true);
              }}
              className="p-3 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 text-white hover:bg-white/20 transition-colors"
              title="Просмотр"
            >
              <ImageIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Info Area */}
        <div className="p-4 space-y-3">
          <p className="text-sm text-white/90 line-clamp-2" title={item.prompt}>
            {item.prompt.length > 60 ? item.prompt.substring(0, 60) + "..." : item.prompt}
          </p>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-[#666]">
              <span>{item.model}</span>
            </div>
            <span className="text-xs text-[#666]">{formatDate(item.createdAt)}</span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 pt-2 border-t border-[#333]">
            <button
              onClick={() => onOpen(item)}
              className="flex-1 px-3 py-2 rounded-lg bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-medium transition-all duration-300 shadow-lg shadow-[0_0_24px_rgba(0,112,243,0.4)] flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Открыть
            </button>
            <button
              onClick={() => setShowConfirmDelete(true)}
              className="p-2 rounded-lg bg-transparent border border-[#333] text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
              title="Удалить"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      {showLightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm" onClick={() => setShowLightbox(false)}>
          <button
            onClick={() => setShowLightbox(false)}
            className="absolute top-4 right-4 p-2 rounded-lg bg-white/[0.1] text-white hover:bg-white/[0.2] transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <img
            src={item.result}
            alt={item.prompt}
            className="max-w-full max-h-[90vh] object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showConfirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" onClick={() => setShowConfirmDelete(false)}>
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
    </>
  );
};

// Media card component (Video/Audio)
interface MediaCardProps {
  item: HistoryItem;
  onDelete: (id: string) => void;
  onOpen: (item: HistoryItem) => void;
}

const MediaCard = ({ item, onDelete, onOpen }: MediaCardProps) => {
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const handlePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const Icon = item.type === "video" ? Video : Music;

  return (
    <div className="group bg-white/[0.02] border border-[#333] rounded-2xl overflow-hidden hover:border-[#444] transition-all duration-200">
      {/* Preview Area */}
      <div className="relative aspect-video bg-[#0d0d0d] flex items-center justify-center">
        {item.type === "video" && item.result ? (
          <video
            ref={videoRef}
            src={item.result}
            className="w-full h-full object-cover"
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            loop
            muted
          />
        ) : item.type === "audio" ? (
          <div className="w-full h-full flex items-center justify-center">
            <div className="w-20 h-20 rounded-xl bg-indigo-500/20 flex items-center justify-center">
              <Music className="w-10 h-10 text-indigo-400" />
            </div>
          </div>
        ) : null}

        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <button
            onClick={handlePlay}
            className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 transition-all flex items-center justify-center"
          >
            <Play className="w-8 h-8 ml-1" fill="currentColor" />
          </button>
        </div>

        {/* Type Badge */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 backdrop-blur-sm">
          <span className="text-xs font-medium text-indigo-400 flex items-center gap-1.5">
            <Icon className="w-3 h-3" />
            {item.type === "video" ? "Видео" : "Аудио"}
          </span>
        </div>
      </div>

      {/* Info Area */}
      <div className="p-4 space-y-3">
        <p className="text-sm text-white/90 line-clamp-2" title={item.prompt}>
          {item.prompt.length > 60 ? item.prompt.substring(0, 60) + "..." : item.prompt}
        </p>

        <div className="flex items-center justify-between text-xs text-[#666]">
          <span>{item.model}</span>
          <span>{formatDate(item.createdAt)}</span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2 border-t border-[#333]">
          <button
            onClick={() => onOpen(item)}
            className="flex-1 px-3 py-2 rounded-lg bg-[#0070f3] hover:bg-[#0060df] text-white text-xs font-medium transition-all duration-300 shadow-lg shadow-[0_0_24px_rgba(0,112,243,0.4)] flex items-center justify-center gap-1.5"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Открыть
          </button>
          <button
            onClick={() => setShowConfirmDelete(true)}
            className="p-2 rounded-lg bg-transparent border border-[#333] text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-colors"
            title="Удалить"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
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
    <h3 className="text-xl font-semibold text-white mb-2">Ваша библиотека пока пуста</h3>
    <p className="text-[#666] text-sm mb-6 text-center max-w-md">
      Создайте свой первый шедевр!
    </p>
    <button
      onClick={onStartCreating}
      className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#0070f3] hover:bg-[#0060df] text-white font-medium shadow-lg shadow-[0_0_24px_rgba(0,112,243,0.4)] transition-all"
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

  // Load history on mount and refresh periodically
  useEffect(() => {
    const loadHistory = () => {
      setHistory(getHistory());
    };
    loadHistory();
    const interval = setInterval(loadHistory, 1000); // Refresh every second
    return () => clearInterval(interval);
  }, []);

  const handleDelete = (id: string) => {
    const newHistory = history.filter((item) => item.id !== id);
    setHistory(newHistory);
    saveHistory(newHistory);
  };

  const handleOpen = (item: HistoryItem) => {
    // Copy prompt to clipboard if needed
    if (item.prompt) {
      navigator.clipboard.writeText(item.prompt);
    }
    
    // Navigate to appropriate studio
    if (onNavigate) {
      switch (item.type) {
        case "image":
          onNavigate("image");
          break;
        case "video":
        case "avatar":
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

  // Filter logic based on new categories
  const filteredHistory = (() => {
    switch (filter) {
      case "chat":
        return history.filter((item) => item.type === "chat");
      case "gallery":
        return history.filter((item) => item.type === "image");
      case "media":
        return history.filter((item) => item.type === "video" || item.type === "audio" || item.type === "avatar");
      case "all":
      default:
        return history;
    }
  })();

  return (
    <div className="min-h-screen p-4 md:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-mono font-bold text-white mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-indigo-400" />
            </div>
            История
          </h1>
          <p className="text-[#666] text-sm">Все ваши созданные материалы</p>
        </div>

        {/* Filters - новые категории */}
        <div className="flex flex-wrap gap-2 mb-6">
          <FilterButton
            active={filter === "all"}
            onClick={() => setFilter("all")}
            icon={Clock}
            label="Все"
          />
          <FilterButton
            active={filter === "chat"}
            onClick={() => setFilter("chat")}
            icon={MessageSquare}
            label="Чаты"
          />
          <FilterButton
            active={filter === "gallery"}
            onClick={() => setFilter("gallery")}
            icon={ImageIcon}
            label="Галерея"
          />
          <FilterButton
            active={filter === "media"}
            onClick={() => setFilter("media")}
            icon={Video}
            label="Медиа"
          />
        </div>

        {/* Count */}
        {filteredHistory.length > 0 && (
          <p className="text-sm text-[#666] mb-4">
            {filteredHistory.length} {filteredHistory.length === 1 ? "элемент" : filteredHistory.length < 5 ? "элемента" : "элементов"}
          </p>
        )}

        {/* Content - разное отображение в зависимости от категории */}
        {filteredHistory.length === 0 ? (
          <EmptyState onStartCreating={() => onNavigate?.("chat")} />
        ) : filter === "chat" ? (
          // Чаты: список
          <div className="space-y-3">
            {filteredHistory.map((item) => (
              <ChatListItem
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onOpen={handleOpen}
              />
            ))}
          </div>
        ) : filter === "gallery" ? (
          // Галерея: сетка изображений
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
            {filteredHistory.map((item) => (
              <ImageCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onOpen={handleOpen}
              />
            ))}
          </div>
        ) : (
          // Медиа: карточки с Play
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredHistory.map((item) => (
              <MediaCard
                key={item.id}
                item={item}
                onDelete={handleDelete}
                onOpen={handleOpen}
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

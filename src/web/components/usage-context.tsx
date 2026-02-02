import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface UsageLimits {
  maxMessages: number;
  maxImages: number;
  maxVideos: number;
}

interface UsageState {
  messageCount: number;
  imageCount: number;
  videoCount: number;
  limits: UsageLimits;
  canSendMessage: boolean;
  canGenerateImage: boolean;
  canGenerateVideo: boolean;
  incrementMessages: () => void;
  incrementImages: () => void;
  incrementVideos: () => void;
  checkMessageLimit: () => boolean;
  checkImageLimit: () => boolean;
  checkVideoLimit: () => boolean;
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;
  paywallReason: "messages" | "images" | "videos" | null;
  setPaywallReason: (reason: "messages" | "images" | "videos" | null) => void;
}

const FREE_LIMITS: UsageLimits = {
  maxMessages: 5,
  maxImages: 2,
  maxVideos: 0, // Video requires Studio plan
};

const STORAGE_KEY = "synapse_usage";

interface StoredUsage {
  messageCount: number;
  imageCount: number;
  videoCount: number;
}

const UsageContext = createContext<UsageState | null>(null);

export const useUsage = () => {
  const context = useContext(UsageContext);
  if (!context) {
    throw new Error("useUsage must be used within a UsageProvider");
  }
  return context;
};

interface UsageProviderProps {
  children: ReactNode;
}

export const UsageProvider = ({ children }: UsageProviderProps) => {
  const [messageCount, setMessageCount] = useState(0);
  const [imageCount, setImageCount] = useState(0);
  const [videoCount, setVideoCount] = useState(0);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"messages" | "images" | "videos" | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredUsage = JSON.parse(stored);
        setMessageCount(parsed.messageCount || 0);
        setImageCount(parsed.imageCount || 0);
        setVideoCount(parsed.videoCount || 0);
      }
    } catch (error) {
      console.error("Failed to load usage from localStorage:", error);
    }
  }, []);

  // Save to localStorage whenever counts change
  useEffect(() => {
    try {
      const data: StoredUsage = { messageCount, imageCount, videoCount };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save usage to localStorage:", error);
    }
  }, [messageCount, imageCount, videoCount]);

  const canSendMessage = messageCount < FREE_LIMITS.maxMessages;
  const canGenerateImage = imageCount < FREE_LIMITS.maxImages;
  const canGenerateVideo = videoCount < FREE_LIMITS.maxVideos;

  const checkMessageLimit = () => {
    if (messageCount >= FREE_LIMITS.maxMessages) {
      setPaywallReason("messages");
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  const checkImageLimit = () => {
    if (imageCount >= FREE_LIMITS.maxImages) {
      setPaywallReason("images");
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  const checkVideoLimit = () => {
    if (videoCount >= FREE_LIMITS.maxVideos) {
      setPaywallReason("videos");
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  const incrementMessages = () => {
    setMessageCount((prev) => prev + 1);
  };

  const incrementImages = () => {
    setImageCount((prev) => prev + 1);
  };

  const incrementVideos = () => {
    setVideoCount((prev) => prev + 1);
  };

  return (
    <UsageContext.Provider
      value={{
        messageCount,
        imageCount,
        videoCount,
        limits: FREE_LIMITS,
        canSendMessage,
        canGenerateImage,
        canGenerateVideo,
        incrementMessages,
        incrementImages,
        incrementVideos,
        checkMessageLimit,
        checkImageLimit,
        checkVideoLimit,
        showPaywall,
        setShowPaywall,
        paywallReason,
        setPaywallReason,
      }}
    >
      {children}
    </UsageContext.Provider>
  );
};

import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface UsageLimits {
  maxMessages: number;
  maxImages: number;
}

interface UsageState {
  messageCount: number;
  imageCount: number;
  limits: UsageLimits;
  canSendMessage: boolean;
  canGenerateImage: boolean;
  incrementMessages: () => void;
  incrementImages: () => void;
  checkMessageLimit: () => boolean;
  checkImageLimit: () => boolean;
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;
  paywallReason: "messages" | "images" | null;
  setPaywallReason: (reason: "messages" | "images" | null) => void;
}

const FREE_LIMITS: UsageLimits = {
  maxMessages: 5,
  maxImages: 2,
};

const STORAGE_KEY = "synapse_usage";

interface StoredUsage {
  messageCount: number;
  imageCount: number;
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
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"messages" | "images" | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredUsage = JSON.parse(stored);
        setMessageCount(parsed.messageCount || 0);
        setImageCount(parsed.imageCount || 0);
      }
    } catch (error) {
      console.error("Failed to load usage from localStorage:", error);
    }
  }, []);

  // Save to localStorage whenever counts change
  useEffect(() => {
    try {
      const data: StoredUsage = { messageCount, imageCount };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save usage to localStorage:", error);
    }
  }, [messageCount, imageCount]);

  const canSendMessage = messageCount < FREE_LIMITS.maxMessages;
  const canGenerateImage = imageCount < FREE_LIMITS.maxImages;

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

  const incrementMessages = () => {
    setMessageCount((prev) => prev + 1);
  };

  const incrementImages = () => {
    setImageCount((prev) => prev + 1);
  };

  return (
    <UsageContext.Provider
      value={{
        messageCount,
        imageCount,
        limits: FREE_LIMITS,
        canSendMessage,
        canGenerateImage,
        incrementMessages,
        incrementImages,
        checkMessageLimit,
        checkImageLimit,
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

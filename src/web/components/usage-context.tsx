import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { type UserPlan, canAccessModel as checkModelAccess } from "./model-selector";

interface UsageLimits {
  maxMessages: number;
  maxImages: number;
  maxVideos: number;
}

interface UsageState {
  messageCount: number;
  imageCount: number;
  videoCount: number;
  creditBalance: number;
  userPlan: UserPlan;
  limits: UsageLimits;
  canSendMessage: boolean;
  canGenerateImage: boolean;
  canGenerateVideo: boolean;
  incrementMessages: () => void;
  incrementImages: () => void;
  incrementVideos: () => void;
  deductCredits: (amount: number) => boolean;
  checkMessageLimit: () => boolean;
  checkImageLimit: () => boolean;
  checkVideoLimit: () => boolean;
  checkCredits: (amount: number) => boolean;
  canAccessModel: (requiredPlan: UserPlan) => boolean;
  showPaywall: boolean;
  setShowPaywall: (show: boolean) => void;
  paywallReason: "messages" | "images" | "videos" | "credits" | null;
  setPaywallReason: (reason: "messages" | "images" | "videos" | "credits" | null) => void;
}

// Free tier limits
const FREE_LIMITS: UsageLimits = {
  maxMessages: 5,
  maxImages: 2,
  maxVideos: 0, // Video requires Studio plan
};

// Initial free credits (Welcome Bonus)
const INITIAL_FREE_CREDITS = 15;
const WELCOME_BONUS = 15;

const STORAGE_KEY = "synapse_usage";

interface StoredUsage {
  messageCount: number;
  imageCount: number;
  videoCount: number;
  creditBalance: number;
  userPlan: UserPlan;
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
  const [creditBalance, setCreditBalance] = useState(INITIAL_FREE_CREDITS);
  const [userPlan, setUserPlan] = useState<UserPlan>("free");
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallReason, setPaywallReason] = useState<"messages" | "images" | "videos" | "credits" | null>(null);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredUsage = JSON.parse(stored);
        setMessageCount(parsed.messageCount || 0);
        setImageCount(parsed.imageCount || 0);
        setVideoCount(parsed.videoCount || 0);
        // Only set credit balance if it exists, otherwise use initial
        setCreditBalance(parsed.creditBalance ?? INITIAL_FREE_CREDITS);
        setUserPlan(parsed.userPlan || "free");
      }
    } catch (error) {
      console.error("Failed to load usage from localStorage:", error);
    }
  }, []);

  // Save to localStorage whenever counts change
  useEffect(() => {
    try {
      const data: StoredUsage = { 
        messageCount, 
        imageCount, 
        videoCount, 
        creditBalance,
        userPlan 
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save usage to localStorage:", error);
    }
  }, [messageCount, imageCount, videoCount, creditBalance, userPlan]);

  const canSendMessage = messageCount < FREE_LIMITS.maxMessages;
  const canGenerateImage = imageCount < FREE_LIMITS.maxImages;
  const canGenerateVideo = videoCount < FREE_LIMITS.maxVideos;

  // Check if user has enough credits
  const checkCredits = (amount: number): boolean => {
    if (creditBalance < amount) {
      setPaywallReason("credits");
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  // Deduct credits - returns true if successful, false if not enough credits
  const deductCredits = (amount: number): boolean => {
    if (creditBalance >= amount) {
      setCreditBalance((prev) => Math.max(0, prev - amount));
      return true;
    }
    return false;
  };

  // Check if user can access a model based on their plan
  const canAccessModel = (requiredPlan: UserPlan): boolean => {
    return checkModelAccess(userPlan, requiredPlan);
  };

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
        creditBalance,
        userPlan,
        limits: FREE_LIMITS,
        canSendMessage,
        canGenerateImage,
        canGenerateVideo,
        incrementMessages,
        incrementImages,
        incrementVideos,
        deductCredits,
        checkMessageLimit,
        checkImageLimit,
        checkVideoLimit,
        checkCredits,
        canAccessModel,
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

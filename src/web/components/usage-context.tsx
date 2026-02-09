import { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";
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
  freeImageCountToday: number;
  effectiveFreeImageCountToday: number;
  messageCountToday: number;
  effectiveMessageCountToday: number;
  videoCountToday: number;
  effectiveVideoCountToday: number;
  checkFreeImageDailyLimit: () => boolean;
  incrementFreeImageDaily: () => void;
  checkMessageDailyLimit: (modelId: string) => boolean;
  incrementMessageDaily: () => void;
  checkVideoDailyLimit: () => boolean;
  incrementVideoDaily: () => void;
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

// Free tier daily limits (Retention Strategy)
const FREE_LIMITS: UsageLimits = {
  maxMessages: 30,   // в сутки для DeepSeek R1 и GPT-4o mini
  maxImages: 3,      // в сутки для Kandinsky и Flux
  maxVideos: 1,     // в сутки для Kling AI
};

export const MAX_FREE_IMAGE_PER_DAY = 3;
export const FREE_CHAT_MODEL_IDS = ["deepseek-r1", "gpt-4o-mini"] as const;

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
  freeImageCountToday?: number;
  freeImageCountDate?: string;
  messageCountToday?: number;
  messageCountDate?: string;
  videoCountToday?: number;
  videoCountDate?: string;
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

  const [freeImageCountToday, setFreeImageCountToday] = useState(0);
  const [freeImageCountDate, setFreeImageCountDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [messageCountToday, setMessageCountToday] = useState(0);
  const [messageCountDate, setMessageCountDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [videoCountToday, setVideoCountToday] = useState(0);
  const [videoCountDate, setVideoCountDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const freeImageCountDateRef = useRef(freeImageCountDate);
  freeImageCountDateRef.current = freeImageCountDate;
  const messageCountDateRef = useRef(messageCountDate);
  messageCountDateRef.current = messageCountDate;
  const videoCountDateRef = useRef(videoCountDate);
  videoCountDateRef.current = videoCountDate;

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const today = new Date().toISOString().slice(0, 10);
      if (stored) {
        const parsed: StoredUsage = JSON.parse(stored);
        setMessageCount(parsed.messageCount || 0);
        setImageCount(parsed.imageCount || 0);
        setVideoCount(parsed.videoCount || 0);
        setCreditBalance(parsed.creditBalance ?? INITIAL_FREE_CREDITS);
        setUserPlan(parsed.userPlan || "free");
        if (parsed.freeImageCountDate === today && typeof parsed.freeImageCountToday === "number") {
          setFreeImageCountToday(parsed.freeImageCountToday);
          setFreeImageCountDate(today);
        } else {
          setFreeImageCountToday(0);
          setFreeImageCountDate(today);
        }
        if (parsed.messageCountDate === today && typeof parsed.messageCountToday === "number") {
          setMessageCountToday(parsed.messageCountToday);
          setMessageCountDate(today);
        } else {
          setMessageCountToday(0);
          setMessageCountDate(today);
        }
        if (parsed.videoCountDate === today && typeof parsed.videoCountToday === "number") {
          setVideoCountToday(parsed.videoCountToday);
          setVideoCountDate(today);
        } else {
          setVideoCountToday(0);
          setVideoCountDate(today);
        }
      } else {
        setFreeImageCountDate(today);
        setMessageCountDate(today);
        setVideoCountDate(today);
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
        userPlan,
        freeImageCountToday,
        freeImageCountDate,
        messageCountToday,
        messageCountDate,
        videoCountToday,
        videoCountDate,
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error("Failed to save usage to localStorage:", error);
    }
  }, [messageCount, imageCount, videoCount, creditBalance, userPlan, freeImageCountToday, freeImageCountDate, messageCountToday, messageCountDate, videoCountToday, videoCountDate]);

  const today = new Date().toISOString().slice(0, 10);
  const effectiveMessageToday = messageCountDate === today ? messageCountToday : 0;
  const effectiveVideoToday = videoCountDate === today ? videoCountToday : 0;
  const canSendMessage = effectiveMessageToday < FREE_LIMITS.maxMessages;
  const canGenerateImage = imageCount < FREE_LIMITS.maxImages;
  const canGenerateVideo = effectiveVideoToday < FREE_LIMITS.maxVideos;

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
    if (effectiveMessageToday >= FREE_LIMITS.maxMessages) {
      setPaywallReason("messages");
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  const checkMessageDailyLimit = (modelId: string) => {
    if (!FREE_CHAT_MODEL_IDS.includes(modelId as typeof FREE_CHAT_MODEL_IDS[number])) return true;
    const t = new Date().toISOString().slice(0, 10);
    const count = messageCountDate === t ? messageCountToday : 0;
    if (count >= FREE_LIMITS.maxMessages) {
      setPaywallReason("messages");
      setShowPaywall(true);
      return false;
    }
    if (messageCountDate !== t) {
      setMessageCountToday(0);
      setMessageCountDate(t);
    }
    return true;
  };

  const incrementMessageDaily = () => {
    const t = new Date().toISOString().slice(0, 10);
    setMessageCountDate(t);
    setMessageCountToday((prev) => (messageCountDateRef.current !== t ? 1 : prev + 1));
  };

  const checkImageLimit = () => {
    if (imageCount >= FREE_LIMITS.maxImages) {
      setPaywallReason("images");
      setShowPaywall(true);
      return false;
    }
    return true;
  };

  const checkFreeImageDailyLimit = () => {
    const today = new Date().toISOString().slice(0, 10);
    const effectiveCount = freeImageCountDate === today ? freeImageCountToday : 0;
    if (effectiveCount >= MAX_FREE_IMAGE_PER_DAY) {
      setPaywallReason("images");
      setShowPaywall(true);
      return false;
    }
    if (freeImageCountDate !== today) {
      setFreeImageCountToday(0);
      setFreeImageCountDate(today);
    }
    return true;
  };

  const incrementFreeImageDaily = () => {
    const today = new Date().toISOString().slice(0, 10);
    setFreeImageCountDate(today);
    setFreeImageCountToday((prev) => {
      if (freeImageCountDateRef.current !== today) return 1;
      return prev + 1;
    });
  };

  const checkVideoLimit = () => {
    const t = new Date().toISOString().slice(0, 10);
    const count = videoCountDate === t ? videoCountToday : 0;
    if (count >= FREE_LIMITS.maxVideos) {
      setPaywallReason("videos");
      setShowPaywall(true);
      return false;
    }
    if (videoCountDate !== t) {
      setVideoCountToday(0);
      setVideoCountDate(t);
    }
    return true;
  };

  const checkVideoDailyLimit = () => checkVideoLimit();

  const incrementVideoDaily = () => {
    const t = new Date().toISOString().slice(0, 10);
    setVideoCountDate(t);
    setVideoCountToday((prev) => (videoCountDateRef.current !== t ? 1 : prev + 1));
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
        freeImageCountToday,
        effectiveFreeImageCountToday:
          freeImageCountDate === today ? freeImageCountToday : 0,
        messageCountToday,
        effectiveMessageCountToday: effectiveMessageToday,
        videoCountToday,
        effectiveVideoCountToday: effectiveVideoToday,
        checkFreeImageDailyLimit,
        incrementFreeImageDaily,
        checkMessageDailyLimit,
        incrementMessageDaily,
        checkVideoDailyLimit,
        incrementVideoDaily,
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

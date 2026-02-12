/**
 * Synapse Tier Control System
 * Тарифная система контроля доступа к AI-моделям
 */

export type SynapseTier = "START" | "CREATOR" | "PRO_STUDIO" | "MAXIMAL";

// Иерархия тарифов (числа для сравнения)
export const TIER_HIERARCHY: Record<SynapseTier, number> = {
  START: 0,
  CREATOR: 1,
  PRO_STUDIO: 2,
  MAXIMAL: 3,
};

// Маппинг старых планов на новые тарифы
export const PLAN_TO_TIER: Record<string, SynapseTier> = {
  free: "START",
  lite: "CREATOR",
  standard: "CREATOR",
  ultra: "PRO_STUDIO",
};

/**
 * Распределение моделей Chat по тарифам
 * Формат: backendId -> требуемый тариф
 */
export const CHAT_MODEL_TIERS: Record<string, SynapseTier> = {
  // START (390 ₽)
  "deepseek/deepseek-r1": "START",
  "openai/gpt-4o-mini": "START",
  "black-forest-labs/flux-schnell": "START",
  "openrouter/free": "START",
  
  // CREATOR (990 ₽)
  "openai/gpt-4o": "CREATOR",
  "anthropic/claude-3.5-sonnet": "CREATOR",
  "google/gemini-flash-1.5": "CREATOR",
  "google/gemini-2.0-flash-exp:free": "CREATOR", // Nana Banana
  
  // PRO STUDIO (2 990 ₽)
  "openai/o1": "PRO_STUDIO",
  "google/gemini-pro-1.5": "PRO_STUDIO",
  "black-forest-labs/flux-pro": "PRO_STUDIO",
  
  // PRO STUDIO (2 990 ₽)
  "openai/o1": "PRO_STUDIO",
  "google/gemini-pro-1.5": "PRO_STUDIO",
  "black-forest-labs/flux-pro": "PRO_STUDIO",
  
  // MAXIMAL (8 990 ₽) - полный доступ ко всем моделям
};

/**
 * Распределение моделей Image по тарифам
 */
export const IMAGE_MODEL_TIERS: Record<string, SynapseTier> = {
  // START (390 ₽)
  "black-forest-labs/flux-schnell": "START",
  "black-forest-labs/flux-dev": "START",
  "openrouter/free": "START",
  
  // CREATOR (990 ₽)
  "openai/dall-e-3": "CREATOR",
  "google/gemini-2.0-flash-exp:free": "CREATOR", // Nana Banana
  
  // PRO STUDIO (2 990 ₽)
  "black-forest-labs/flux-pro": "PRO_STUDIO",
  "black-forest-labs/flux-2-pro": "PRO_STUDIO",
  
  // MAXIMAL (8 990 ₽)
  "openai/gpt-4o": "MAXIMAL", // image-generation
};

/**
 * Маппинг frontend ID на backend ID для проверки
 */
export const FRONTEND_TO_BACKEND: Record<string, string> = {
  // Chat models
  "deepseek-r1": "deepseek/deepseek-r1",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "gpt-4o": "openai/gpt-4o",
  "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet",
  "gpt-5-o1": "openai/o1",
  "nana-banana": "google/gemini-2.0-flash-exp:free",
  
  // Image models
  "flux-schnell": "black-forest-labs/flux-schnell",
  "flux-dev": "black-forest-labs/flux-dev",
  "dall-e-3": "openai/dall-e-3",
  "flux-pro": "black-forest-labs/flux-pro",
};

/**
 * Проверка доступа к модели по тарифу
 */
export const canAccessModelByTier = (
  userTier: SynapseTier,
  requiredTier: SynapseTier
): boolean => {
  return TIER_HIERARCHY[userTier] >= TIER_HIERARCHY[requiredTier];
};

/**
 * Получить требуемый тариф для модели (по backend ID)
 */
export const getRequiredTierForChatModel = (backendModelId: string): SynapseTier => {
  return CHAT_MODEL_TIERS[backendModelId] || "PRO_STUDIO"; // По умолчанию PRO_STUDIO для безопасности
};

export const getRequiredTierForImageModel = (backendModelId: string): SynapseTier => {
  return IMAGE_MODEL_TIERS[backendModelId] || "PRO_STUDIO";
};

/**
 * Конвертировать старый план в новый тариф
 */
export const planToTier = (plan: string): SynapseTier => {
  return PLAN_TO_TIER[plan] || "START";
};

/**
 * Проверить доступ к функции по тарифу
 */
export const checkTierAccess = (
  userTier: SynapseTier,
  requiredTier: SynapseTier
): { allowed: boolean; message?: string } => {
  const allowed = canAccessModelByTier(userTier, requiredTier);
  
  if (!allowed) {
    const tierNames: Record<SynapseTier, string> = {
      START: "START",
      CREATOR: "CREATOR",
      PRO_STUDIO: "PRO STUDIO",
      MAXIMAL: "МАКСИМАЛЬНЫЙ",
    };
    
    return {
      allowed: false,
      message: `Доступно только в ${tierNames[requiredTier]}`,
    };
  }
  
  return { allowed: true };
};

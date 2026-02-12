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
  // START (390 ₽) - актуальные ID 2026 года
  "deepseek/deepseek-v3.2": "START", // Обновлено на v3.2 (2026)
  "openai/gpt-4o-mini": "START",
  "openrouter/free": "START",
  
  // CREATOR (990 ₽)
  "openai/gpt-4o": "CREATOR",
  "anthropic/claude-3.5-sonnet": "CREATOR",
  
  // PRO STUDIO (2 990 ₽) - актуальные ID 2026 года
  "openai/gpt-5-pro": "PRO_STUDIO", // Обновлено на GPT-5 Pro (2026)
  "anthropic/claude-opus-4.6": "PRO_STUDIO", // Новый Claude Opus 4.6 (2026)
  
  // MAXIMAL (8 990 ₽) - полный доступ ко всем моделям
};

/**
 * Распределение моделей Image по тарифам
 */
export const IMAGE_MODEL_TIERS: Record<string, SynapseTier> = {
  // START (390 ₽) - актуальные ID 2026 года
  "black-forest-labs/flux.2-klein": "START", // Flux 2 Klein (быстро/дешево, 2026)
  "openrouter/free": "START",
  
  // CREATOR (990 ₽) - актуальные ID 2026 года
  "google/gemini-2.5-flash-image": "CREATOR", // Gemini 2.5 Flash для изображений (2026)
  
  // PRO STUDIO (2 990 ₽) - актуальные ID 2026 года
  "black-forest-labs/flux.2-pro": "PRO_STUDIO", // Flux 2 Pro (премиум, 2026)
  
  // MAXIMAL (8 990 ₽)
  "openai/gpt-4o": "MAXIMAL", // image-generation
};

/**
 * Маппинг frontend ID на backend ID для проверки
 */
export const FRONTEND_TO_BACKEND: Record<string, string> = {
  // Chat models - актуальные ID 2026 года
  "deepseek-r1": "deepseek/deepseek-v3.2",
  "gpt-4o-mini": "openai/gpt-4o-mini",
  "gpt-4o": "openai/gpt-4o",
  "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet",
  "gpt-5-o1": "openai/gpt-5-pro",
  "claude-opus": "anthropic/claude-opus-4.6",
  
  // Image models - актуальные ID 2026 года
  "flux-schnell": "black-forest-labs/flux.2-klein",
  "nana-banana": "google/gemini-2.5-flash-image",
  "flux-pro": "black-forest-labs/flux.2-pro",
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

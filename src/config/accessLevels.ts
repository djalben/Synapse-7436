/**
 * Synapse Tier Control System
 * Глобальная система контроля доступа по тарифам
 */

export type SynapseTier = "START" | "CREATOR" | "PRO_STUDIO" | "MAXIMAL";

// Маппинг старых планов на новые тарифы
export const PLAN_TO_TIER: Record<string, SynapseTier> = {
  free: "START",
  lite: "CREATOR",
  standard: "CREATOR",
  ultra: "PRO_STUDIO",
};

// Иерархия тарифов (числа для сравнения)
export const TIER_HIERARCHY: Record<SynapseTier, number> = {
  START: 0,
  CREATOR: 1,
  PRO_STUDIO: 2,
  MAXIMAL: 3,
};

// Распределение моделей Chat по тарифам (frontend IDs)
export const CHAT_MODEL_ACCESS: Record<string, SynapseTier> = {
  // START tier
  "deepseek-r1": "START",
  "gpt-4o-mini": "START",
  
  // CREATOR tier
  "gpt-4o": "CREATOR",
  "claude-3.5-sonnet": "CREATOR",
  
  // PRO_STUDIO tier
  "gpt-5-o1": "PRO_STUDIO",
};

// Распределение моделей Image по тарифам (frontend IDs)
export const IMAGE_MODEL_ACCESS: Record<string, SynapseTier> = {
  // START tier
  "flux-schnell": "START",
  "kandinsky-3.1": "START",
  
  // CREATOR tier
  "nana-banana": "CREATOR", // Использует google/gemini-flash-1.5
  
  // PRO_STUDIO tier
  "flux-2-pro": "PRO_STUDIO",
  
  // MAXIMAL tier
  "dall-e-3": "MAXIMAL", // openai/gpt-4o (DALL-E 3 уровень)
};

// Маппинг backend ID на тарифы (для проверки в API)
export const BACKEND_MODEL_TIERS: Record<string, SynapseTier> = {
  // ===== START TIER =====
  // Chat models
  "deepseek/deepseek-r1": "START",
  "openai/gpt-4o-mini": "START",
  
  // Image models
  "black-forest-labs/flux-schnell": "START",
  "openrouter/free": "START",
  
  // ===== CREATOR TIER =====
  // Chat models
  "openai/gpt-4o": "CREATOR",
  "anthropic/claude-3.5-sonnet": "CREATOR",
  
  // Image models
  "google/gemini-flash-1.5": "CREATOR", // Для стилей Nana Banana
  
  // Audio models (будущее)
  "suno/chirp-v3-5": "CREATOR",
  
  // ===== PRO_STUDIO TIER =====
  // Chat models
  "openai/o1": "PRO_STUDIO",
  
  // Image models
  "google/gemini-pro-1.5": "PRO_STUDIO",
  "black-forest-labs/flux-pro": "PRO_STUDIO",
  
  // Video models (зарезервировано)
  "luma/ray-v1": "PRO_STUDIO",
  
  // Audio models (зарезервировано)
  "elevenlabs/voice-clone": "PRO_STUDIO",
  
  // ===== MAXIMAL TIER =====
  // Image models
  "openai/gpt-4o": "MAXIMAL", // DALL-E 3 уровень для изображений
  
  // ===== LEGACY/COMPATIBILITY MAPPINGS =====
  // Frontend image model IDs -> backend IDs
  "kandinsky-3.1": "START", // Maps to black-forest-labs/flux-schnell
  "flux-schnell": "START", // Maps to black-forest-labs/flux-schnell
  "nana-banana": "CREATOR", // Maps to google/gemini-flash-1.5
  "dall-e-3": "MAXIMAL", // Maps to openai/gpt-4o (DALL-E 3)
  "midjourney-v7": "START", // Maps to black-forest-labs/flux-schnell (fallback)
  "black-forest-labs/flux-dev": "START", // Legacy compatibility
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
 * Получить требуемый тариф для модели (по backend ID или frontend ID)
 */
export const getRequiredTierForModel = (modelId: string): SynapseTier => {
  // Сначала проверяем frontend ID (для image models)
  if (BACKEND_MODEL_TIERS[modelId]) {
    return BACKEND_MODEL_TIERS[modelId];
  }
  // Затем проверяем backend ID
  return BACKEND_MODEL_TIERS[modelId] || "PRO_STUDIO"; // По умолчанию PRO_STUDIO для безопасности
};

/**
 * Получить требуемый тариф для frontend модели изображения
 */
export const getRequiredTierForImageModel = (frontendModelId: string): SynapseTier => {
  // Маппинг frontend ID -> тариф (обновлено согласно новой конфигурации)
  const imageModelTiers: Record<string, SynapseTier> = {
    "kandinsky-3.1": "START",
    "flux-schnell": "START",
    "nana-banana": "CREATOR", // Использует google/gemini-flash-1.5
    "flux-2-pro": "PRO_STUDIO",
    "dall-e-3": "MAXIMAL", // openai/gpt-4o (DALL-E 3 уровень)
    "midjourney-v7": "START", // Fallback на flux-schnell
  };
  
  return imageModelTiers[frontendModelId] || BACKEND_MODEL_TIERS[frontendModelId] || "PRO_STUDIO";
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
      MAXIMAL: "MAXIMAL",
    };
    
    return {
      allowed: false,
      message: `Требуется тариф ${tierNames[requiredTier]} для этой функции`,
    };
  }
  
  return { allowed: true };
};

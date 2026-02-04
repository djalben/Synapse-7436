import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core"

/**
 * Database schema for Synapse AI Platform
 * Using Drizzle ORM with Cloudflare D1 (SQLite)
 */

// Таблица пользователей
export const users = sqliteTable("users", {
  id: text("id").primaryKey(), // UUID
  email: text("email").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  plan: text("plan").default("free"), // free, lite, standard, ultra
  creditBalance: real("credit_balance").default(10.0),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
  lastLoginAt: integer("last_login_at", { mode: "timestamp" }),
})

// Таблица генераций (история)
export const generations = sqliteTable("generations", {
  id: text("id").primaryKey(), // UUID
  userId: text("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // image, video, audio, chat, avatar, enhance
  prompt: text("prompt"),
  model: text("model"), // какая модель использовалась
  resultUrl: text("result_url"), // URL результата (изображение/видео/аудио)
  resultData: text("result_data"), // JSON с доп. данными
  creditsUsed: real("credits_used").default(0),
  status: text("status").default("completed"), // pending, processing, completed, failed
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
})

// Таблица подарочных кодов
export const giftCodes = sqliteTable("gift_codes", {
  id: text("id").primaryKey(),
  code: text("code").notNull().unique(),
  type: text("type").notNull(), // credits, plan
  value: text("value").notNull(), // "500" или "STANDARD"
  status: text("status").default("active"), // active, redeemed, expired
  redeemedBy: text("redeemed_by").references(() => users.id),
  redeemedAt: integer("redeemed_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
})

// Таблица расходов (для админа)
export const expenses = sqliteTable("expenses", {
  id: text("id").primaryKey(),
  amount: real("amount").notNull(),
  currency: text("currency").default("RUB"),
  service: text("service").notNull(), // OpenRouter, Replicate, Vercel, etc.
  description: text("description"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull().$defaultFn(() => new Date()),
})

// Type exports for use in application
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert
export type Generation = typeof generations.$inferSelect
export type NewGeneration = typeof generations.$inferInsert
export type GiftCode = typeof giftCodes.$inferSelect
export type NewGiftCode = typeof giftCodes.$inferInsert
export type Expense = typeof expenses.$inferSelect
export type NewExpense = typeof expenses.$inferInsert

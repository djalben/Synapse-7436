-- Synapse AI Platform - Initial Database Schema
-- Migration: 0001_init
-- Created: 2024

-- Таблица пользователей
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  avatar_url TEXT,
  plan TEXT DEFAULT 'free',
  credit_balance REAL DEFAULT 10.0,
  created_at INTEGER NOT NULL,
  last_login_at INTEGER
);

-- Индексы для users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_plan ON users(plan);

-- Таблица генераций (история)
CREATE TABLE IF NOT EXISTS generations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  prompt TEXT,
  model TEXT,
  result_url TEXT,
  result_data TEXT,
  credits_used REAL DEFAULT 0,
  status TEXT DEFAULT 'completed',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Индексы для generations
CREATE INDEX IF NOT EXISTS idx_generations_user_id ON generations(user_id);
CREATE INDEX IF NOT EXISTS idx_generations_type ON generations(type);
CREATE INDEX IF NOT EXISTS idx_generations_created_at ON generations(created_at);
CREATE INDEX IF NOT EXISTS idx_generations_status ON generations(status);

-- Таблица подарочных кодов
CREATE TABLE IF NOT EXISTS gift_codes (
  id TEXT PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  value TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  redeemed_by TEXT,
  redeemed_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (redeemed_by) REFERENCES users(id)
);

-- Индексы для gift_codes
CREATE INDEX IF NOT EXISTS idx_gift_codes_code ON gift_codes(code);
CREATE INDEX IF NOT EXISTS idx_gift_codes_status ON gift_codes(status);

-- Таблица расходов (для админа)
CREATE TABLE IF NOT EXISTS expenses (
  id TEXT PRIMARY KEY,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'RUB',
  service TEXT NOT NULL,
  description TEXT,
  created_at INTEGER NOT NULL
);

-- Индексы для expenses
CREATE INDEX IF NOT EXISTS idx_expenses_service ON expenses(service);
CREATE INDEX IF NOT EXISTS idx_expenses_created_at ON expenses(created_at);

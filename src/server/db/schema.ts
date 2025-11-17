// LearnCurve アプリのデータベーススキーマ
// https://orm.drizzle.team/docs/sql-schema-declaration

import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

// ユーザーテーブル（Supabase Auth の user.id を保存）
export const usersTable = sqliteTable('users', {
  id: text('id').primaryKey(), // Supabase の user.id
  email: text('email').notNull(),
  created_at: integer('created_at').notNull(), // Unix time (ms)
});

// カードテーブル（学習項目）
export const cardsTable = sqliteTable('cards', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: text('user_id').notNull(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  tags: text('tags'), // コンマ区切り
  category: text('category'), // カテゴリ（アルゴリズム / DB / ネットワークなど）
  difficulty: integer('difficulty'), // 難易度（1〜5などのスコア）
  embedding: text('embedding'), // embedding ベクトル（JSON文字列として保存）
  created_at: integer('created_at').notNull(), // Unix time (ms)
  updated_at: integer('updated_at'), // Unix time (ms), nullable
});

// カード状態テーブル（記憶アルゴリズム用）
export const cardStatesTable = sqliteTable('card_states', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: text('user_id').notNull(),
  card_id: integer('card_id').notNull(),
  ease: real('ease').notNull().default(2.3), // 初期値 2.3（既存のアルゴリズム用）
  interval_days: integer('interval_days').notNull().default(1), // 初期値 1
  rep_count: integer('rep_count').notNull().default(0), // 初期値 0
  stage: integer('stage').notNull().default(0), // 段階：0（新規）〜5（マスター）
  next_review_at: integer('next_review_at').notNull(), // Unix time (ms)
  last_reviewed_at: integer('last_reviewed_at'), // Unix time (ms), nullable
  success_rate: real('success_rate'), // 正答率（0.0〜1.0）
});

// レビューログテーブル
export const reviewsTable = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: text('user_id').notNull(),
  card_id: integer('card_id').notNull(),
  rating: text('rating').notNull(), // 'again' | 'hard' | 'good'
  reviewed_at: integer('reviewed_at').notNull(), // Unix time (ms)
});

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
  created_at: integer('created_at').notNull(), // Unix time (ms)
});

// カード状態テーブル（記憶アルゴリズム用）
export const cardStatesTable = sqliteTable('card_states', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: text('user_id').notNull(),
  card_id: integer('card_id').notNull(),
  ease: real('ease').notNull().default(2.3), // 初期値 2.3
  interval_days: integer('interval_days').notNull().default(1), // 初期値 1
  rep_count: integer('rep_count').notNull().default(0), // 初期値 0
  next_review_at: integer('next_review_at').notNull(), // Unix time (ms)
  last_reviewed_at: integer('last_reviewed_at'), // Unix time (ms), nullable
});

// レビューログテーブル
export const reviewsTable = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  user_id: text('user_id').notNull(),
  card_id: integer('card_id').notNull(),
  rating: text('rating').notNull(), // 'again' | 'hard' | 'good'
  reviewed_at: integer('reviewed_at').notNull(), // Unix time (ms)
});

import Database from 'better-sqlite3';
import { join } from 'path';

const DB_PATH = process.env.DB_PATH || join(process.cwd(), 'data', 'sessions.db');

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const { mkdirSync } = require('fs');
    const { dirname } = require('path');
    mkdirSync(dirname(DB_PATH), { recursive: true });

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        metadata TEXT NOT NULL,
        entries TEXT NOT NULL,
        visibility TEXT NOT NULL DEFAULT 'unlisted',
        created_at TEXT NOT NULL,
        expires_at TEXT,
        view_count INTEGER DEFAULT 0
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        github_id INTEGER UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        display_name TEXT,
        avatar_url TEXT,
        created_at TEXT NOT NULL
      )
    `);

    db.exec(`
      CREATE TABLE IF NOT EXISTS auth_tokens (
        token TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id),
        created_at TEXT NOT NULL
      )
    `);

    // Migrate: add columns to sessions if they don't exist
    const migrations = [
      'ALTER TABLE sessions ADD COLUMN user_id TEXT',
      'ALTER TABLE sessions ADD COLUMN pinned INTEGER DEFAULT 0',
      'ALTER TABLE sessions ADD COLUMN title TEXT',
    ];
    for (const sql of migrations) {
      try { db.exec(sql); } catch { /* column already exists */ }
    }
  }
  return db;
}

export interface StoredSession {
  id: string;
  metadata: string;
  entries: string;
  visibility: string;
  created_at: string;
  expires_at: string | null;
  view_count: number;
  user_id: string | null;
  pinned: number;
  title: string | null;
}

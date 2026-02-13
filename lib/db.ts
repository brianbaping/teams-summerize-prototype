/**
 * Database layer using better-sqlite3
 * Provides CRUD operations for all tables with error handling
 */

import Database from 'better-sqlite3';
import { DatabaseError } from './errors';

export interface MonitoredChat {
  id?: number;
  chatId: string;
  chatName?: string;
  chatType?: string; // 'oneOnOne' | 'group'
  status?: string; // 'active' | 'ignored'
  isActive?: number;
  createdAt?: string;
}

export interface Message {
  id?: number;
  messageId: string;
  chatId: string;
  author?: string;
  content?: string;
  createdAt: string | Date;
  fetchedAt?: string;
}

export interface Summary {
  id?: number;
  chatId: string;
  periodStart: string | Date;
  periodEnd: string | Date;
  summaryText?: string;
  actionItems?: string; // JSON string
  generatedAt?: string;
}

/**
 * Initialize database with schema
 * Creates all tables and indexes if they don't exist
 */
export function initializeDatabase(db: Database.Database): void {
  try {
    // Create monitored_chats table
    db.exec(`
      CREATE TABLE IF NOT EXISTS monitored_chats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT UNIQUE NOT NULL,
        chat_name TEXT,
        chat_type TEXT,
        status TEXT DEFAULT 'active',
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create messages table
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE NOT NULL,
        chat_id TEXT NOT NULL,
        author TEXT,
        content TEXT,
        created_at DATETIME,
        fetched_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create summaries table
    db.exec(`
      CREATE TABLE IF NOT EXISTS summaries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat_id TEXT NOT NULL,
        period_start DATE,
        period_end DATE,
        summary_text TEXT,
        action_items TEXT,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_chat_date
      ON messages(chat_id, created_at);
    `);

    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_summaries_date
      ON summaries(period_start, period_end);
    `);
  } catch (error) {
    throw new DatabaseError('Failed to initialize database', error);
  }
}

/**
 * Get default database instance
 * Uses DATABASE_PATH from environment or defaults to ./data/app.db
 */
export function getDatabase(): Database.Database {
  const dbPath = process.env.DATABASE_PATH || './data/app.db';
  const db = new Database(dbPath);
  initializeDatabase(db);
  return db;
}

// ============================================================================
// Monitored Chats Operations
// ============================================================================

/**
 * Save or update a monitored chat
 */
export function saveMonitoredChat(
  db: Database.Database,
  chat: MonitoredChat
): number {
  try {
    const stmt = db.prepare(`
      INSERT INTO monitored_chats (chat_id, chat_name, chat_type, status)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(chat_id) DO UPDATE SET
        chat_name = excluded.chat_name,
        chat_type = excluded.chat_type,
        status = excluded.status,
        is_active = 1
    `);

    const result = stmt.run(
      chat.chatId,
      chat.chatName || null,
      chat.chatType || null,
      chat.status || 'active'
    );

    return result.lastInsertRowid as number;
  } catch (error) {
    throw new DatabaseError('Failed to save monitored chat', error);
  }
}

/**
 * Get a monitored chat by chat ID
 */
export function getMonitoredChat(
  db: Database.Database,
  chatId: string
): MonitoredChat | null {
  try {
    const stmt = db.prepare(`
      SELECT id, chat_id as chatId, chat_name as chatName,
             chat_type as chatType, status, is_active as isActive, created_at as createdAt
      FROM monitored_chats
      WHERE chat_id = ?
    `);

    return stmt.get(chatId) as MonitoredChat | undefined || null;
  } catch (error) {
    throw new DatabaseError('Failed to get monitored chat', error);
  }
}

/**
 * Get all active monitored chats
 */
export function getAllMonitoredChats(
  db: Database.Database,
  includeIgnored: boolean = false
): MonitoredChat[] {
  try {
    let query = `
      SELECT id, chat_id as chatId, chat_name as chatName,
             chat_type as chatType, status, is_active as isActive, created_at as createdAt
      FROM monitored_chats
      WHERE is_active = 1
    `;

    if (!includeIgnored) {
      query += ` AND (status IS NULL OR status != 'ignored')`;
    }

    query += ` ORDER BY created_at DESC`;

    const stmt = db.prepare(query);
    return stmt.all() as MonitoredChat[];
  } catch (error) {
    throw new DatabaseError('Failed to get monitored chats', error);
  }
}

/**
 * Deactivate a monitored chat
 */
export function deactivateMonitoredChat(
  db: Database.Database,
  chatId: string
): void {
  try {
    const stmt = db.prepare(`
      UPDATE monitored_chats
      SET is_active = 0
      WHERE chat_id = ?
    `);

    stmt.run(chatId);
  } catch (error) {
    throw new DatabaseError('Failed to deactivate chat', error);
  }
}

// ============================================================================
// Messages Operations
// ============================================================================

/**
 * Save a message (skip if duplicate)
 */
export function saveMessage(db: Database.Database, message: Message): number {
  try {
    const stmt = db.prepare(`
      INSERT INTO messages (message_id, chat_id, author, content, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(message_id) DO NOTHING
    `);

    const createdAt =
      message.createdAt instanceof Date
        ? message.createdAt.toISOString()
        : message.createdAt;

    const result = stmt.run(
      message.messageId,
      message.chatId,
      message.author || null,
      message.content || null,
      createdAt
    );

    return result.lastInsertRowid as number;
  } catch (error) {
    throw new DatabaseError('Failed to save message', error);
  }
}

/**
 * Get a message by message ID
 */
export function getMessage(
  db: Database.Database,
  messageId: string
): Message | null {
  try {
    const stmt = db.prepare(`
      SELECT id, message_id as messageId, chat_id as chatId,
             author, content, created_at as createdAt, fetched_at as fetchedAt
      FROM messages
      WHERE message_id = ?
    `);

    return stmt.get(messageId) as Message | undefined || null;
  } catch (error) {
    throw new DatabaseError('Failed to get message', error);
  }
}

/**
 * Get messages for a chat, optionally since a specific date
 */
export function getMessages(
  db: Database.Database,
  chatId: string,
  since?: Date
): Message[] {
  try {
    let query = `
      SELECT id, message_id as messageId, chat_id as chatId,
             author, content, created_at as createdAt, fetched_at as fetchedAt
      FROM messages
      WHERE chat_id = ?
    `;

    const params: any[] = [chatId];

    if (since) {
      query += ' AND created_at > ?';
      params.push(since.toISOString());
    }

    query += ' ORDER BY created_at ASC';

    const stmt = db.prepare(query);
    return stmt.all(...params) as Message[];
  } catch (error) {
    throw new DatabaseError('Failed to get messages', error);
  }
}

/**
 * Get messages for a chat within a date range
 */
export function getMessagesByDateRange(
  db: Database.Database,
  chatId: string,
  startDate: Date,
  endDate: Date
): Message[] {
  try {
    const stmt = db.prepare(`
      SELECT id, message_id as messageId, chat_id as chatId,
             author, content, created_at as createdAt, fetched_at as fetchedAt
      FROM messages
      WHERE chat_id = ?
        AND DATE(created_at) >= DATE(?)
        AND DATE(created_at) <= DATE(?)
      ORDER BY created_at ASC
    `);

    return stmt.all(
      chatId,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    ) as Message[];
  } catch (error) {
    throw new DatabaseError('Failed to get messages by date range', error);
  }
}

// ============================================================================
// Summaries Operations
// ============================================================================

/**
 * Save a summary
 */
export function saveSummary(db: Database.Database, summary: Summary): number {
  try {
    const stmt = db.prepare(`
      INSERT INTO summaries (chat_id, period_start, period_end, summary_text, action_items)
      VALUES (?, ?, ?, ?, ?)
    `);

    const periodStart =
      summary.periodStart instanceof Date
        ? summary.periodStart.toISOString()
        : summary.periodStart;

    const periodEnd =
      summary.periodEnd instanceof Date
        ? summary.periodEnd.toISOString()
        : summary.periodEnd;

    const result = stmt.run(
      summary.chatId,
      periodStart,
      periodEnd,
      summary.summaryText || null,
      summary.actionItems || null
    );

    return result.lastInsertRowid as number;
  } catch (error) {
    throw new DatabaseError('Failed to save summary', error);
  }
}

/**
 * Get a summary by ID
 */
export function getSummary(
  db: Database.Database,
  id: number
): Summary | null {
  try {
    const stmt = db.prepare(`
      SELECT id, chat_id as chatId, period_start as periodStart,
             period_end as periodEnd, summary_text as summaryText,
             action_items as actionItems, generated_at as generatedAt
      FROM summaries
      WHERE id = ?
    `);

    return stmt.get(id) as Summary | undefined || null;
  } catch (error) {
    throw new DatabaseError('Failed to get summary', error);
  }
}

/**
 * Get all summaries for a chat
 */
export function getSummaries(
  db: Database.Database,
  chatId: string
): Summary[] {
  try {
    const stmt = db.prepare(`
      SELECT id, chat_id as chatId, period_start as periodStart,
             period_end as periodEnd, summary_text as summaryText,
             action_items as actionItems, generated_at as generatedAt
      FROM summaries
      WHERE chat_id = ?
      ORDER BY period_start DESC, generated_at DESC
    `);

    return stmt.all(chatId) as Summary[];
  } catch (error) {
    throw new DatabaseError('Failed to get summaries', error);
  }
}

/**
 * Get the latest summary for a chat
 */
export function getLatestSummary(
  db: Database.Database,
  chatId: string
): Summary | null {
  try {
    const stmt = db.prepare(`
      SELECT id, chat_id as chatId, period_start as periodStart,
             period_end as periodEnd, summary_text as summaryText,
             action_items as actionItems, generated_at as generatedAt
      FROM summaries
      WHERE chat_id = ?
      ORDER BY period_start DESC, generated_at DESC
      LIMIT 1
    `);

    return stmt.get(chatId) as Summary | undefined || null;
  } catch (error) {
    throw new DatabaseError('Failed to get latest summary', error);
  }
}

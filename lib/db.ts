/**
 * Database layer using better-sqlite3
 * Provides CRUD operations for all tables with error handling
 */

import Database from 'better-sqlite3';
import { DatabaseError } from './errors';

export interface MonitoredChannel {
  id?: number;
  teamId: string;
  channelId: string;
  channelName?: string;
  isActive?: number;
  createdAt?: string;
}

export interface Message {
  id?: number;
  messageId: string;
  channelId: string;
  author?: string;
  content?: string;
  createdAt: string | Date;
  fetchedAt?: string;
}

export interface Summary {
  id?: number;
  channelId: string;
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
    // Create monitored_channels table
    db.exec(`
      CREATE TABLE IF NOT EXISTS monitored_channels (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        team_id TEXT NOT NULL,
        channel_id TEXT UNIQUE NOT NULL,
        channel_name TEXT,
        is_active BOOLEAN DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create messages table
    db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        message_id TEXT UNIQUE NOT NULL,
        channel_id TEXT NOT NULL,
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
        channel_id TEXT NOT NULL,
        period_start DATE,
        period_end DATE,
        summary_text TEXT,
        action_items TEXT,
        generated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create indexes
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_channel_date
      ON messages(channel_id, created_at);
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
// Monitored Channels Operations
// ============================================================================

/**
 * Save or update a monitored channel
 */
export function saveMonitoredChannel(
  db: Database.Database,
  channel: MonitoredChannel
): number {
  try {
    const stmt = db.prepare(`
      INSERT INTO monitored_channels (team_id, channel_id, channel_name)
      VALUES (?, ?, ?)
      ON CONFLICT(channel_id) DO UPDATE SET
        channel_name = excluded.channel_name,
        is_active = 1
    `);

    const result = stmt.run(
      channel.teamId,
      channel.channelId,
      channel.channelName || null
    );

    return result.lastInsertRowid as number;
  } catch (error) {
    throw new DatabaseError('Failed to save monitored channel', error);
  }
}

/**
 * Get a monitored channel by channel ID
 */
export function getMonitoredChannel(
  db: Database.Database,
  channelId: string
): MonitoredChannel | null {
  try {
    const stmt = db.prepare(`
      SELECT id, team_id as teamId, channel_id as channelId,
             channel_name as channelName, is_active as isActive, created_at as createdAt
      FROM monitored_channels
      WHERE channel_id = ?
    `);

    return stmt.get(channelId) as MonitoredChannel | undefined || null;
  } catch (error) {
    throw new DatabaseError('Failed to get monitored channel', error);
  }
}

/**
 * Get all active monitored channels
 */
export function getAllMonitoredChannels(
  db: Database.Database
): MonitoredChannel[] {
  try {
    const stmt = db.prepare(`
      SELECT id, team_id as teamId, channel_id as channelId,
             channel_name as channelName, is_active as isActive, created_at as createdAt
      FROM monitored_channels
      WHERE is_active = 1
      ORDER BY created_at DESC
    `);

    return stmt.all() as MonitoredChannel[];
  } catch (error) {
    throw new DatabaseError('Failed to get monitored channels', error);
  }
}

/**
 * Deactivate a monitored channel
 */
export function deactivateMonitoredChannel(
  db: Database.Database,
  channelId: string
): void {
  try {
    const stmt = db.prepare(`
      UPDATE monitored_channels
      SET is_active = 0
      WHERE channel_id = ?
    `);

    stmt.run(channelId);
  } catch (error) {
    throw new DatabaseError('Failed to deactivate channel', error);
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
      INSERT INTO messages (message_id, channel_id, author, content, created_at)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(message_id) DO NOTHING
    `);

    const createdAt =
      message.createdAt instanceof Date
        ? message.createdAt.toISOString()
        : message.createdAt;

    const result = stmt.run(
      message.messageId,
      message.channelId,
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
      SELECT id, message_id as messageId, channel_id as channelId,
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
 * Get messages for a channel, optionally since a specific date
 */
export function getMessages(
  db: Database.Database,
  channelId: string,
  since?: Date
): Message[] {
  try {
    let query = `
      SELECT id, message_id as messageId, channel_id as channelId,
             author, content, created_at as createdAt, fetched_at as fetchedAt
      FROM messages
      WHERE channel_id = ?
    `;

    const params: any[] = [channelId];

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
 * Get messages for a channel within a date range
 */
export function getMessagesByDateRange(
  db: Database.Database,
  channelId: string,
  startDate: Date,
  endDate: Date
): Message[] {
  try {
    const stmt = db.prepare(`
      SELECT id, message_id as messageId, channel_id as channelId,
             author, content, created_at as createdAt, fetched_at as fetchedAt
      FROM messages
      WHERE channel_id = ?
        AND DATE(created_at) >= DATE(?)
        AND DATE(created_at) <= DATE(?)
      ORDER BY created_at ASC
    `);

    return stmt.all(
      channelId,
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
      INSERT INTO summaries (channel_id, period_start, period_end, summary_text, action_items)
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
      summary.channelId,
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
      SELECT id, channel_id as channelId, period_start as periodStart,
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
 * Get all summaries for a channel
 */
export function getSummaries(
  db: Database.Database,
  channelId: string
): Summary[] {
  try {
    const stmt = db.prepare(`
      SELECT id, channel_id as channelId, period_start as periodStart,
             period_end as periodEnd, summary_text as summaryText,
             action_items as actionItems, generated_at as generatedAt
      FROM summaries
      WHERE channel_id = ?
      ORDER BY period_start DESC, generated_at DESC
    `);

    return stmt.all(channelId) as Summary[];
  } catch (error) {
    throw new DatabaseError('Failed to get summaries', error);
  }
}

/**
 * Get the latest summary for a channel
 */
export function getLatestSummary(
  db: Database.Database,
  channelId: string
): Summary | null {
  try {
    const stmt = db.prepare(`
      SELECT id, channel_id as channelId, period_start as periodStart,
             period_end as periodEnd, summary_text as summaryText,
             action_items as actionItems, generated_at as generatedAt
      FROM summaries
      WHERE channel_id = ?
      ORDER BY period_start DESC, generated_at DESC
      LIMIT 1
    `);

    return stmt.get(channelId) as Summary | undefined || null;
  } catch (error) {
    throw new DatabaseError('Failed to get latest summary', error);
  }
}

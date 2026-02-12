import Database from 'better-sqlite3';
import {
  initializeDatabase,
  saveMonitoredChannel,
  getMonitoredChannel,
  getAllMonitoredChannels,
  deactivateMonitoredChannel,
  saveMessage,
  getMessage,
  getMessages,
  getMessagesByDateRange,
  saveSummary,
  getSummary,
  getSummaries,
  getLatestSummary,
} from '@/lib/db';
import { DatabaseError } from '@/lib/errors';

describe('Database Layer', () => {
  let db: Database.Database;

  beforeEach(() => {
    // Use in-memory database for each test
    db = new Database(':memory:');
    initializeDatabase(db);
  });

  afterEach(() => {
    db.close();
  });

  describe('initializeDatabase', () => {
    it('should create all required tables', () => {
      const tables = db
        .prepare(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name"
        )
        .all() as { name: string }[];

      const tableNames = tables.map((t) => t.name);
      expect(tableNames).toContain('monitored_channels');
      expect(tableNames).toContain('messages');
      expect(tableNames).toContain('summaries');
    });

    it('should create indexes', () => {
      const indexes = db
        .prepare("SELECT name FROM sqlite_master WHERE type='index'")
        .all() as { name: string }[];

      const indexNames = indexes.map((i) => i.name);
      expect(indexNames).toContain('idx_messages_channel_date');
      expect(indexNames).toContain('idx_summaries_date');
    });
  });

  describe('Monitored Channels', () => {
    describe('saveMonitoredChannel', () => {
      it('should save a new channel', () => {
        const channel = {
          teamId: 'team-123',
          channelId: 'channel-456',
          channelName: 'General',
        };

        const id = saveMonitoredChannel(db, channel);
        expect(id).toBeGreaterThan(0);
      });

      it('should handle duplicate channel IDs by updating', () => {
        const channel = {
          teamId: 'team-123',
          channelId: 'channel-456',
          channelName: 'General',
        };

        const id1 = saveMonitoredChannel(db, channel);
        const id2 = saveMonitoredChannel(db, {
          ...channel,
          channelName: 'Updated',
        });

        // Should update existing record
        const saved = getMonitoredChannel(db, 'channel-456');
        expect(saved?.channelName).toBe('Updated');
      });
    });

    describe('getMonitoredChannel', () => {
      it('should retrieve channel by ID', () => {
        const channel = {
          teamId: 'team-123',
          channelId: 'channel-456',
          channelName: 'General',
        };

        saveMonitoredChannel(db, channel);
        const retrieved = getMonitoredChannel(db, 'channel-456');

        expect(retrieved).toMatchObject(channel);
        expect(retrieved?.isActive).toBe(1);
      });

      it('should return null for non-existent channel', () => {
        const retrieved = getMonitoredChannel(db, 'non-existent');
        expect(retrieved).toBeNull();
      });
    });

    describe('getAllMonitoredChannels', () => {
      it('should return all active channels', () => {
        saveMonitoredChannel(db, {
          teamId: 'team-1',
          channelId: 'channel-1',
          channelName: 'General',
        });
        saveMonitoredChannel(db, {
          teamId: 'team-2',
          channelId: 'channel-2',
          channelName: 'Dev',
        });

        const channels = getAllMonitoredChannels(db);
        expect(channels).toHaveLength(2);
        expect(channels.every((c) => c.isActive === 1)).toBe(true);
      });

      it('should not return inactive channels', () => {
        saveMonitoredChannel(db, {
          teamId: 'team-1',
          channelId: 'channel-1',
          channelName: 'General',
        });
        deactivateMonitoredChannel(db, 'channel-1');

        const channels = getAllMonitoredChannels(db);
        expect(channels).toHaveLength(0);
      });
    });

    describe('deactivateMonitoredChannel', () => {
      it('should deactivate a channel', () => {
        saveMonitoredChannel(db, {
          teamId: 'team-1',
          channelId: 'channel-1',
          channelName: 'General',
        });

        deactivateMonitoredChannel(db, 'channel-1');
        const channel = getMonitoredChannel(db, 'channel-1');

        expect(channel?.isActive).toBe(0);
      });
    });
  });

  describe('Messages', () => {
    describe('saveMessage', () => {
      it('should save a new message', () => {
        const message = {
          messageId: 'msg-123',
          channelId: 'channel-456',
          author: 'John Doe',
          content: 'Hello world',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        };

        const id = saveMessage(db, message);
        expect(id).toBeGreaterThan(0);
      });

      it('should handle duplicate message IDs gracefully', () => {
        const message = {
          messageId: 'msg-123',
          channelId: 'channel-456',
          author: 'John Doe',
          content: 'Hello world',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        };

        saveMessage(db, message);

        // Try to save duplicate - should not throw, should skip
        expect(() => saveMessage(db, message)).not.toThrow();
      });
    });

    describe('getMessage', () => {
      it('should retrieve message by ID', () => {
        const message = {
          messageId: 'msg-123',
          channelId: 'channel-456',
          author: 'John Doe',
          content: 'Hello world',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        };

        saveMessage(db, message);
        const retrieved = getMessage(db, 'msg-123');

        expect(retrieved).toMatchObject({
          ...message,
          createdAt: message.createdAt.toISOString(),
        });
      });

      it('should return null for non-existent message', () => {
        const retrieved = getMessage(db, 'non-existent');
        expect(retrieved).toBeNull();
      });
    });

    describe('getMessages', () => {
      beforeEach(() => {
        // Insert test messages
        saveMessage(db, {
          messageId: 'msg-1',
          channelId: 'channel-1',
          author: 'Alice',
          content: 'Message 1',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        });
        saveMessage(db, {
          messageId: 'msg-2',
          channelId: 'channel-1',
          author: 'Bob',
          content: 'Message 2',
          createdAt: new Date('2024-01-15T11:00:00Z'),
        });
        saveMessage(db, {
          messageId: 'msg-3',
          channelId: 'channel-2',
          author: 'Charlie',
          content: 'Message 3',
          createdAt: new Date('2024-01-15T12:00:00Z'),
        });
      });

      it('should retrieve all messages for a channel', () => {
        const messages = getMessages(db, 'channel-1');
        expect(messages).toHaveLength(2);
        expect(messages.every((m) => m.channelId === 'channel-1')).toBe(true);
      });

      it('should retrieve messages since a specific date', () => {
        const messages = getMessages(db, 'channel-1', new Date('2024-01-15T10:30:00Z'));
        expect(messages).toHaveLength(1);
        expect(messages[0].messageId).toBe('msg-2');
      });

      it('should return empty array for non-existent channel', () => {
        const messages = getMessages(db, 'non-existent');
        expect(messages).toEqual([]);
      });
    });

    describe('getMessagesByDateRange', () => {
      beforeEach(() => {
        saveMessage(db, {
          messageId: 'msg-1',
          channelId: 'channel-1',
          author: 'Alice',
          content: 'Day 1',
          createdAt: new Date('2024-01-15T10:00:00Z'),
        });
        saveMessage(db, {
          messageId: 'msg-2',
          channelId: 'channel-1',
          author: 'Bob',
          content: 'Day 2',
          createdAt: new Date('2024-01-16T10:00:00Z'),
        });
        saveMessage(db, {
          messageId: 'msg-3',
          channelId: 'channel-1',
          author: 'Charlie',
          content: 'Day 3',
          createdAt: new Date('2024-01-17T10:00:00Z'),
        });
      });

      it('should retrieve messages within date range', () => {
        const messages = getMessagesByDateRange(
          db,
          'channel-1',
          new Date('2024-01-15'),
          new Date('2024-01-16')
        );

        expect(messages).toHaveLength(2);
        expect(messages.map((m) => m.messageId)).toEqual(['msg-1', 'msg-2']);
      });

      it('should handle single day range', () => {
        const messages = getMessagesByDateRange(
          db,
          'channel-1',
          new Date('2024-01-16'),
          new Date('2024-01-16')
        );

        expect(messages).toHaveLength(1);
        expect(messages[0].messageId).toBe('msg-2');
      });
    });
  });

  describe('Summaries', () => {
    describe('saveSummary', () => {
      it('should save a new summary', () => {
        const summary = {
          channelId: 'channel-1',
          periodStart: new Date('2024-01-15'),
          periodEnd: new Date('2024-01-15'),
          summaryText: 'Daily summary',
          actionItems: JSON.stringify([
            { task: 'Review PR', assignee: '@alice' },
          ]),
        };

        const id = saveSummary(db, summary);
        expect(id).toBeGreaterThan(0);
      });
    });

    describe('getSummary', () => {
      it('should retrieve summary by ID', () => {
        const summary = {
          channelId: 'channel-1',
          periodStart: new Date('2024-01-15'),
          periodEnd: new Date('2024-01-15'),
          summaryText: 'Daily summary',
          actionItems: JSON.stringify([]),
        };

        const id = saveSummary(db, summary);
        const retrieved = getSummary(db, id);

        expect(retrieved).toMatchObject({
          id,
          channelId: 'channel-1',
          summaryText: 'Daily summary',
        });
      });

      it('should return null for non-existent summary', () => {
        const retrieved = getSummary(db, 99999);
        expect(retrieved).toBeNull();
      });
    });

    describe('getSummaries', () => {
      beforeEach(() => {
        saveSummary(db, {
          channelId: 'channel-1',
          periodStart: new Date('2024-01-15'),
          periodEnd: new Date('2024-01-15'),
          summaryText: 'Summary 1',
          actionItems: '[]',
        });
        saveSummary(db, {
          channelId: 'channel-1',
          periodStart: new Date('2024-01-16'),
          periodEnd: new Date('2024-01-16'),
          summaryText: 'Summary 2',
          actionItems: '[]',
        });
        saveSummary(db, {
          channelId: 'channel-2',
          periodStart: new Date('2024-01-15'),
          periodEnd: new Date('2024-01-15'),
          summaryText: 'Summary 3',
          actionItems: '[]',
        });
      });

      it('should retrieve all summaries for a channel', () => {
        const summaries = getSummaries(db, 'channel-1');
        expect(summaries).toHaveLength(2);
        expect(summaries.every((s) => s.channelId === 'channel-1')).toBe(true);
      });

      it('should return summaries in descending order by date', () => {
        const summaries = getSummaries(db, 'channel-1');
        expect(summaries[0].summaryText).toBe('Summary 2');
        expect(summaries[1].summaryText).toBe('Summary 1');
      });
    });

    describe('getLatestSummary', () => {
      it('should return the most recent summary', () => {
        saveSummary(db, {
          channelId: 'channel-1',
          periodStart: new Date('2024-01-15'),
          periodEnd: new Date('2024-01-15'),
          summaryText: 'Old summary',
          actionItems: '[]',
        });
        saveSummary(db, {
          channelId: 'channel-1',
          periodStart: new Date('2024-01-16'),
          periodEnd: new Date('2024-01-16'),
          summaryText: 'Latest summary',
          actionItems: '[]',
        });

        const latest = getLatestSummary(db, 'channel-1');
        expect(latest?.summaryText).toBe('Latest summary');
      });

      it('should return null if no summaries exist', () => {
        const latest = getLatestSummary(db, 'non-existent');
        expect(latest).toBeNull();
      });
    });
  });
});

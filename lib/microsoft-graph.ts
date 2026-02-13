/**
 * Microsoft Graph API client with retry logic and error handling
 * Handles pagination, rate limiting, and token management
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { GraphAPIError, isRetriableError } from './errors';
import { getMockChannels, getMockMessages, isMockMode } from './mock-data';

export interface Chat {
  id: string;
  topic?: string; // Chat name (null for 1:1 chats)
  chatType: 'oneOnOne' | 'group' | 'meeting';
  members?: any[]; // Can be expanded if needed
  lastMessagePreview?: {
    createdDateTime?: string;
  };
}

export interface Message {
  id: string;
  from?: {
    user?: {
      displayName?: string;
    };
  };
  body?: {
    content?: string;
  };
  createdDateTime: string;
  lastModifiedDateTime?: string;
}

/**
 * Helper function to sleep for a given duration
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Microsoft Graph API Client
 */
export class GraphAPIClient {
  private client: any;

  constructor(accessToken: string) {
    this.client = Client.init({
      authProvider: (done) => {
        done(null, accessToken);
      },
    });
  }

  /**
   * Get chats for the user with activity in the last N days
   * @param daysBack - Number of days to look back (default: 7)
   * @param maxResults - Maximum number of chats to return (default: 50)
   */
  async getChats(daysBack: number = 7, maxResults: number = 50): Promise<Chat[]> {
    // Return mock data in development mode
    if (isMockMode()) {
      return [
        {
          id: 'chat-1',
          topic: 'Project Alpha Discussion',
          chatType: 'group',
          lastMessagePreview: { createdDateTime: new Date().toISOString() },
        },
        {
          id: 'chat-2',
          topic: null, // 1:1 chats typically don't have topics
          chatType: 'oneOnOne',
          lastMessagePreview: { createdDateTime: new Date().toISOString() },
        },
        {
          id: 'chat-3',
          topic: 'Weekly Standup',
          chatType: 'group',
          lastMessagePreview: { createdDateTime: new Date().toISOString() },
        },
      ];
    }

    try {
      // Calculate cutoff date (N days ago)
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);
      const cutoffIso = cutoffDate.toISOString();

      console.log(`[GraphAPI] Fetching chats with activity since ${cutoffDate.toLocaleDateString()} (last ${daysBack} days)`);

      // Fetch all chats (Graph API doesn't support filtering by lastUpdatedDateTime directly)
      // We'll fetch them and filter client-side
      const allChats: Chat[] = [];
      let url = '/me/chats?$expand=lastMessagePreview';
      let fetchedCount = 0;

      console.log('[GraphAPI] Calling Microsoft Graph API:', url);

      // Fetch chats with pagination
      while (url && fetchedCount < maxResults * 2) { // Fetch more than needed to account for filtering
        const response = await this.client.api(url).get();
        allChats.push(...response.value);
        fetchedCount += response.value.length;
        url = response['@odata.nextLink'];

        // Stop early if we have enough recent chats
        const recentChats = allChats.filter(chat => {
          const lastActivity = chat.lastMessagePreview?.createdDateTime;
          return lastActivity && new Date(lastActivity) >= cutoffDate;
        });

        if (recentChats.length >= maxResults) {
          break;
        }
      }

      // Filter chats by recent activity
      const recentChats = allChats
        .filter(chat => {
          const lastActivity = chat.lastMessagePreview?.createdDateTime;
          return lastActivity && new Date(lastActivity) >= cutoffDate;
        })
        .sort((a, b) => {
          // Sort by most recent first
          const dateA = a.lastMessagePreview?.createdDateTime || '';
          const dateB = b.lastMessagePreview?.createdDateTime || '';
          return dateB.localeCompare(dateA);
        })
        .slice(0, maxResults); // Limit to maxResults

      console.log(`[GraphAPI] Fetched ${allChats.length} total chats, filtered to ${recentChats.length} with activity in last ${daysBack} days`);
      return recentChats;
    } catch (error: any) {
      console.error('[GraphAPI] Error fetching chats:', {
        message: error.message,
        statusCode: error.statusCode,
        code: error.code,
        body: error.body,
      });
      throw new GraphAPIError('Failed to fetch chats', error);
    }
  }

  /**
   * Get messages from a chat with retry logic and pagination
   * @param chatId - The chat ID
   * @param since - Optional date to fetch messages since
   */
  async getChatMessages(
    chatId: string,
    since?: Date
  ): Promise<Message[]> {
    // Return mock data in development mode
    if (isMockMode()) {
      const mockMessagesData = getMockMessages(chatId);
      let messages = mockMessagesData.value;

      // Filter by date if provided
      if (since) {
        messages = messages.filter(
          (msg: any) => new Date(msg.createdDateTime) > since
        );
      }

      return messages as Message[];
    }

    return this.retryWithBackoff(async () => {
      const messages: Message[] = [];
      let url = `/chats/${chatId}/messages`;

      // Add filter for incremental fetching
      if (since) {
        const filter = `lastModifiedDateTime gt ${since.toISOString()}`;
        url += `?$filter=${encodeURIComponent(filter)}`;
      }

      while (url) {
        const response = await this.client.api(url).get();
        messages.push(...response.value);
        url = response['@odata.nextLink'];
      }

      return messages;
    });
  }

  /**
   * Retry a function with exponential backoff
   * Retries on 429 (rate limit), 500, and 503 errors
   */
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxAttempts: number = 3
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Check if error is retriable
        const statusCode = error.statusCode || error.code;
        const isRetriable = statusCode === 429 || statusCode === 500 || statusCode === 503;

        if (!isRetriable || attempt === maxAttempts - 1) {
          // Don't retry on non-retriable errors or last attempt
          break;
        }

        // Exponential backoff: 1s, 2s, 4s
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
      }
    }

    // All retries failed
    throw new GraphAPIError(
      'Failed after multiple retry attempts',
      {
        originalError: lastError,
        attempts: maxAttempts,
      }
    );
  }
}

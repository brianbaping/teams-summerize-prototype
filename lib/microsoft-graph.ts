/**
 * Microsoft Graph API client with retry logic and error handling
 * Handles pagination, rate limiting, and token management
 */

import { Client } from '@microsoft/microsoft-graph-client';
import { GraphAPIError, isRetriableError } from './errors';
import { getMockChannels, getMockMessages, isMockMode } from './mock-data';

export interface Team {
  id: string;
  displayName: string;
  description?: string;
}

export interface Channel {
  id: string;
  displayName: string;
  description?: string;
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
   * Get all teams the user has joined
   */
  async getJoinedTeams(): Promise<Team[]> {
    // Return mock data in development mode
    if (isMockMode()) {
      return [
        { id: 'team-1', displayName: 'Development Team', description: 'Engineering team' },
        { id: 'team-2', displayName: 'Agile Team', description: 'Sprint planning and retrospectives' },
      ];
    }

    try {
      const teams: Team[] = [];
      let url = '/me/joinedTeams';

      while (url) {
        const response = await this.client.api(url).get();
        teams.push(...response.value);
        url = response['@odata.nextLink'];
      }

      return teams;
    } catch (error) {
      throw new GraphAPIError('Failed to fetch joined teams', error);
    }
  }

  /**
   * Get channels in a team
   */
  async getChannels(teamId: string): Promise<Channel[]> {
    // Return mock data in development mode
    if (isMockMode()) {
      const mockChannelsData = getMockChannels();
      return mockChannelsData.value.filter((ch: any) => ch.teamId === teamId);
    }

    try {
      const channels: Channel[] = [];
      let url = `/teams/${teamId}/channels`;

      while (url) {
        const response = await this.client.api(url).get();
        channels.push(...response.value);
        url = response['@odata.nextLink'];
      }

      return channels;
    } catch (error) {
      throw new GraphAPIError(`Failed to fetch channels for team ${teamId}`, error);
    }
  }

  /**
   * Get messages from a channel with retry logic and pagination
   * @param teamId - The team ID
   * @param channelId - The channel ID
   * @param since - Optional date to fetch messages since
   */
  async getChannelMessages(
    teamId: string,
    channelId: string,
    since?: Date
  ): Promise<Message[]> {
    // Return mock data in development mode
    if (isMockMode()) {
      const mockMessagesData = getMockMessages(channelId);
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
      let url = `/teams/${teamId}/channels/${channelId}/messages`;

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

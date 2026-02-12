import { GraphAPIClient } from '@/lib/microsoft-graph';
import { GraphAPIError } from '@/lib/errors';

// Mock the Graph client
jest.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    init: jest.fn(),
  },
}));

describe('Microsoft Graph API Client', () => {
  let client: GraphAPIClient;
  let mockApi: jest.Mock;
  let mockGet: jest.Mock;

  beforeEach(() => {
    mockGet = jest.fn();
    mockApi = jest.fn(() => ({ get: mockGet }));

    const { Client } = require('@microsoft/microsoft-graph-client');
    Client.init.mockReturnValue({ api: mockApi });

    client = new GraphAPIClient('mock-access-token');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getJoinedTeams', () => {
    it('should fetch and return user teams', async () => {
      const mockTeams = {
        value: [
          { id: 'team-1', displayName: 'Engineering' },
          { id: 'team-2', displayName: 'Product' },
        ],
      };

      mockGet.mockResolvedValue(mockTeams);

      const teams = await client.getJoinedTeams();

      expect(mockApi).toHaveBeenCalledWith('/me/joinedTeams');
      expect(teams).toEqual(mockTeams.value);
    });

    it('should handle pagination', async () => {
      const page1 = {
        value: [{ id: 'team-1', displayName: 'Team 1' }],
        '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/joinedTeams?$skip=1',
      };

      const page2 = {
        value: [{ id: 'team-2', displayName: 'Team 2' }],
      };

      mockGet.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

      const teams = await client.getJoinedTeams();

      expect(mockApi).toHaveBeenCalledTimes(2);
      expect(teams).toHaveLength(2);
      expect(teams).toEqual([...page1.value, ...page2.value]);
    });

    it('should throw GraphAPIError on failure', async () => {
      mockGet.mockRejectedValue(new Error('Network error'));

      await expect(client.getJoinedTeams()).rejects.toThrow(GraphAPIError);
    });
  });

  describe('getChannels', () => {
    it('should fetch channels for a team', async () => {
      const mockChannels = {
        value: [
          { id: 'channel-1', displayName: 'General' },
          { id: 'channel-2', displayName: 'Dev' },
        ],
      };

      mockGet.mockResolvedValue(mockChannels);

      const channels = await client.getChannels('team-123');

      expect(mockApi).toHaveBeenCalledWith('/teams/team-123/channels');
      expect(channels).toEqual(mockChannels.value);
    });
  });

  describe('getChannelMessages', () => {
    it('should fetch messages from a channel', async () => {
      const mockMessages = {
        value: [
          {
            id: 'msg-1',
            from: { user: { displayName: 'Alice' } },
            body: { content: 'Hello' },
            createdDateTime: '2024-01-15T10:00:00Z',
          },
        ],
      };

      mockGet.mockResolvedValue(mockMessages);

      const messages = await client.getChannelMessages('team-123', 'channel-456');

      expect(mockApi).toHaveBeenCalledWith('/teams/team-123/channels/channel-456/messages');
      expect(messages).toEqual(mockMessages.value);
    });

    it('should handle pagination for messages', async () => {
      const page1 = {
        value: [{ id: 'msg-1', body: { content: 'Message 1' } }],
        '@odata.nextLink': 'https://graph.microsoft.com/v1.0/...',
      };

      const page2 = {
        value: [{ id: 'msg-2', body: { content: 'Message 2' } }],
      };

      mockGet.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);

      const messages = await client.getChannelMessages('team-123', 'channel-456');

      expect(messages).toHaveLength(2);
    });

    it('should fetch messages since a specific date', async () => {
      const mockMessages = { value: [] };
      mockGet.mockResolvedValue(mockMessages);

      const sinceDate = new Date('2024-01-15T00:00:00Z');
      await client.getChannelMessages('team-123', 'channel-456', sinceDate);

      // Check that the API was called with a filter parameter
      const callArg = mockApi.mock.calls[0][0];
      expect(callArg).toContain('$filter=');
      expect(callArg).toContain('lastModifiedDateTime');
    });

    it('should retry on 429 rate limit', async () => {
      const error429 = new Error('Rate limited');
      (error429 as any).statusCode = 429;

      mockGet
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ value: [] });

      const messages = await client.getChannelMessages('team-123', 'channel-456');

      expect(mockGet).toHaveBeenCalledTimes(2);
      expect(messages).toEqual([]);
    });

    it('should retry on 500 server error', async () => {
      const error500 = new Error('Server error');
      (error500 as any).statusCode = 500;

      mockGet
        .mockRejectedValueOnce(error500)
        .mockResolvedValueOnce({ value: [] });

      const messages = await client.getChannelMessages('team-123', 'channel-456');

      expect(mockGet).toHaveBeenCalledTimes(2);
    });

    it('should not retry on 400 client error', async () => {
      const error400 = new Error('Bad request');
      (error400 as any).statusCode = 400;

      mockGet.mockRejectedValue(error400);

      await expect(
        client.getChannelMessages('team-123', 'channel-456')
      ).rejects.toThrow(GraphAPIError);

      expect(mockGet).toHaveBeenCalledTimes(1);
    });

    it('should implement exponential backoff', async () => {
      const error429 = new Error('Rate limited');
      (error429 as any).statusCode = 429;

      mockGet
        .mockRejectedValueOnce(error429)
        .mockRejectedValueOnce(error429)
        .mockResolvedValueOnce({ value: [] });

      const startTime = Date.now();
      await client.getChannelMessages('team-123', 'channel-456');
      const duration = Date.now() - startTime;

      // Should have delayed at least 1s + 2s = 3s total
      expect(duration).toBeGreaterThanOrEqual(2900);
      expect(mockGet).toHaveBeenCalledTimes(3);
    });
  });
});

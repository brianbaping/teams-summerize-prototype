/**
 * Mock data for development without Azure AD access
 * This file provides sample Teams channels and messages for testing
 */

export const mockUser = {
  id: 'mock-user-123',
  email: 'developer@example.com',
  name: 'Mock Developer',
  image: null,
};

export const mockChannels = [
  {
    id: 'channel-1',
    displayName: 'Engineering Team',
    description: 'Main engineering discussion channel',
    teamId: 'team-1',
    teamName: 'Development Team',
  },
  {
    id: 'channel-2',
    displayName: 'Product Planning',
    description: 'Product roadmap and feature discussions',
    teamId: 'team-1',
    teamName: 'Development Team',
  },
  {
    id: 'channel-3',
    displayName: 'Sprint Retrospective',
    description: 'Weekly sprint reviews and retrospectives',
    teamId: 'team-2',
    teamName: 'Agile Team',
  },
];

export const mockMessages = [
  {
    id: 'msg-1',
    channelId: 'channel-1',
    createdDateTime: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    from: {
      user: {
        id: 'user-1',
        displayName: 'Alice Johnson',
        userIdentityType: 'aadUser',
      },
    },
    body: {
      content: 'Hey team, I finished implementing the new authentication flow. Ready for review!',
      contentType: 'text',
    },
    mentions: [],
  },
  {
    id: 'msg-2',
    channelId: 'channel-1',
    createdDateTime: new Date(Date.now() - 1.5 * 60 * 60 * 1000).toISOString(), // 1.5 hours ago
    from: {
      user: {
        id: 'user-2',
        displayName: 'Bob Smith',
        userIdentityType: 'aadUser',
      },
    },
    body: {
      content: 'Great work @Alice! I\'ll take a look this afternoon. Did you update the documentation?',
      contentType: 'text',
    },
    mentions: [
      {
        id: 0,
        mentionText: 'Alice',
        mentioned: {
          user: {
            id: 'user-1',
            displayName: 'Alice Johnson',
          },
        },
      },
    ],
  },
  {
    id: 'msg-3',
    channelId: 'channel-1',
    createdDateTime: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(), // 1 hour ago
    from: {
      user: {
        id: 'user-1',
        displayName: 'Alice Johnson',
        userIdentityType: 'aadUser',
      },
    },
    body: {
      content: 'Yes! Added setup instructions and API documentation. Check out the README.',
      contentType: 'text',
    },
    mentions: [],
  },
  {
    id: 'msg-4',
    channelId: 'channel-1',
    createdDateTime: new Date(Date.now() - 45 * 60 * 1000).toISOString(), // 45 min ago
    from: {
      user: {
        id: 'user-3',
        displayName: 'Carol White',
        userIdentityType: 'aadUser',
      },
    },
    body: {
      content: 'Quick question - are we still on track for the Friday deployment?',
      contentType: 'text',
    },
    mentions: [],
  },
  {
    id: 'msg-5',
    channelId: 'channel-1',
    createdDateTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(), // 30 min ago
    from: {
      user: {
        id: 'user-2',
        displayName: 'Bob Smith',
        userIdentityType: 'aadUser',
      },
    },
    body: {
      content: '@Carol Yes, all tests are passing. We should be good to go!',
      contentType: 'text',
    },
    mentions: [
      {
        id: 0,
        mentionText: 'Carol',
        mentioned: {
          user: {
            id: 'user-3',
            displayName: 'Carol White',
          },
        },
      },
    ],
  },
  {
    id: 'msg-6',
    channelId: 'channel-2',
    createdDateTime: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
    from: {
      user: {
        id: 'user-4',
        displayName: 'David Chen',
        userIdentityType: 'aadUser',
      },
    },
    body: {
      content: 'Reviewed the Q2 roadmap. I think we should prioritize the mobile app features.',
      contentType: 'text',
    },
    mentions: [],
  },
  {
    id: 'msg-7',
    channelId: 'channel-2',
    createdDateTime: new Date(Date.now() - 2.5 * 60 * 60 * 1000).toISOString(),
    from: {
      user: {
        id: 'user-5',
        displayName: 'Emma Davis',
        userIdentityType: 'aadUser',
      },
    },
    body: {
      content: 'Agreed. Customer feedback has been requesting offline mode. That should be a blocker.',
      contentType: 'text',
    },
    mentions: [],
  },
  {
    id: 'msg-8',
    channelId: 'channel-3',
    createdDateTime: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    from: {
      user: {
        id: 'user-2',
        displayName: 'Bob Smith',
        userIdentityType: 'aadUser',
      },
    },
    body: {
      content: 'Sprint 12 retrospective: What went well - great team collaboration. What to improve - need better estimation.',
      contentType: 'text',
    },
    mentions: [],
  },
];

/**
 * Get mock channels (simulates Microsoft Graph API response)
 */
export function getMockChannels() {
  return { value: mockChannels };
}

/**
 * Get mock messages for a channel (simulates Microsoft Graph API response)
 */
export function getMockMessages(channelId: string) {
  const messages = mockMessages.filter((msg) => msg.channelId === channelId);
  return { value: messages };
}

/**
 * Check if mock mode is enabled
 */
export function isMockMode() {
  return process.env.USE_MOCK_AUTH === 'true' || process.env.USE_MOCK_DATA === 'true';
}

'use client';

import { useState, useEffect } from 'react';

interface Message {
  id: number;
  messageId: string;
  channelId: string;
  author?: string;
  content?: string;
  createdAt: string;
  fetchedAt?: string;
}

interface MonitoredChannel {
  id: number;
  channelId: string;
  channelName: string;
  teamId: string;
}

export default function MessageViewer() {
  const [channels, setChannels] = useState<MonitoredChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessageCount, setNewMessageCount] = useState(0);

  // Fetch monitored channels on mount
  useEffect(() => {
    fetchMonitoredChannels();
  }, []);

  // Fetch messages when channel is selected
  useEffect(() => {
    if (selectedChannel) {
      fetchMessages(selectedChannel);
    }
  }, [selectedChannel]);

  const fetchMonitoredChannels = async () => {
    try {
      const response = await fetch('/api/channels');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch channels');
      }

      const monitored = data.data.monitored || [];
      setChannels(monitored);

      // Auto-select first channel if available
      if (monitored.length > 0 && !selectedChannel) {
        setSelectedChannel(monitored[0].channelId);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchMessages = async (channelId: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/messages?channelId=${channelId}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch messages');
      }

      setMessages(data.data.messages || []);
      setNewMessageCount(data.data.newMessageCount || 0);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshMessages = () => {
    if (selectedChannel) {
      fetchMessages(selectedChannel);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);

    if (hours < 1) {
      const minutes = Math.floor(diff / (1000 * 60));
      return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
    } else if (hours < 24) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
    } else if (days < 7) {
      return `${days} day${days !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
      });
    }
  };

  const stripHtml = (html: string) => {
    // Simple HTML tag removal for display
    return html.replace(/<[^>]*>/g, '');
  };

  if (channels.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Message Viewer</h2>
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-blue-800">
            No channels are being monitored yet. Add a channel above to view messages.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Message Viewer</h2>
        <button
          onClick={refreshMessages}
          disabled={loading || !selectedChannel}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded"
        >
          {loading ? 'Refreshing...' : 'Refresh Messages'}
        </button>
      </div>

      {/* Channel Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Channel
        </label>
        <select
          value={selectedChannel || ''}
          onChange={(e) => setSelectedChannel(e.target.value)}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {channels.map((channel) => (
            <option key={channel.channelId} value={channel.channelId}>
              {channel.channelName}
            </option>
          ))}
        </select>
      </div>

      {/* New Messages Alert */}
      {newMessageCount > 0 && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800">
            ✓ Fetched {newMessageCount} new message{newMessageCount !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Messages List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading messages...</p>
        </div>
      ) : messages.length > 0 ? (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 mb-2">
            Showing {messages.length} message{messages.length !== 1 ? 's' : ''}
          </div>
          {messages.map((message) => (
            <div
              key={message.id}
              className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white font-semibold">
                    {(message.author || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">
                      {message.author || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {formatDate(message.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="ml-10">
                <p className="text-gray-800 whitespace-pre-wrap">
                  {message.content ? stripHtml(message.content) : '(No content)'}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">No messages found for this channel.</p>
        </div>
      )}
    </div>
  );
}

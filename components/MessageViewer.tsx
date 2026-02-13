'use client';

import { useState, useEffect, useRef } from 'react';
import { useProvider } from '@/contexts/ProviderContext';

interface Message {
  id: number;
  messageId: string;
  chatId: string;
  author?: string;
  content?: string;
  createdAt: string;
  fetchedAt?: string;
}

interface MonitoredChat {
  id: number;
  chatId: string;
  chatName?: string;
  chatType?: string;
}

interface ParsedSummary {
  overview: string;
  decisions: string;
  actionItems: string;
  blockers: string;
  resources: string;
}

interface SummaryResult {
  id: number;
  summary: string;
  parsed: ParsedSummary;
  messageCount: number;
}

export default function MessageViewer() {
  const { provider } = useProvider();
  const [chats, setChats] = useState<MonitoredChat[]>([]);
  const [selectedChat, setSelectedChat] = useState<string | null>(null);
  const selectedChatRef = useRef<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newMessageCount, setNewMessageCount] = useState(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync ref with state
  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  // Date range filtering - default to last 3 days
  const getDefaultStartDate = () => {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    return date.toISOString().split('T')[0];
  };

  const getDefaultEndDate = () => {
    return new Date().toISOString().split('T')[0];
  };

  const [startDate, setStartDate] = useState<string>(getDefaultStartDate());
  const [endDate, setEndDate] = useState<string>(getDefaultEndDate());

  // Summary generation
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);

  // Fetch monitored chats on mount and periodically
  useEffect(() => {
    fetchMonitoredChats();

    // Refresh monitored chats list every 3 seconds
    const interval = setInterval(() => {
      fetchMonitoredChats();
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  // Fetch messages when chat or date range changes
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat);
    }
  }, [selectedChat, startDate, endDate]);

  const fetchMonitoredChats = async () => {
    try {
      const response = await fetch('/api/chats');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch chats');
      }

      const monitored = data.data.monitored || [];
      setChats(monitored);

      // Auto-select first chat only if:
      // 1. We have chats, AND
      // 2. No chat is currently selected OR the selected chat is no longer in the list
      if (monitored.length > 0) {
        const currentSelection = selectedChatRef.current;
        const currentChatStillExists = currentSelection && monitored.some(c => c.chatId === currentSelection);
        if (!currentChatStillExists) {
          setSelectedChat(monitored[0].chatId);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const fetchMessages = async (chatId: string) => {
    try {
      setLoading(true);
      setError(null);

      // Pass startDate as 'since' to filter at Graph API level
      const sinceParam = startDate ? `&since=${new Date(startDate).toISOString()}` : '';
      const response = await fetch(`/api/messages?chatId=${chatId}${sinceParam}`);
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
    if (selectedChat) {
      fetchMessages(selectedChat);
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

  // Client-side date range filtering
  const getFilteredMessages = () => {
    if (!startDate || !endDate) return messages;

    // Create date objects with explicit time boundaries
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T23:59:59');

    console.log('[MessageViewer] Filtering messages:', {
      totalMessages: messages.length,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });

    const filtered = messages.filter(msg => {
      const msgDate = new Date(msg.createdAt);
      const isInRange = msgDate >= start && msgDate <= end;
      return isInRange;
    });

    console.log('[MessageViewer] Filtered to', filtered.length, 'messages');
    return filtered;
  };

  const filteredMessages = getFilteredMessages();

  // Generate summary for filtered messages
  const generateSummary = async () => {
    if (!selectedChat) {
      setSummaryError('Please select a chat');
      return;
    }

    if (filteredMessages.length === 0) {
      setSummaryError('No messages in selected date range to summarize');
      return;
    }

    try {
      setSummaryLoading(true);
      setSummaryError(null);
      setSummary(null);

      // Use the filtered date range
      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chatId: selectedChat,
          startDate: startDate,
          endDate: endDate,
          provider,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to generate summary');
      }

      setSummary(data.data);
    } catch (err: any) {
      setSummaryError(err.message);
    } finally {
      setSummaryLoading(false);
    }
  };

  if (chats.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Message Viewer</h2>
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-blue-800">
            No chats are being monitored yet. Add a chat above to view messages.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Message Viewer</h2>
          <span className={`px-2 py-1 text-xs font-semibold rounded ${
            provider === 'claude'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-purple-100 text-purple-800'
          }`}>
            {provider === 'claude' ? 'Claude' : 'Ollama'}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={refreshMessages}
            disabled={loading || !selectedChat || isCollapsed}
            className="px-3 py-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium rounded"
          >
            {loading ? 'Refreshing...' : 'Refresh'}
          </button>
          <button
            onClick={generateSummary}
            disabled={summaryLoading || !selectedChat || filteredMessages.length === 0 || isCollapsed}
            className="px-3 py-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white text-sm font-medium rounded"
          >
            {summaryLoading ? 'Generating...' : '✨ Summarize'}
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-500 hover:text-gray-700 text-sm font-medium"
          >
            {isCollapsed ? '+ Expand' : '− Collapse'}
          </button>
        </div>
      </div>

      {isCollapsed ? (
        <div className="text-sm text-gray-500">
          {messages.length > 0 ? `${messages.length} message${messages.length !== 1 ? 's' : ''}` : 'No messages loaded'}
        </div>
      ) : (
        <>

      {/* Chat Selector and Date Range */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Chat
          </label>
          <select
            value={selectedChat || ''}
            onChange={(e) => setSelectedChat(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {chats.map((chat) => (
              <option key={chat.chatId} value={chat.chatId}>
                {chat.chatName || 'Chat'}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* New Messages Alert */}
      {newMessageCount > 0 && (
        <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
          <p className="text-sm text-green-800">
            ✓ Fetched {newMessageCount} new message{newMessageCount !== 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Summary Error */}
      {summaryError && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">Summary Error: {summaryError}</p>
        </div>
      )}

      {/* Summary Display */}
      {summary && (
        <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-purple-900">AI Summary</h3>
            <button
              onClick={() => setSummary(null)}
              className="text-xs text-purple-600 hover:text-purple-800"
            >
              ✕ Close
            </button>
          </div>

          {summary.parsed ? (
            <div className="space-y-3 text-sm">
              {summary.parsed.overview && (
                <div>
                  <h4 className="font-semibold text-purple-800 mb-1">📋 Overview</h4>
                  <p className="text-gray-800">{summary.parsed.overview}</p>
                </div>
              )}

              {summary.parsed.decisions && (
                <div>
                  <h4 className="font-semibold text-purple-800 mb-1">✅ Key Decisions</h4>
                  <p className="text-gray-800">{summary.parsed.decisions}</p>
                </div>
              )}

              {summary.parsed.actionItems && (
                <div>
                  <h4 className="font-semibold text-purple-800 mb-1">🎯 Action Items</h4>
                  <p className="text-gray-800">{summary.parsed.actionItems}</p>
                </div>
              )}

              {summary.parsed.blockers && (
                <div>
                  <h4 className="font-semibold text-purple-800 mb-1">🚧 Blockers</h4>
                  <p className="text-gray-800">{summary.parsed.blockers}</p>
                </div>
              )}

              {summary.parsed.resources && (
                <div>
                  <h4 className="font-semibold text-purple-800 mb-1">🔗 Resources</h4>
                  <p className="text-gray-800">{summary.parsed.resources}</p>
                </div>
              )}

              <div className="text-xs text-purple-600 pt-2 border-t border-purple-200">
                Summarized {summary.messageCount} messages from {startDate} to {endDate}
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-800">
              <pre className="whitespace-pre-wrap font-sans">{summary.summary}</pre>
            </div>
          )}
        </div>
      )}

      {/* Messages List */}
      {loading ? (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading messages...</p>
        </div>
      ) : filteredMessages.length > 0 ? (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 mb-2">
            Showing {filteredMessages.length} of {messages.length} message{messages.length !== 1 ? 's' : ''}
            {filteredMessages.length !== messages.length && (
              <span className="text-blue-600 ml-1">(filtered by date)</span>
            )}
          </div>
          {filteredMessages.map((message) => (
            <div
              key={message.id}
              className="border border-gray-200 rounded p-2 hover:bg-gray-50"
            >
              <div className="flex items-start space-x-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-semibold flex-shrink-0">
                  {(message.author || 'U')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between mb-1">
                    <p className="font-semibold text-sm text-gray-900 truncate">
                      {message.author || 'Unknown User'}
                    </p>
                    <p className="text-xs text-gray-500 ml-2 flex-shrink-0">
                      {formatDate(message.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                    {message.content ? stripHtml(message.content) : '(No content)'}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : messages.length > 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-600">No messages in selected date range.</p>
          <p className="text-sm text-gray-500 mt-2">
            Try adjusting the date range above.
          </p>
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">No messages found for this chat.</p>
        </div>
      )}
      </>
      )}
    </div>
  );
}

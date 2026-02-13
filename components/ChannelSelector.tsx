'use client';

import { useState, useEffect } from 'react';

interface Chat {
  id: string;
  topic?: string;
  chatType: 'oneOnOne' | 'group' | 'meeting';
}

interface MonitoredChat {
  id: number;
  chatId: string;
  chatName?: string;
  chatType?: string;
  status?: string;
}

export default function ChannelSelector() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [monitored, setMonitored] = useState<MonitoredChat[]>([]);
  const [ignored, setIgnored] = useState<MonitoredChat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showIgnored, setShowIgnored] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [daysBack, setDaysBack] = useState(7);

  // Fetch chats on mount
  useEffect(() => {
    fetchChats();
  }, []);

  const fetchChats = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chats?daysBack=${daysBack}`);
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch chats');
      }

      setChats(data.data.chats || []);
      setMonitored(data.data.monitored || []);
      setIgnored(data.data.ignored || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addChat = async (chatId: string, chatName: string, chatType: string, status: string = 'active') => {
    try {
      const response = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId, chatName, chatType, status }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to add chat');
      }

      // Refresh the list
      await fetchChats();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const ignoreChat = async (chatId: string, chatName: string, chatType: string) => {
    await addChat(chatId, chatName, chatType, 'ignored');
  };

  const removeChat = async (chatId: string) => {
    try {
      const response = await fetch(`/api/chats?chatId=${chatId}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to remove chat');
      }

      // Refresh the list
      await fetchChats();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const restoreIgnoredChat = async (chatId: string) => {
    // Same as remove - deletes the record so chat appears in available list again
    await removeChat(chatId);
  };

  const isMonitored = (chatId: string) => {
    return monitored.some((m) => m.chatId === chatId);
  };

  const isIgnored = (chatId: string) => {
    return ignored.some((m) => m.chatId === chatId);
  };

  const getChatDisplayName = (chat: Chat) => {
    return chat.topic || `${chat.chatType === 'oneOnOne' ? '1:1 Chat' : 'Group Chat'}`;
  };

  if (loading) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Chat Selector</h2>
        <p className="text-gray-600">Loading chats...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Chat Selector</h2>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={fetchChats}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Select Chats to Monitor</h2>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          {isCollapsed ? '+ Expand' : '− Collapse'}
        </button>
      </div>

      {isCollapsed ? (
        <div className="text-sm text-gray-500">
          {monitored.length > 0 ? `Monitoring ${monitored.length} chat${monitored.length !== 1 ? 's' : ''}` : 'No chats monitored'}
          {ignored.length > 0 && <span className="ml-2 text-gray-400">({ignored.length} ignored)</span>}
        </div>
      ) : (
        <>

      {/* Monitored Chats Summary - Compact */}
      {monitored.length > 0 ? (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded">
          <h3 className="font-semibold text-green-800 text-sm mb-2">
            ✓ Monitoring {monitored.length} Chat{monitored.length !== 1 ? 's' : ''}
          </h3>
          <div className="flex flex-wrap gap-2">
            {monitored.map((m) => (
              <span key={m.id} className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs rounded group">
                {m.chatName || 'Chat'}
                <button
                  onClick={() => removeChat(m.chatId)}
                  className="ml-1 text-green-600 hover:text-red-600 opacity-70 group-hover:opacity-100"
                  title="Stop monitoring"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <p className="text-sm text-blue-800">
            Select chats below to start monitoring
          </p>
        </div>
      )}

      {/* Ignored Chats - Collapsible Section */}
      {ignored.length > 0 && (
        <div className="mb-4">
          <button
            onClick={() => setShowIgnored(!showIgnored)}
            className="text-sm text-gray-600 hover:text-gray-800 underline mb-2"
          >
            {showIgnored ? '− Hide' : '+ Show'} ignored chats ({ignored.length})
          </button>
          {showIgnored && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded">
              <div className="flex flex-wrap gap-2">
                {ignored.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded group">
                    {m.chatName || 'Chat'}
                    <button
                      onClick={() => restoreIgnoredChat(m.chatId)}
                      className="ml-1 text-gray-500 hover:text-green-600 opacity-70 group-hover:opacity-100"
                      title="Restore to available list"
                    >
                      ↺
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Advanced Options - Hidden by Default */}
      <div className="mb-3">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-sm text-blue-600 hover:text-blue-800 underline"
        >
          {showAdvanced ? '− Hide' : '+ Show'} advanced options
        </button>
        {showAdvanced && (
          <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Days to look back (default: 7)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="90"
                value={daysBack}
                onChange={(e) => setDaysBack(parseInt(e.target.value) || 7)}
                className="w-24 border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={fetchChats}
                className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded"
              >
                Refresh Chats
              </button>
              <span className="text-xs text-gray-600">
                (Higher values = slower, more chats)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Available Chats - Compact List with Add/Ignore */}
      {chats.length > 0 ? (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Available Chats ({chats.filter(c => !isMonitored(c.id) && !isIgnored(c.id)).length} from last {daysBack} days)
          </label>
          <div className="max-h-60 overflow-y-auto border border-gray-200 rounded">
            {chats
              .filter(chat => !isMonitored(chat.id) && !isIgnored(chat.id))
              .map((chat) => {
                const displayName = getChatDisplayName(chat);
                const typeLabel = chat.chatType === 'oneOnOne' ? '1:1' : chat.chatType === 'group' ? 'Group' : 'Meeting';
                return (
                  <div
                    key={chat.id}
                    className="flex items-center justify-between p-2 border-b border-gray-100 hover:bg-gray-50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{displayName}</p>
                      <p className="text-xs text-gray-500">{typeLabel}</p>
                    </div>
                    <div className="flex gap-1 ml-2">
                      <button
                        onClick={() => addChat(chat.id, displayName, chat.chatType)}
                        className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded"
                        title="Add to monitoring"
                      >
                        + Add
                      </button>
                      <button
                        onClick={() => ignoreChat(chat.id, displayName, chat.chatType)}
                        className="px-2 py-1 bg-gray-400 hover:bg-gray-500 text-white text-xs font-medium rounded"
                        title="Ignore this chat"
                      >
                        ✕ Ignore
                      </button>
                    </div>
                  </div>
                );
              })}
            {chats.filter(c => !isMonitored(c.id) && !isIgnored(c.id)).length === 0 && (
              <div className="p-4 text-center text-sm text-gray-500">
                No new chats to add
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-500">No recent chats found (last 7 days)</p>
      )}
      </>
      )}
    </div>
  );
}

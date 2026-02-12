'use client';

import { useState, useEffect } from 'react';

interface MonitoredChannel {
  id: number;
  channelId: string;
  channelName: string;
  teamId: string;
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

export default function SummarizePanel() {
  const [channels, setChannels] = useState<MonitoredChannel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    // Default to today
    return new Date().toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<SummaryResult | null>(null);

  // Fetch monitored channels on mount
  useEffect(() => {
    fetchMonitoredChannels();
  }, []);

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

  const generateSummary = async () => {
    if (!selectedChannel) {
      setError('Please select a channel');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSummary(null);

      const response = await fetch('/api/summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channelId: selectedChannel,
          date: selectedDate,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to generate summary');
      }

      setSummary(data.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (channels.length === 0) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">AI Summarization</h2>
        <div className="bg-blue-50 border border-blue-200 rounded p-4">
          <p className="text-blue-800">
            No channels are being monitored yet. Add a channel above to generate summaries.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">AI Summarization</h2>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600">Powered by</span>
          <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-semibold rounded">
            Ollama (llama3)
          </span>
        </div>
      </div>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        {/* Channel Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Channel
          </label>
          <select
            value={selectedChannel || ''}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {channels.map((channel) => (
              <option key={channel.channelId} value={channel.channelId}>
                {channel.channelName}
              </option>
            ))}
          </select>
        </div>

        {/* Date Picker */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {/* Generate Button */}
        <div className="flex items-end">
          <button
            onClick={generateSummary}
            disabled={loading || !selectedChannel}
            className="w-full px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold rounded"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                    fill="none"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                Generating...
              </span>
            ) : (
              'Generate Summary'
            )}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Summary Display */}
      {summary && (
        <div className="space-y-4 mt-6">
          <div className="p-4 bg-purple-50 border border-purple-200 rounded">
            <p className="text-sm text-purple-800">
              ✓ Summary generated from {summary.messageCount} message
              {summary.messageCount !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Check if parsing worked */}
          {summary.parsed.overview || summary.parsed.decisions || summary.parsed.actionItems || summary.parsed.blockers || summary.parsed.resources ? (
            <>
              {/* Overview */}
              {summary.parsed.overview && (
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-2">📋 Overview</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {summary.parsed.overview}
                  </p>
                </div>
              )}

              {/* Key Decisions */}
              {summary.parsed.decisions && (
                <div className="border-l-4 border-green-500 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-2">✅ Key Decisions</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {summary.parsed.decisions}
                  </p>
                </div>
              )}

              {/* Action Items */}
              {summary.parsed.actionItems && (
                <div className="border-l-4 border-orange-500 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-2">🎯 Action Items</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {summary.parsed.actionItems}
                  </p>
                </div>
              )}

              {/* Blockers */}
              {summary.parsed.blockers && (
                <div className="border-l-4 border-red-500 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-2">🚧 Blockers</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {summary.parsed.blockers}
                  </p>
                </div>
              )}

              {/* Resources */}
              {summary.parsed.resources && (
                <div className="border-l-4 border-purple-500 pl-4">
                  <h3 className="font-semibold text-gray-900 mb-2">🔗 Resources</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">
                    {summary.parsed.resources}
                  </p>
                </div>
              )}

              {/* Raw Summary (collapsible) */}
              <details className="mt-4">
                <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-900">
                  Show raw summary
                </summary>
                <pre className="mt-2 p-4 bg-gray-50 rounded text-xs overflow-x-auto whitespace-pre-wrap">
                  {summary.summary}
                </pre>
              </details>
            </>
          ) : (
            <>
              {/* Parsing failed - show formatted raw summary */}
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded mb-4">
                <p className="text-sm text-yellow-800">
                  ⚠️ Response format didn't match expected structure. Showing raw summary:
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded border border-gray-200">
                <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans">
                  {summary.summary}
                </pre>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

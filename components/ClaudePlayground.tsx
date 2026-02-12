'use client';

import { useState } from 'react';

export default function ClaudePlayground() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stats, setStats] = useState<{ inputTokens: number; outputTokens: number } | null>(null);

  const askClaude = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setResponse('');
      setStats(null);

      const res = await fetch('/api/claude/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to get response from Claude');
      }

      setResponse(data.data.response);
      setStats({
        inputTokens: data.data.usage.inputTokens,
        outputTokens: data.data.usage.outputTokens,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      askClaude();
    }
  };

  const examplePrompts = [
    'Explain async/await in JavaScript in simple terms',
    'What are the benefits of using TypeScript?',
    'Write a haiku about coding',
    'Summarize: Alice finished the auth feature. Bob will review it today. Deploy Friday.',
  ];

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Claude Playground</h2>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600">Powered by</span>
          <span className="px-2 py-1 bg-gradient-to-r from-blue-100 to-orange-100 text-blue-800 text-xs font-semibold rounded">
            Claude Sonnet 4
          </span>
        </div>
      </div>

      <p className="text-sm text-gray-600 mb-4">
        Ask Claude anything! Press <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+Enter</kbd> or <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">⌘+Enter</kbd> to submit.
      </p>

      {/* Example Prompts */}
      <div className="mb-4">
        <p className="text-xs font-medium text-gray-700 mb-2">Try these examples:</p>
        <div className="flex flex-wrap gap-2">
          {examplePrompts.map((example, idx) => (
            <button
              key={idx}
              onClick={() => setPrompt(example)}
              className="text-xs px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded border border-blue-200"
            >
              {example.substring(0, 40)}{example.length > 40 ? '...' : ''}
            </button>
          ))}
        </div>
      </div>

      {/* Prompt Input */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Your Prompt
        </label>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Ask Claude anything... (Ctrl+Enter to submit)"
          rows={4}
          className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
        />
      </div>

      {/* Submit Button */}
      <button
        onClick={askClaude}
        disabled={loading || !prompt.trim()}
        className="w-full px-4 py-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:bg-gray-400 text-white font-semibold rounded mb-4"
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
            Thinking...
          </span>
        ) : (
          'Ask Claude'
        )}
      </button>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded">
          <p className="text-sm text-red-800">Error: {error}</p>
        </div>
      )}

      {/* Response Display */}
      {response && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Response:</h3>
            {stats && (
              <div className="text-xs text-gray-600">
                {stats.inputTokens} in • {stats.outputTokens} out
              </div>
            )}
          </div>
          <div className="p-4 bg-gray-50 rounded border border-gray-200">
            <p className="text-gray-800 whitespace-pre-wrap">{response}</p>
          </div>
        </div>
      )}

      {/* Info Box */}
      <div className="mt-6 p-3 bg-blue-50 border border-blue-200 rounded">
        <p className="text-xs text-blue-800">
          💡 <strong>Tip:</strong> This uses the Claude API. Responses are generated using Anthropic's cloud models for higher quality and reasoning capabilities.
        </p>
      </div>
    </div>
  );
}

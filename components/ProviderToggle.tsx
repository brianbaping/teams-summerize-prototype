'use client';

import { useProvider } from '@/contexts/ProviderContext';

export default function ProviderToggle() {
  const { provider, setProvider } = useProvider();

  return (
    <div className="flex items-center space-x-3">
      <span className="text-sm text-gray-600">AI Provider:</span>
      <select
        value={provider}
        onChange={(e) => setProvider(e.target.value as 'ollama' | 'claude')}
        className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="ollama">🟣 Ollama (Local)</option>
        <option value="claude">🔵 Claude API</option>
      </select>

      {/* Provider indicator badge */}
      <span
        className={`px-2 py-1 text-xs font-semibold rounded ${
          provider === 'claude'
            ? 'bg-gradient-to-r from-blue-100 to-orange-100 text-blue-800'
            : 'bg-purple-100 text-purple-800'
        }`}
      >
        {provider === 'claude' ? 'Claude Sonnet 4' : 'Llama3'}
      </span>
    </div>
  );
}

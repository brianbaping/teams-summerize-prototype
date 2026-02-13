'use client';

import { useSession, signIn, signOut } from 'next-auth/react';
import ChannelSelector from '@/components/ChannelSelector';
import MessageViewer from '@/components/MessageViewer';
import OllamaPlayground from '@/components/OllamaPlayground';
import ClaudePlayground from '@/components/ClaudePlayground';
import ProviderToggle from '@/components/ProviderToggle';
import { useProvider } from '@/contexts/ProviderContext';

export default function Home() {
  const { data: session, status } = useSession();
  const { provider } = useProvider();
  const isMockMode = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true';

  if (status === 'loading') {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-4">Teams AI Summarizer</h1>
          <p className="text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="min-h-screen p-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-6">Teams AI Summarizer</h1>
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Welcome</h2>
            <p className="text-gray-600 mb-6">
              AI-powered summarization for Microsoft Teams conversations using local LLM.
            </p>
            {isMockMode && (
              <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Development Mode:</strong> Using mock authentication and sample data.
                </p>
              </div>
            )}
            <button
              onClick={() => signIn(isMockMode ? 'mock' : 'azure-ad')}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded"
            >
              {isMockMode ? 'Sign in (Mock)' : 'Sign in with Microsoft'}
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Teams AI Summarizer</h1>
          <button
            onClick={() => signOut()}
            className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-2 px-4 rounded"
          >
            Sign out
          </button>
        </div>

        {isMockMode && (
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4 mb-6">
            <p className="text-sm text-yellow-800">
              <strong>Development Mode:</strong> Signed in as {session.user?.email}
            </p>
          </div>
        )}

        <div className="space-y-6">
          <div className="bg-white shadow-md rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Dashboard</h2>
              <ProviderToggle />
            </div>
            <p className="text-gray-600">
              Welcome, {session.user?.name || session.user?.email}!
            </p>
          </div>

          {provider === 'claude' ? <ClaudePlayground /> : <OllamaPlayground />}
          <ChannelSelector />
          <MessageViewer />
        </div>
      </div>
    </main>
  );
}

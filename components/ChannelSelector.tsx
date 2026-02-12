'use client';

import { useState, useEffect } from 'react';

interface Channel {
  id: string;
  displayName: string;
  description?: string;
}

interface Team {
  id: string;
  displayName: string;
  description?: string;
  channels: Channel[];
}

interface MonitoredChannel {
  id: number;
  channelId: string;
  channelName: string;
  teamId: string;
}

export default function ChannelSelector() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [monitored, setMonitored] = useState<MonitoredChannel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  // Fetch teams and channels on mount
  useEffect(() => {
    fetchChannels();
  }, []);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/channels');
      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to fetch channels');
      }

      setTeams(data.data.teams || []);
      setMonitored(data.data.monitored || []);

      // Auto-select first team if available
      if (data.data.teams && data.data.teams.length > 0) {
        setSelectedTeam(data.data.teams[0].id);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const addChannel = async (teamId: string, channelId: string, channelName: string) => {
    try {
      const response = await fetch('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, channelId, channelName }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to add channel');
      }

      // Refresh the list
      await fetchChannels();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const isMonitored = (channelId: string) => {
    return monitored.some((m) => m.channelId === channelId);
  };

  if (loading) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Channel Selector</h2>
        <p className="text-gray-600">Loading channels...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white shadow-md rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Channel Selector</h2>
        <div className="bg-red-50 border border-red-200 rounded p-4">
          <p className="text-red-800">Error: {error}</p>
          <button
            onClick={fetchChannels}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const selectedTeamData = teams.find((t) => t.id === selectedTeam);

  return (
    <div className="bg-white shadow-md rounded-lg p-6">
      <h2 className="text-xl font-semibold mb-4">Select Channels to Monitor</h2>

      {/* Monitored Channels Summary */}
      {monitored.length > 0 && (
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="font-semibold text-green-800 mb-2">
            Currently Monitoring {monitored.length} Channel{monitored.length !== 1 ? 's' : ''}
          </h3>
          <ul className="text-sm text-green-700 space-y-1">
            {monitored.map((m) => (
              <li key={m.id}>✓ {m.channelName}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Team Selector */}
      {teams.length > 0 ? (
        <>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Select a Team
            </label>
            <select
              value={selectedTeam || ''}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.displayName}
                  {team.description ? ` - ${team.description}` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Channel List */}
          {selectedTeamData && (
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">
                Channels in {selectedTeamData.displayName}
              </h3>
              <div className="space-y-2">
                {selectedTeamData.channels.length > 0 ? (
                  selectedTeamData.channels.map((channel) => {
                    const monitored = isMonitored(channel.id);
                    return (
                      <div
                        key={channel.id}
                        className="flex items-center justify-between p-3 border border-gray-200 rounded hover:bg-gray-50"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">
                            {channel.displayName}
                          </p>
                          {channel.description && (
                            <p className="text-sm text-gray-500">
                              {channel.description}
                            </p>
                          )}
                        </div>
                        {monitored ? (
                          <span className="px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded">
                            Monitoring
                          </span>
                        ) : (
                          <button
                            onClick={() =>
                              addChannel(
                                selectedTeamData.id,
                                channel.id,
                                channel.displayName
                              )
                            }
                            className="px-4 py-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <p className="text-gray-500 text-sm">No channels available</p>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-gray-500">No teams found</p>
      )}
    </div>
  );
}

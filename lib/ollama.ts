/**
 * Ollama client for local LLM summarization
 * Handles prompt generation, API calls, and response parsing
 */

import { OllamaError } from './errors';
import { Message } from './microsoft-graph';

export interface SummaryOutput {
  overview: string;
  decisions: string;
  actionItems: string;
  blockers: string;
  resources: string;
}

/**
 * Generate a summary from Teams messages using Ollama
 * @param messages - Array of Teams messages
 * @param date - Date string for the summary period
 * @returns Generated summary text
 */
export async function generateSummary(
  messages: Message[],
  date: string
): Promise<string> {
  if (!messages || messages.length === 0) {
    throw new OllamaError('Cannot generate summary from empty message list');
  }

  const prompt = buildPrompt(messages, date);
  const baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL || 'llama3';

  // Retry logic for timeouts and connection errors
  const maxAttempts = 2;
  let lastError: any;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`[Ollama] Calling API at ${baseUrl} with model ${model}`);
      console.log(`[Ollama] Prompt length: ${prompt.length} characters`);

      const response = await fetch(`${baseUrl}/api/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
        }),
        signal: AbortSignal.timeout(60000), // 60s timeout
      });

      if (!response.ok) {
        throw new OllamaError(
          `Ollama API returned ${response.status}: ${response.statusText}`
        );
      }

      const result = await response.json();
      console.log(`[Ollama] Response received: ${result.response.substring(0, 200)}...`);
      console.log(`[Ollama] Generation stats: ${result.eval_count} tokens in ${(result.total_duration / 1000000000).toFixed(2)}s`);

      return result.response;
    } catch (error: any) {
      lastError = error;

      // Check if error is retriable (timeout or connection error)
      const isRetriable =
        error.name === 'AbortError' ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.toLowerCase().includes('timeout') ||
        error.message?.toLowerCase().includes('connection');

      if (!isRetriable || attempt === maxAttempts - 1) {
        break;
      }

      // Wait 1 second before retry
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  throw new OllamaError(
    'Failed to generate summary after retries',
    lastError
  );
}

/**
 * Build the prompt for summarization
 */
function buildPrompt(messages: Message[], date: string): string {
  const formattedMessages = messages
    .map((msg) => {
      const author = msg.from?.user?.displayName || 'Unknown';
      const content = msg.body?.content || '';
      const time = new Date(msg.createdDateTime).toLocaleTimeString();
      return `[${time}] ${author}: ${content}`;
    })
    .join('\n');

  return `Summarize the following Teams channel conversation from ${date}.

Focus on:
1. Key discussion topics and themes
2. Decisions that were made
3. Action items and who they're assigned to
4. Any blockers or concerns raised
5. Important links or resources mentioned

Messages:
${formattedMessages}

Provide a concise summary in the following format:
Overview: (2-3 sentences)

Key Decisions: (bullet points)

Action Items: (bullet points with @mentions)

Blockers: (if any, otherwise "None")

Resources: (links mentioned, otherwise "None")`;
}

/**
 * Parse the LLM response into structured sections
 * Extracts overview, decisions, action items, blockers, and resources
 */
export function parseSummaryResponse(response: string): SummaryOutput {
  console.log('[Ollama Parser] Raw response length:', response.length);
  console.log('[Ollama Parser] First 200 chars:', response.substring(0, 200));

  const sections: SummaryOutput = {
    overview: '',
    decisions: '',
    actionItems: '',
    blockers: '',
    resources: '',
  };

  // Extract each section using regex (using [\s\S] instead of . with s flag for compatibility)
  // Try with case-insensitive matching and more flexible patterns
  const overviewMatch = response.match(/Overview:?\s*([\s\S]*?)(?=\n\s*Key Decisions:?|\n\s*Action Items:?|\n\s*Blockers:?|\n\s*Resources:?|$)/i);
  const decisionsMatch = response.match(/Key Decisions:?\s*([\s\S]*?)(?=\n\s*Action Items:?|\n\s*Blockers:?|\n\s*Resources:?|$)/i);
  const actionItemsMatch = response.match(/Action Items:?\s*([\s\S]*?)(?=\n\s*Blockers:?|\n\s*Resources:?|$)/i);
  const blockersMatch = response.match(/Blockers:?\s*([\s\S]*?)(?=\n\s*Resources:?|$)/i);
  const resourcesMatch = response.match(/Resources:?\s*([\s\S]*?)$/i);

  if (overviewMatch) sections.overview = overviewMatch[1].trim();
  if (decisionsMatch) sections.decisions = decisionsMatch[1].trim();
  if (actionItemsMatch) sections.actionItems = actionItemsMatch[1].trim();
  if (blockersMatch) sections.blockers = blockersMatch[1].trim();
  if (resourcesMatch) sections.resources = resourcesMatch[1].trim();

  console.log('[Ollama Parser] Parsed sections:', {
    overview: sections.overview ? sections.overview.substring(0, 50) + '...' : 'EMPTY',
    decisions: sections.decisions ? 'Found' : 'EMPTY',
    actionItems: sections.actionItems ? 'Found' : 'EMPTY',
    blockers: sections.blockers ? 'Found' : 'EMPTY',
    resources: sections.resources ? 'Found' : 'EMPTY',
  });

  return sections;
}

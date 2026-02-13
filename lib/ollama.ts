/**
 * Ollama client for local LLM summarization
 * Handles prompt generation, API calls, and response parsing
 */

import { OllamaError } from './errors';
import { Message } from './microsoft-graph';
import type { LLMProvider, SummaryOutput } from './llm-provider';

// Re-export SummaryOutput for backward compatibility
export type { SummaryOutput };

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

  return `Summarize the following Teams chat conversation from ${date}.

Messages:
${formattedMessages}

IMPORTANT: Follow this EXACT format with each section on a new line. Do NOT include section content in other sections.

**Overview:**
[Write 2-3 sentences summarizing the main topics discussed. DO NOT include decisions, action items, or blockers here - only the general conversation theme.]

**Key Decisions:**
[List only the decisions that were made, using bullet points (•). If none, write "None"]

**Action Items:**
[List only the tasks/actions with assignees, using bullet points (•). Format: • Task description (@PersonName). If none, write "None"]

**Blockers:**
[List only the blockers/concerns raised, using bullet points (•). If none, write "None"]

**Resources:**
[List only the links/resources mentioned, using bullet points (•). If none, write "None"]`;
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

  // Extract each section using regex
  // Match sections with ** markers and proper boundaries
  const overviewMatch = response.match(/\*\*Overview:?\*\*\s*([\s\S]*?)(?=\n\s*\*\*Key Decisions:?|\n\s*\*\*Action Items:?|\n\s*\*\*Blockers:?|\n\s*\*\*Resources:?|$)/i);
  const decisionsMatch = response.match(/\*\*Key Decisions:?\*\*\s*([\s\S]*?)(?=\n\s*\*\*Action Items:?|\n\s*\*\*Blockers:?|\n\s*\*\*Resources:?|$)/i);
  const actionItemsMatch = response.match(/\*\*Action Items:?\*\*\s*([\s\S]*?)(?=\n\s*\*\*Blockers:?|\n\s*\*\*Resources:?|$)/i);
  const blockersMatch = response.match(/\*\*Blockers:?\*\*\s*([\s\S]*?)(?=\n\s*\*\*Resources:?|$)/i);
  const resourcesMatch = response.match(/\*\*Resources:?\*\*\s*([\s\S]*?)$/i);

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

/**
 * OllamaProvider class implementing LLMProvider interface
 */
class OllamaProvider implements LLMProvider {
  generateSummary(messages: Message[], date: string): Promise<string> {
    return generateSummary(messages, date);
  }

  parseSummaryResponse(response: string): SummaryOutput {
    return parseSummaryResponse(response);
  }

  getName(): string {
    return 'Ollama';
  }
}

/**
 * Factory function to create an OllamaProvider instance
 */
export function getOllamaProvider(): LLMProvider {
  return new OllamaProvider();
}

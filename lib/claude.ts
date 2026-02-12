/**
 * Claude API client for AI summarization
 * Handles prompt generation, API calls, and response parsing
 */

import Anthropic from '@anthropic-ai/sdk';
import { ClaudeAPIError } from './errors';
import { Message } from './microsoft-graph';
import type { LLMProvider, SummaryOutput } from './llm-provider';

/**
 * Generate a summary from Teams messages using Claude API
 * @param messages - Array of Teams messages
 * @param date - Date string for the summary period
 * @returns Generated summary text
 */
export async function generateSummary(
  messages: Message[],
  date: string
): Promise<string> {
  if (!messages || messages.length === 0) {
    throw new ClaudeAPIError('Cannot generate summary from empty message list');
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new ClaudeAPIError('ANTHROPIC_API_KEY environment variable is not set');
  }

  const prompt = buildPrompt(messages, date);
  const model = process.env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';

  // Initialize Anthropic client
  const client = new Anthropic({
    apiKey,
  });

  // Retry logic for rate limits and server errors
  const maxAttempts = 3;
  let lastError: any;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      console.log(`[Claude] Calling API with model ${model} (attempt ${attempt + 1}/${maxAttempts})`);
      console.log(`[Claude] Prompt length: ${prompt.length} characters`);

      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      // Extract text from response
      const text = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as any).text)
        .join('\n');

      console.log(`[Claude] Response received: ${text.substring(0, 200)}...`);
      console.log(`[Claude] Token usage: ${response.usage.input_tokens} in, ${response.usage.output_tokens} out`);

      return text;
    } catch (error: any) {
      lastError = error;

      // Check if error is retriable
      const statusCode = error.status || error.statusCode;
      const isRetriable =
        statusCode === 429 || // Rate limit
        statusCode === 529 || // Overloaded
        statusCode === 500 || // Server error
        statusCode === 503 || // Service unavailable
        error.message?.toLowerCase().includes('timeout') ||
        error.message?.toLowerCase().includes('connection');

      if (!isRetriable || attempt === maxAttempts - 1) {
        break;
      }

      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, attempt) * 1000;
      console.log(`[Claude] Retriable error, waiting ${delay}ms before retry...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new ClaudeAPIError(
    'Failed to generate summary after retries',
    { originalError: lastError }
  );
}

/**
 * Build the prompt for summarization
 * Uses the same format as Ollama for consistency
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
 * Reuses the same parsing logic as Ollama for consistency
 */
export function parseSummaryResponse(response: string): SummaryOutput {
  console.log('[Claude Parser] Raw response length:', response.length);
  console.log('[Claude Parser] First 200 chars:', response.substring(0, 200));

  const sections: SummaryOutput = {
    overview: '',
    decisions: '',
    actionItems: '',
    blockers: '',
    resources: '',
  };

  // Extract each section using regex (case-insensitive, flexible patterns)
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

  console.log('[Claude Parser] Parsed sections:', {
    overview: sections.overview ? sections.overview.substring(0, 50) + '...' : 'EMPTY',
    decisions: sections.decisions ? 'Found' : 'EMPTY',
    actionItems: sections.actionItems ? 'Found' : 'EMPTY',
    blockers: sections.blockers ? 'Found' : 'EMPTY',
    resources: sections.resources ? 'Found' : 'EMPTY',
  });

  return sections;
}

/**
 * ClaudeProvider class implementing LLMProvider interface
 */
class ClaudeProvider implements LLMProvider {
  generateSummary(messages: Message[], date: string): Promise<string> {
    return generateSummary(messages, date);
  }

  parseSummaryResponse(response: string): SummaryOutput {
    return parseSummaryResponse(response);
  }

  getName(): string {
    return 'Claude';
  }
}

/**
 * Factory function to create a ClaudeProvider instance
 */
export function getClaudeProvider(): LLMProvider {
  return new ClaudeProvider();
}

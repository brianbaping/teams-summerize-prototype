/**
 * LLM Provider abstraction layer
 * Allows switching between different LLM providers (Ollama, Claude, etc.)
 */

import { Message } from './microsoft-graph';

/**
 * Structured output from LLM summary
 */
export interface SummaryOutput {
  overview: string;
  decisions: string;
  actionItems: string;
  blockers: string;
  resources: string;
}

/**
 * Interface that all LLM providers must implement
 */
export interface LLMProvider {
  /**
   * Generate a summary from Teams messages
   * @param messages - Array of Teams messages
   * @param date - Date string for the summary period
   * @returns Generated summary text
   */
  generateSummary(messages: Message[], date: string): Promise<string>;

  /**
   * Parse the LLM response into structured sections
   * @param response - Raw LLM response text
   * @returns Structured summary sections
   */
  parseSummaryResponse(response: string): SummaryOutput;

  /**
   * Get the provider name for logging/debugging
   */
  getName(): string;
}

/**
 * Valid LLM provider types
 */
export type LLMProviderType = 'ollama' | 'claude';

/**
 * Factory function to get the appropriate LLM provider
 * based on environment configuration
 */
export function getLLMProvider(): LLMProvider {
  const providerType = (process.env.AI_PROVIDER || 'ollama') as LLMProviderType;

  switch (providerType) {
    case 'claude':
      // Import dynamically to avoid loading unnecessary modules
      const { getClaudeProvider } = require('./claude');
      return getClaudeProvider();

    case 'ollama':
    default:
      const { getOllamaProvider } = require('./ollama');
      return getOllamaProvider();
  }
}

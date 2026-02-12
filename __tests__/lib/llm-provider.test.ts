/**
 * Tests for LLM Provider factory and abstraction layer
 */

describe('LLM Provider Factory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.resetModules(); // Clear module cache for each test
    delete process.env.AI_PROVIDER;
  });

  describe('getLLMProvider', () => {
    it('should return Ollama provider by default', () => {
      const { getLLMProvider } = require('@/lib/llm-provider');
      const provider = getLLMProvider();

      expect(provider.getName()).toBe('Ollama');
    });

    it('should return Ollama when AI_PROVIDER=ollama', () => {
      process.env.AI_PROVIDER = 'ollama';
      const { getLLMProvider } = require('@/lib/llm-provider');
      const provider = getLLMProvider();

      expect(provider.getName()).toBe('Ollama');
    });

    it('should return Claude when AI_PROVIDER=claude', () => {
      process.env.AI_PROVIDER = 'claude';
      process.env.ANTHROPIC_API_KEY = 'test-key';

      const { getLLMProvider } = require('@/lib/llm-provider');
      const provider = getLLMProvider();

      expect(provider.getName()).toBe('Claude');
    });
  });

  describe('Provider Interface', () => {
    it('should have generateSummary method', () => {
      const { getLLMProvider } = require('@/lib/llm-provider');
      const provider = getLLMProvider();

      expect(provider).toHaveProperty('generateSummary');
      expect(typeof provider.generateSummary).toBe('function');
    });

    it('should have parseSummaryResponse method', () => {
      const { getLLMProvider } = require('@/lib/llm-provider');
      const provider = getLLMProvider();

      expect(provider).toHaveProperty('parseSummaryResponse');
      expect(typeof provider.parseSummaryResponse).toBe('function');
    });

    it('should have getName method', () => {
      const { getLLMProvider } = require('@/lib/llm-provider');
      const provider = getLLMProvider();

      expect(provider).toHaveProperty('getName');
      expect(typeof provider.getName).toBe('function');
    });
  });
});

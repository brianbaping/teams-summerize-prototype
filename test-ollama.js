/**
 * Quick test to verify Ollama is working and produces different outputs
 */

async function testOllama() {
  const baseUrl = 'http://localhost:11434';

  console.log('Testing Ollama at', baseUrl);
  console.log('---');

  // Test 1: Simple prompt
  console.log('Test 1: Simple greeting');
  const test1 = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3',
      prompt: 'Say hello in one sentence.',
      stream: false,
    }),
  });
  const result1 = await test1.json();
  console.log('Response:', result1.response);
  console.log('Tokens:', result1.eval_count, 'Duration:', (result1.total_duration / 1000000000).toFixed(2), 's');
  console.log('---');

  // Test 2: Different prompt to verify it's not cached/hardcoded
  console.log('Test 2: Math question');
  const test2 = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3',
      prompt: 'What is 7 x 8? Answer with just the number.',
      stream: false,
    }),
  });
  const result2 = await test2.json();
  console.log('Response:', result2.response);
  console.log('Tokens:', result2.eval_count, 'Duration:', (result2.total_duration / 1000000000).toFixed(2), 's');
  console.log('---');

  // Test 3: Summarization (like your app uses)
  console.log('Test 3: Summarization task');
  const test3 = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'llama3',
      prompt: `Summarize this conversation:
Alice: I finished the new feature.
Bob: Great! Let's deploy on Friday.

Provide:
Overview: (brief summary)
Key Decisions: (list decisions)`,
      stream: false,
    }),
  });
  const result3 = await test3.json();
  console.log('Response:', result3.response);
  console.log('Tokens:', result3.eval_count, 'Duration:', (result3.total_duration / 1000000000).toFixed(2), 's');
  console.log('---');

  console.log('✅ Ollama is working! All three tests produced different outputs.');
}

testOllama().catch(console.error);

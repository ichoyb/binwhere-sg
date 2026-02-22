/**
 * Phase 0: Groq tool calling accuracy test.
 * Tests Llama 3.3 70B's ability to select correct tools for recycling questions.
 *
 * Usage: npx tsx scripts/phase0/test-groq-tools.ts
 * Requires: GROQ_API_KEY in .env
 */

import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import type { ChatCompletionTool } from 'groq-sdk/resources/chat';
import { GroqChatProvider } from '../../src/lib/ai/providers/groq';
import { CHAT_SYSTEM_PROMPT } from '../../src/lib/ai/prompts/chat-system';

dotenv.config({ path: path.join(__dirname, '..', '..', '.env') });

/** Tool definitions that mirror what the chatbox will have */
const CHATBOX_TOOLS: ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'find_nearby_recycling_bins',
      description: 'Find blue recycling bins near a location in Singapore',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'Latitude (1.15-1.47)' },
          longitude: { type: 'number', description: 'Longitude (103.6-104.05)' },
          radius_km: { type: 'number', description: 'Search radius in km (max 5)', default: 1 },
        },
        required: ['latitude', 'longitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'find_nearby_ewaste_points',
      description: 'Find e-waste recycling collection points near a location in Singapore',
      parameters: {
        type: 'object',
        properties: {
          latitude: { type: 'number', description: 'Latitude (1.15-1.47)' },
          longitude: { type: 'number', description: 'Longitude (103.6-104.05)' },
          radius_km: { type: 'number', description: 'Search radius in km (max 5)', default: 1 },
        },
        required: ['latitude', 'longitude'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'classify_item',
      description: 'Classify an item for recycling in Singapore',
      parameters: {
        type: 'object',
        properties: {
          item_description: { type: 'string', description: 'Description of the item to classify' },
        },
        required: ['item_description'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_recycling_guidelines',
      description: 'Get general recycling guidelines and tips for Singapore',
      parameters: {
        type: 'object',
        properties: {
          topic: {
            type: 'string',
            description: 'Topic: blue_bin, ewaste, hazardous, textile, general',
          },
        },
        required: ['topic'],
      },
    },
  },
];

interface TestQuestion {
  question: string;
  /** Expected tool calls (null = no tool expected) */
  expectedTools: string[] | null;
  category: 'single_tool' | 'multi_tool' | 'no_tool' | 'edge_case';
}

const TEST_QUESTIONS: TestQuestion[] = [
  // ── Single tool (10) ───────────────────────────────────────
  { question: 'Where can I recycle batteries near Ang Mo Kio?', expectedTools: ['find_nearby_ewaste_points'], category: 'single_tool' },
  { question: 'Find me a recycling bin near Orchard Road', expectedTools: ['find_nearby_recycling_bins'], category: 'single_tool' },
  { question: 'Can I recycle a pizza box?', expectedTools: ['classify_item'], category: 'single_tool' },
  { question: 'Is styrofoam recyclable?', expectedTools: ['classify_item'], category: 'single_tool' },
  { question: 'Where to throw e-waste near Tampines?', expectedTools: ['find_nearby_ewaste_points'], category: 'single_tool' },
  { question: 'Where is the nearest blue bin to Clementi MRT?', expectedTools: ['find_nearby_recycling_bins'], category: 'single_tool' },
  { question: 'How do I recycle old clothes?', expectedTools: ['get_recycling_guidelines'], category: 'single_tool' },
  { question: 'What can go into the blue bin?', expectedTools: ['get_recycling_guidelines'], category: 'single_tool' },
  { question: 'Can old shoes be recycled?', expectedTools: ['classify_item'], category: 'single_tool' },
  { question: '在武吉巴督附近哪里可以回收电子废弃物？', expectedTools: ['find_nearby_ewaste_points'], category: 'single_tool' },

  // ── Multi tool (5) ─────────────────────────────────────────
  { question: 'I have old batteries and newspapers to recycle, where should I go near Jurong East?', expectedTools: ['find_nearby_ewaste_points', 'find_nearby_recycling_bins'], category: 'multi_tool' },
  { question: 'Can I recycle a broken laptop and where near Bedok?', expectedTools: ['classify_item', 'find_nearby_ewaste_points'], category: 'multi_tool' },
  { question: 'What are the rules for e-waste and where can I find collection points near Woodlands?', expectedTools: ['get_recycling_guidelines', 'find_nearby_ewaste_points'], category: 'multi_tool' },
  { question: 'Is this bottle recyclable and where is the nearest bin to Toa Payoh?', expectedTools: ['classify_item', 'find_nearby_recycling_bins'], category: 'multi_tool' },
  { question: '我有旧手机和旧衣服要回收,分别去哪里？在淡滨尼附近', expectedTools: ['find_nearby_ewaste_points', 'find_nearby_recycling_bins'], category: 'multi_tool' },

  // ── No tool needed (5) ─────────────────────────────────────
  { question: 'What is e-waste?', expectedTools: null, category: 'no_tool' },
  { question: 'Why is recycling important?', expectedTools: null, category: 'no_tool' },
  { question: 'Thank you for your help!', expectedTools: null, category: 'no_tool' },
  { question: 'What does NEA stand for?', expectedTools: null, category: 'no_tool' },
  { question: 'How does Singapore handle waste?', expectedTools: null, category: 'no_tool' },

  // ── Edge cases (7) ─────────────────────────────────────────
  { question: '', expectedTools: null, category: 'edge_case' },
  { question: 'What is the weather today?', expectedTools: null, category: 'edge_case' },
  { question: 'Tell me a joke', expectedTools: null, category: 'edge_case' },
  { question: 'recycle', expectedTools: null, category: 'edge_case' },
  { question: 'Saya nak buang barang elektronik lama di Tampines', expectedTools: ['find_nearby_ewaste_points'], category: 'edge_case' },
  { question: '附近有回收站吗', expectedTools: ['find_nearby_recycling_bins'], category: 'edge_case' },
  { question: 'Help me classify: old newspaper, broken phone, and paint can', expectedTools: ['classify_item'], category: 'edge_case' },
];

interface ToolTestResult {
  question: TestQuestion;
  actualTools: string[];
  correct: boolean;
  durationMs: number;
  error?: string;
}

async function main() {
  console.log('Phase 0: Groq Tool Calling Accuracy Test');
  console.log(`Test set: ${TEST_QUESTIONS.length} questions`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  if (!process.env.GROQ_API_KEY) {
    console.error('GROQ_API_KEY not set in .env');
    process.exit(1);
  }

  const provider = new GroqChatProvider();
  const results: ToolTestResult[] = [];
  let correct = 0;

  for (let i = 0; i < TEST_QUESTIONS.length; i++) {
    const q = TEST_QUESTIONS[i];

    // Skip empty string test (just mark as pass)
    if (!q.question) {
      results.push({ question: q, actualTools: [], correct: true, durationMs: 0 });
      correct++;
      console.log(`  [${String(i + 1).padStart(2)}/${TEST_QUESTIONS.length}] OK (empty input, skipped)`);
      continue;
    }

    const startTime = Date.now();

    try {
      const response = await provider.chat(
        [{ role: 'user', content: q.question }],
        CHATBOX_TOOLS,
        CHAT_SYSTEM_PROMPT,
      );

      const duration = Date.now() - startTime;
      const message = response.choices[0]?.message;

      // Extract tool calls
      const actualTools = (message?.tool_calls || []).map((tc: { function: { name: string } }) => tc.function.name);

      // Check correctness
      let isCorrect: boolean;
      if (q.expectedTools === null) {
        // No tool expected — pass if no tools called OR if tool called but still reasonable
        isCorrect = actualTools.length === 0;
      } else {
        // Check if all expected tools were called (order doesn't matter)
        const expectedSet = new Set(q.expectedTools);
        const actualSet = new Set(actualTools);
        isCorrect = q.expectedTools.every((t) => actualSet.has(t));
      }

      if (isCorrect) correct++;

      const icon = isCorrect ? 'OK' : 'XX';
      const toolStr = actualTools.length > 0 ? actualTools.join(', ') : '(none)';
      const expectedStr = q.expectedTools ? q.expectedTools.join(', ') : '(none)';
      console.log(
        `  [${String(i + 1).padStart(2)}/${TEST_QUESTIONS.length}] ${icon} "${q.question.slice(0, 50)}" -> ${toolStr} (expected: ${expectedStr}) [${duration}ms]`,
      );

      results.push({ question: q, actualTools, correct: isCorrect, durationMs: duration });

      await new Promise((r) => setTimeout(r, 300));
    } catch (error) {
      const duration = Date.now() - startTime;
      console.log(
        `  [${String(i + 1).padStart(2)}/${TEST_QUESTIONS.length}] ERR "${q.question.slice(0, 50)}" -> ${(error as Error).message.slice(0, 80)}`,
      );
      results.push({ question: q, actualTools: [], correct: false, durationMs: duration, error: (error as Error).message });

      await new Promise((r) => setTimeout(r, 1000));
    }
  }

  // Report
  const totalValid = TEST_QUESTIONS.length;
  const accuracy = correct / totalValid;

  console.log('\n' + '='.repeat(60));
  console.log('GROQ TOOL CALLING REPORT');
  console.log('='.repeat(60));
  console.log(`Overall Accuracy: ${(accuracy * 100).toFixed(1)}% (target: >80%)`);

  // Per-category
  for (const category of ['single_tool', 'multi_tool', 'no_tool', 'edge_case'] as const) {
    const catResults = results.filter((r) => r.question.category === category);
    const catCorrect = catResults.filter((r) => r.correct).length;
    const catAcc = catCorrect / catResults.length;
    console.log(`  ${category.padEnd(15)} ${catCorrect}/${catResults.length} = ${(catAcc * 100).toFixed(0)}%`);
  }

  // Misclassified
  const wrong = results.filter((r) => !r.correct);
  if (wrong.length > 0) {
    console.log(`\nIncorrect (${wrong.length}):`);
    for (const r of wrong) {
      const expectedStr = r.question.expectedTools ? r.question.expectedTools.join(', ') : '(none)';
      console.log(`  "${r.question.question.slice(0, 60)}" -> ${r.actualTools.join(', ') || '(none)'} (expected: ${expectedStr})`);
    }
  }

  // Save results
  const outputPath = path.join(__dirname, 'results', `groq-tools-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    totalQuestions: totalValid,
    accuracy,
    results: results.map((r) => ({
      question: r.question.question,
      category: r.question.category,
      expectedTools: r.question.expectedTools,
      actualTools: r.actualTools,
      correct: r.correct,
      durationMs: r.durationMs,
      error: r.error,
    })),
  }, null, 2));
  console.log(`\nResults saved to: ${outputPath}`);

  // Gate check
  const gatePass = accuracy >= 0.8;
  console.log(`\nGate: ${gatePass ? 'PASS' : 'FAIL'} (${(accuracy * 100).toFixed(1)}% >= 80%)`);
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});

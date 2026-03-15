import Anthropic from '@anthropic-ai/sdk';
import type { SessionEntry } from './parsers/types.js';

/**
 * Generate a short descriptive title for a coding session using Claude Haiku.
 * Returns null if ANTHROPIC_API_KEY is not set or the API call fails.
 */
export async function generateAITitle(entries: SessionEntry[]): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const context = buildContext(entries);
    if (!context) return null;

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 80,
      messages: [
        {
          role: 'user',
          content: `Generate a short, descriptive title (under 60 chars) for this coding session. Return only the title, no quotes.\n\n${context}`,
        },
      ],
    });

    const block = response.content[0];
    if (block.type === 'text') {
      return block.text.trim().slice(0, 60);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Extract the first few user + assistant messages as context for title generation.
 */
function buildContext(entries: SessionEntry[]): string | null {
  const relevant = entries.filter((e) => e.type === 'user' || e.type === 'assistant');
  if (relevant.length === 0) return null;

  const lines: string[] = [];
  for (const entry of relevant.slice(0, 5)) {
    const role = entry.type === 'user' ? 'User' : 'Assistant';
    const content = entry.content.length > 500 ? entry.content.slice(0, 500) + '...' : entry.content;
    lines.push(`${role}: ${content}`);
  }
  return lines.join('\n\n');
}

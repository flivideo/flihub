/**
 * FR-34 Enhancement: LLM-based chapter verification
 *
 * Uses Claude to verify and correct chapter timestamps when
 * algorithmic matching produces low-confidence or incorrect results.
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  ChapterVerifyRequest,
  ChapterVerifyResponse,
  ChapterMatchCandidate,
} from '../../../shared/types.js';

// Initialize client (uses ANTHROPIC_API_KEY env var)
const anthropic = new Anthropic();

/**
 * Build the prompt for chapter verification
 */
function buildVerificationPrompt(request: ChapterVerifyRequest): string {
  const { chapter, name, transcriptSnippet, currentMatch, alternatives, userHint } = request;

  let prompt = `You are helping to verify chapter timestamps for a YouTube video.

## Task
Determine the correct timestamp for chapter ${chapter}: "${name}"

## Transcript Start (first ~200 characters of the chapter's recording)
"${transcriptSnippet}"

`;

  if (currentMatch) {
    prompt += `## Current Match (algorithmic)
- Timestamp: ${currentMatch.timestamp}
- Confidence: ${currentMatch.confidence}%
- Matched SRT text: "${currentMatch.matchedText}"

`;
  } else {
    prompt += `## Current Match
No algorithmic match was found.

`;
  }

  if (alternatives && alternatives.length > 0) {
    prompt += `## Alternative Matches Found
${alternatives.map((alt, i) =>
  `${i + 1}. Timestamp: ${alt.timestamp} (${alt.confidence}% confidence, ${alt.matchMethod} match)
   SRT text: "${alt.matchedText}"`
).join('\n\n')}

`;
  }

  if (userHint) {
    prompt += `## User Hint
The user provided this additional context: "${userHint}"

`;
  }

  prompt += `## Instructions
Based on the transcript snippet and the available matches, determine:
1. Which timestamp correctly marks where this chapter begins in the video
2. If none of the matches are correct, suggest what action to take

Consider:
- The transcript snippet shows what was RECORDED, but the video may have been edited
- Early content might have been trimmed (the user hint might mention this)
- The correct match should have text that semantically matches the transcript start

## Response Format (JSON only)
Respond with ONLY valid JSON in this exact format:
{
  "action": "use_current" | "use_alternative" | "manual_timestamp" | "skip",
  "timestamp": "MM:SS" or "H:MM:SS" (if action is use_alternative or manual_timestamp),
  "timestampSeconds": number (seconds from start, if providing timestamp),
  "confidence": 0-100,
  "reasoning": "Brief explanation of your decision"
}

Actions:
- "use_current": The current algorithmic match is correct
- "use_alternative": Use one of the alternative matches (specify which timestamp)
- "manual_timestamp": You can determine the correct timestamp (provide it)
- "skip": Cannot determine timestamp, chapter should be flagged for manual entry`;

  return prompt;
}

/**
 * Parse timestamp string to seconds
 * Handles both "MM:SS" and "H:MM:SS" formats
 */
function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':').map(Number);
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  } else if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  return 0;
}

/**
 * Verify a chapter timestamp using LLM
 */
export async function verifyChapterWithLLM(
  request: ChapterVerifyRequest
): Promise<ChapterVerifyResponse> {
  try {
    const prompt = buildVerificationPrompt(request);

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    });

    // Extract text from response
    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map(block => block.text)
      .join('');

    // Parse JSON response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in LLM response');
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      action: 'use_current' | 'use_alternative' | 'manual_timestamp' | 'skip';
      timestamp?: string;
      timestampSeconds?: number;
      confidence: number;
      reasoning: string;
    };

    // Build response
    const response: ChapterVerifyResponse = {
      success: true,
      chapter: request.chapter,
      name: request.name,
      recommendation: {
        action: parsed.action,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
      },
    };

    // Add timestamp if provided
    if (parsed.timestamp) {
      response.recommendation.timestamp = parsed.timestamp;
      response.recommendation.timestampSeconds = parsed.timestampSeconds || parseTimestamp(parsed.timestamp);
    } else if (parsed.action === 'use_current' && request.currentMatch) {
      response.recommendation.timestamp = request.currentMatch.timestamp;
      response.recommendation.timestampSeconds = parseTimestamp(request.currentMatch.timestamp);
    }

    return response;
  } catch (error) {
    console.error('LLM verification failed:', error);
    return {
      success: false,
      chapter: request.chapter,
      name: request.name,
      recommendation: {
        action: 'skip',
        confidence: 0,
        reasoning: 'LLM verification failed. Please verify manually.',
      },
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Batch verify multiple chapters (for "Verify All" functionality)
 */
export async function verifyMultipleChapters(
  requests: ChapterVerifyRequest[]
): Promise<ChapterVerifyResponse[]> {
  // Process in parallel with a concurrency limit
  const results: ChapterVerifyResponse[] = [];
  const concurrency = 3;

  for (let i = 0; i < requests.length; i += concurrency) {
    const batch = requests.slice(i, i + concurrency);
    const batchResults = await Promise.all(
      batch.map(req => verifyChapterWithLLM(req))
    );
    results.push(...batchResults);
  }

  return results;
}

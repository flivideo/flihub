// NFR-code-quality-1: extracted from poem-wui.ts to eliminate duplication
export function stripSrt(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^\d+$/.test(trimmed)) continue; // sequence number
    if (/^\d{2}:\d{2}:\d{2},\d{1,3} --> \d{2}:\d{2}:\d{2},\d{1,3}$/.test(trimmed)) continue; // timestamp
    result.push(trimmed);
  }
  return result.join('\n');
}

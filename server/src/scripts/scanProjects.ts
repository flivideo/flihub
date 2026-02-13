/**
 * Project Discrepancy Scanner
 *
 * Scans all projects for naming violations, structural issues,
 * derivative mismatches, and state inconsistencies.
 *
 * Usage:
 *   tsx server/src/scripts/scanProjects.ts
 *
 * Output:
 *   - JSON: docs/analysis/discrepancies.json
 *   - CSV: docs/analysis/discrepancies.csv
 *   - Markdown: docs/analysis/project-discrepancies.md
 */

import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseRecordingFilename, NAMING_RULES } from '../../../shared/naming.js';

// ESM equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// TYPES
// ============================================

type DiscrepancyType = 'naming' | 'structural' | 'derivative' | 'state';
type DiscrepancySeverity = 'error' | 'warning' | 'info';

interface Discrepancy {
  projectCode: string;
  projectPath: string;
  type: DiscrepancyType;
  severity: DiscrepancySeverity;
  issue: string;
  file?: string;
  details?: string;
  suggestion?: string;
}

interface ProjectScanResult {
  projectCode: string;
  projectPath: string;
  fileCount: number;
  discrepancies: Discrepancy[];
}

interface ScanSummary {
  scanDate: string;
  projectsScanned: number;
  projectsWithIssues: number;
  totalIssues: number;
  byType: Record<DiscrepancyType, number>;
  bySeverity: Record<DiscrepancySeverity, number>;
}

// ============================================
// CONFIGURATION
// ============================================

// Get projects root from config or use default
const PROJECTS_ROOT =
  process.env.PROJECTS_ROOT || path.join(process.env.HOME!, 'dev/video-projects/v-appydave');

// PO Decisions (from naming-decisions.md)
// TODO: Update these after PO makes decisions
const DECISIONS = {
  chapterGaps: 'info' as DiscrepancySeverity, // Decision 1
  sequenceGaps: 'info' as DiscrepancySeverity, // Decision 2
  nonSequentialChapters: 'warning' as DiscrepancySeverity, // Decision 3
  sequenceMustStartAt1: false, // Decision 4: don't check
  sameLabelInChapter: false, // Decision 5: don't check
  sameLabelAcrossChapters: false, // Decision 6: don't check
  safeFolderDeprecated: false, // Decision 7: needs investigation
  legacyFormatWarning: 'info' as DiscrepancySeverity, // Decision 8
  missingDerivatives: 'info' as DiscrepancySeverity, // Decision 9
  orphanedDerivatives: 'warning' as DiscrepancySeverity, // Decision 10
};

// ============================================
// SCANNER FUNCTIONS
// ============================================

/**
 * Get all project directories
 */
async function getProjects(rootPath: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(rootPath, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
      .map((entry) => path.join(rootPath, entry.name))
      .sort();
  } catch (error) {
    console.error(`Error reading projects root: ${error}`);
    return [];
  }
}

/**
 * Get all recording files in a project
 */
async function getRecordings(projectPath: string): Promise<string[]> {
  const recordingsPath = path.join(projectPath, 'recordings');
  try {
    const entries = await fs.readdir(recordingsPath);
    return entries
      .filter((f) => /\.(mov|mp4)$/i.test(f) && !f.startsWith('.'))
      .filter((f) => !f.startsWith('-')) // Exclude -safe, -chapters folders
      .sort();
  } catch (error) {
    return [];
  }
}

/**
 * Check for naming violations
 */
function checkNamingViolations(
  projectCode: string,
  projectPath: string,
  filename: string
): Discrepancy[] {
  const discrepancies: Discrepancy[] = [];

  // Try to parse filename
  const parsed = parseRecordingFilename(filename);

  if (!parsed) {
    // Completely unparseable
    discrepancies.push({
      projectCode,
      projectPath,
      type: 'naming',
      severity: 'error',
      issue: 'Unparseable filename',
      file: filename,
      details: 'Filename does not match expected pattern: {chapter}-{sequence}-{label}-{tags}.mov',
      suggestion: 'Rename file to match pattern or investigate why it exists',
    });
    return discrepancies;
  }

  const { chapter, sequence, name } = parsed;

  // Check chapter format (strict: 2 digits)
  if (!NAMING_RULES.chapter.pattern.test(chapter)) {
    const severity: DiscrepancySeverity = /^\d{1}$/.test(chapter) ? 'warning' : 'error';
    discrepancies.push({
      projectCode,
      projectPath,
      type: 'naming',
      severity,
      issue:
        severity === 'error'
          ? 'Invalid chapter format'
          : 'Single-digit chapter (should be zero-padded)',
      file: filename,
      details: `Chapter "${chapter}" should be 2 digits (01-99)`,
      suggestion:
        severity === 'error'
          ? 'Rename to use 2-digit chapter number'
          : `Rename: ${filename} → ${chapter.padStart(2, '0')}-...`,
    });
  }

  // Check sequence format (if present)
  if (sequence && !NAMING_RULES.sequence.pattern.test(sequence)) {
    discrepancies.push({
      projectCode,
      projectPath,
      type: 'naming',
      severity: 'error',
      issue: 'Invalid sequence format',
      file: filename,
      details: `Sequence "${sequence}" should be 1+ digits with no leading zeros`,
      suggestion: 'Remove leading zeros from sequence number',
    });
  }

  // Check for leading zeros in sequence
  if (sequence && /^0\d/.test(sequence)) {
    discrepancies.push({
      projectCode,
      projectPath,
      type: 'naming',
      severity: 'error',
      issue: 'Sequence has leading zero',
      file: filename,
      details: `Sequence "${sequence}" should not have leading zeros`,
      suggestion: `Rename: ${filename} → ${chapter}-${parseInt(sequence, 10)}-...`,
    });
  }

  // Check name format (kebab-case with periods allowed for versioning)
  if (!NAMING_RULES.name.pattern.test(name)) {
    // Common issues
    const hasUppercase = /[A-Z]/.test(name);
    const hasUnderscore = /_/.test(name);
    const hasSpace = /\s/.test(name);
    const details = [];
    if (hasUppercase) details.push('contains uppercase');
    if (hasUnderscore) details.push('contains underscores');
    if (hasSpace) details.push('contains spaces');

    discrepancies.push({
      projectCode,
      projectPath,
      type: 'naming',
      severity: 'error',
      issue: 'Invalid name format',
      file: filename,
      details: `Name "${name}" must be kebab-case (${details.join(', ')})`,
      suggestion: `Convert to lowercase and replace special chars with hyphens`,
    });
  }

  // Check name length
  if (name.length > NAMING_RULES.name.maxLength) {
    discrepancies.push({
      projectCode,
      projectPath,
      type: 'naming',
      severity: 'warning',
      issue: 'Name too long',
      file: filename,
      details: `Name "${name}" is ${name.length} characters (max: ${NAMING_RULES.name.maxLength})`,
      suggestion: 'Shorten name to 50 characters or less',
    });
  }

  // Check for legacy format (no sequence)
  if (!sequence && DECISIONS.legacyFormatWarning) {
    discrepancies.push({
      projectCode,
      projectPath,
      type: 'naming',
      severity: DECISIONS.legacyFormatWarning,
      issue: 'Legacy format (no sequence)',
      file: filename,
      details: 'File uses legacy format without sequence number',
      suggestion: `Consider adding sequence: ${filename} → ${chapter}-1-${name}.mov`,
    });
  }

  // Check tags format - validate that name doesn't contain uppercase parts
  // (Tags must be at the END, and stripTrailingTags removes them from name)
  // So any uppercase part remaining in name means tags are not at the end
  // Tags can contain uppercase letters and numbers (e.g., CTA, 1ST, V2)
  // Pure numbers (e.g., 1, 555) are NOT tags, they're part of the name
  if (name) {
    const nameParts = name.split('-');
    for (const part of nameParts) {
      // Must contain at least one letter to be considered a tag
      if (/^(?=.*[A-Z])[A-Z0-9]+$/.test(part)) {
        discrepancies.push({
          projectCode,
          projectPath,
          type: 'naming',
          severity: 'error',
          issue: 'Uppercase word in name (not at end)',
          file: filename,
          details: `Word "${part}" appears in name but is uppercase. Tags must be at the end.`,
          suggestion: `Move "${part}" to the end, or use lowercase in name: ${part.toLowerCase()}`,
        });
      }
    }
  }

  return discrepancies;
}

/**
 * Check for structural issues
 */
async function checkStructuralIssues(
  projectCode: string,
  projectPath: string,
  recordings: string[]
): Promise<Discrepancy[]> {
  const discrepancies: Discrepancy[] = [];

  // Parse all files
  const parsed = recordings.map((f) => ({
    filename: f,
    parsed: parseRecordingFilename(f),
  }));

  // Group by chapter
  const chapters = new Map<string, typeof parsed>();
  for (const { filename, parsed: p } of parsed) {
    if (!p || !p.chapter) continue;
    if (!chapters.has(p.chapter)) {
      chapters.set(p.chapter, []);
    }
    chapters.get(p.chapter)!.push({ filename, parsed: p });
  }

  // Check chapter gaps
  if (DECISIONS.chapterGaps) {
    const chapterNumbers = Array.from(chapters.keys())
      .map((c) => parseInt(c, 10))
      .sort((a, b) => a - b);

    const gaps: number[] = [];
    for (let i = 0; i < chapterNumbers.length - 1; i++) {
      const current = chapterNumbers[i];
      const next = chapterNumbers[i + 1];
      for (let gap = current + 1; gap < next; gap++) {
        gaps.push(gap);
      }
    }

    if (gaps.length > 0) {
      discrepancies.push({
        projectCode,
        projectPath,
        type: 'structural',
        severity: DECISIONS.chapterGaps,
        issue: 'Chapter gaps detected',
        details: `Missing chapters: ${gaps.map((g) => String(g).padStart(2, '0')).join(', ')}`,
        suggestion:
          DECISIONS.chapterGaps === 'error'
            ? 'Use FR-140 (Bulk Chapter Renumbering) to fill gaps'
            : 'Gaps may be intentional (deleted content). Use FR-140 if you want to fill them.',
      });
    }
  }

  // Check non-sequential chapters
  if (DECISIONS.nonSequentialChapters) {
    const chapterNumbers = Array.from(chapters.keys()).map((c) => parseInt(c, 10));

    // Check if chapters appear in order in the file list
    let prevChapter = -1;
    let nonSequential = false;
    for (const { parsed: p } of parsed) {
      if (!p || !p.chapter) continue;
      const currentChapter = parseInt(p.chapter, 10);
      if (currentChapter < prevChapter) {
        nonSequential = true;
        break;
      }
      prevChapter = currentChapter;
    }

    if (nonSequential) {
      discrepancies.push({
        projectCode,
        projectPath,
        type: 'structural',
        severity: DECISIONS.nonSequentialChapters,
        issue: 'Non-sequential chapters',
        details: 'Chapters appear out of order in file list',
        suggestion: 'Use FR-135 (Chapter Tools) to reorganize chapters',
      });
    }
  }

  // Check sequence gaps within each chapter
  if (DECISIONS.sequenceGaps) {
    for (const [chapterNum, files] of chapters.entries()) {
      const sequences = files
        .filter((f) => f.parsed && f.parsed.sequence)
        .map((f) => parseInt(f.parsed!.sequence!, 10))
        .sort((a, b) => a - b);

      if (sequences.length < 2) continue;

      const gaps: number[] = [];
      for (let i = 0; i < sequences.length - 1; i++) {
        const current = sequences[i];
        const next = sequences[i + 1];
        for (let gap = current + 1; gap < next; gap++) {
          gaps.push(gap);
        }
      }

      if (gaps.length > 0) {
        discrepancies.push({
          projectCode,
          projectPath,
          type: 'structural',
          severity: DECISIONS.sequenceGaps,
          issue: `Sequence gaps in chapter ${chapterNum}`,
          details: `Missing sequences: ${gaps.join(', ')}`,
          suggestion: 'Use FR-138 Rename Tool with "Renumber" option to fill gaps',
        });
      }

      // Check if sequence starts at 1
      if (DECISIONS.sequenceMustStartAt1 && sequences.length > 0 && sequences[0] !== 1) {
        discrepancies.push({
          projectCode,
          projectPath,
          type: 'structural',
          severity: 'warning',
          issue: `Chapter ${chapterNum} sequences don't start at 1`,
          details: `First sequence is ${sequences[0]}`,
          suggestion: 'Use FR-138 Rename Tool with "Renumber starting from: 1"',
        });
      }
    }
  }

  // Check for duplicate sequences in same chapter
  for (const [chapterNum, files] of chapters.entries()) {
    const sequenceCounts = new Map<string, string[]>();

    for (const { filename, parsed: p } of files) {
      if (!p || !p.sequence) continue;
      const key = `${p.chapter}-${p.sequence}`;
      if (!sequenceCounts.has(key)) {
        sequenceCounts.set(key, []);
      }
      sequenceCounts.get(key)!.push(filename);
    }

    for (const [key, filenames] of sequenceCounts.entries()) {
      if (filenames.length > 1) {
        discrepancies.push({
          projectCode,
          projectPath,
          type: 'structural',
          severity: 'error',
          issue: `Duplicate sequence in chapter ${chapterNum}`,
          details: `Files: ${filenames.join(', ')}`,
          suggestion: 'Rename one file to use different sequence number',
        });
      }
    }
  }

  // Check for same label in same chapter (if configured)
  if (DECISIONS.sameLabelInChapter) {
    for (const [chapterNum, files] of chapters.entries()) {
      const labelCounts = new Map<string, string[]>();

      for (const { filename, parsed: p } of files) {
        if (!p || !p.name) continue;
        if (!labelCounts.has(p.name)) {
          labelCounts.set(p.name, []);
        }
        labelCounts.get(p.name)!.push(filename);
      }

      for (const [label, filenames] of labelCounts.entries()) {
        if (filenames.length > 1) {
          discrepancies.push({
            projectCode,
            projectPath,
            type: 'structural',
            severity: 'warning',
            issue: `Duplicate label in chapter ${chapterNum}`,
            details: `Label "${label}" used in: ${filenames.join(', ')}`,
            suggestion: 'Consider using different labels to distinguish segments',
          });
        }
      }
    }
  }

  return discrepancies;
}

/**
 * Check for derivative file mismatches
 */
async function checkDerivatives(
  projectCode: string,
  projectPath: string,
  recordings: string[]
): Promise<Discrepancy[]> {
  const discrepancies: Discrepancy[] = [];

  const shadowsPath = path.join(projectPath, 'recording-shadows');
  const transcriptsPath = path.join(projectPath, 'recording-transcripts');
  const chaptersPath = path.join(projectPath, 'recordings', '-chapters');

  // Get existing shadows
  let shadows: string[] = [];
  try {
    shadows = await fs.readdir(shadowsPath);
    shadows = shadows.filter((f) => f.endsWith('.mp4'));
  } catch {
    // Shadow folder doesn't exist - that's OK
  }

  // Get existing transcripts
  let transcripts: string[] = [];
  try {
    transcripts = await fs.readdir(transcriptsPath);
    transcripts = transcripts.filter((f) => f.endsWith('.txt'));
  } catch {
    // Transcript folder doesn't exist - that's OK
  }

  // Check for missing shadows
  if (DECISIONS.missingDerivatives) {
    for (const recording of recordings) {
      const baseName = recording.replace(/\.(mov|mp4)$/i, '');
      const shadowName = `${baseName}.mp4`;

      if (!shadows.includes(shadowName)) {
        discrepancies.push({
          projectCode,
          projectPath,
          type: 'derivative',
          severity: DECISIONS.missingDerivatives,
          issue: 'Missing shadow file',
          file: recording,
          details: `Shadow file not found: ${shadowName}`,
          suggestion: 'Use FR-136 Regen Shadows tool to regenerate',
        });
      }
    }
  }

  // Check for orphaned shadows
  if (DECISIONS.orphanedDerivatives) {
    for (const shadow of shadows) {
      const baseName = shadow.replace(/\.mp4$/i, '');
      const recordingExists = recordings.some((r) => r.replace(/\.(mov|mp4)$/i, '') === baseName);

      if (!recordingExists) {
        discrepancies.push({
          projectCode,
          projectPath,
          type: 'derivative',
          severity: DECISIONS.orphanedDerivatives,
          issue: 'Orphaned shadow file',
          file: shadow,
          details: `Shadow exists but source recording not found`,
          suggestion: 'Delete orphaned shadow file to save disk space',
        });
      }
    }
  }

  // Check for missing transcripts
  if (DECISIONS.missingDerivatives) {
    for (const recording of recordings) {
      const baseName = recording.replace(/\.(mov|mp4)$/i, '');
      const transcriptName = `${baseName}.txt`;

      if (!transcripts.includes(transcriptName)) {
        discrepancies.push({
          projectCode,
          projectPath,
          type: 'derivative',
          severity: DECISIONS.missingDerivatives,
          issue: 'Missing transcript',
          file: recording,
          details: `Transcript not found (may be queued)`,
          suggestion: 'Use FR-136 Regen Transcripts tool or wait for queue',
        });
      }
    }
  }

  // Check for orphaned transcripts
  if (DECISIONS.orphanedDerivatives) {
    for (const transcript of transcripts) {
      const baseName = transcript.replace(/\.txt$/i, '');
      const recordingExists = recordings.some((r) => r.replace(/\.(mov|mp4)$/i, '') === baseName);

      if (!recordingExists) {
        discrepancies.push({
          projectCode,
          projectPath,
          type: 'derivative',
          severity: DECISIONS.orphanedDerivatives,
          issue: 'Orphaned transcript',
          file: transcript,
          details: `Transcript exists but source recording not found`,
          suggestion: 'Delete orphaned transcript files',
        });
      }
    }
  }

  return discrepancies;
}

/**
 * Check for state inconsistencies
 */
async function checkState(projectCode: string, projectPath: string): Promise<Discrepancy[]> {
  const discrepancies: Discrepancy[] = [];

  // Check for -safe folder (Decision 7)
  if (DECISIONS.safeFolderDeprecated) {
    const safePath = path.join(projectPath, 'recordings', '-safe');
    try {
      const exists = await fs.pathExists(safePath);
      if (exists) {
        const files = await fs.readdir(safePath);
        if (files.length > 0) {
          discrepancies.push({
            projectCode,
            projectPath,
            type: 'state',
            severity: 'warning',
            issue: 'Uses deprecated -safe folder',
            details: `${files.length} files in -safe folder (should be state-based)`,
            suggestion: 'Migrate to state-based safe flags (FR-111)',
          });
        }
      }
    } catch {
      // Ignore errors
    }
  }

  return discrepancies;
}

/**
 * Scan a single project
 */
async function scanProject(projectPath: string): Promise<ProjectScanResult> {
  const projectCode = path.basename(projectPath);
  const recordings = await getRecordings(projectPath);

  const discrepancies: Discrepancy[] = [];

  // Check naming violations for each file
  for (const filename of recordings) {
    const namingIssues = checkNamingViolations(projectCode, projectPath, filename);
    discrepancies.push(...namingIssues);
  }

  // Check structural issues
  const structuralIssues = await checkStructuralIssues(projectCode, projectPath, recordings);
  discrepancies.push(...structuralIssues);

  // Check derivative mismatches
  const derivativeIssues = await checkDerivatives(projectCode, projectPath, recordings);
  discrepancies.push(...derivativeIssues);

  // Check state inconsistencies
  const stateIssues = await checkState(projectCode, projectPath);
  discrepancies.push(...stateIssues);

  return {
    projectCode,
    projectPath,
    fileCount: recordings.length,
    discrepancies,
  };
}

/**
 * Scan all projects
 */
async function scanAllProjects(): Promise<ProjectScanResult[]> {
  const projectPaths = await getProjects(PROJECTS_ROOT);
  const results: ProjectScanResult[] = [];

  console.log(`Scanning ${projectPaths.length} projects...`);

  for (const projectPath of projectPaths) {
    const projectCode = path.basename(projectPath);
    console.log(`  Scanning ${projectCode}...`);

    try {
      const result = await scanProject(projectPath);
      results.push(result);

      if (result.discrepancies.length > 0) {
        console.log(`    Found ${result.discrepancies.length} issues`);
      }
    } catch (error) {
      console.error(`    Error scanning ${projectCode}:`, error);
    }
  }

  return results;
}

/**
 * Generate summary statistics
 */
function generateSummary(results: ProjectScanResult[]): ScanSummary {
  const summary: ScanSummary = {
    scanDate: new Date().toISOString(),
    projectsScanned: results.length,
    projectsWithIssues: results.filter((r) => r.discrepancies.length > 0).length,
    totalIssues: results.reduce((sum, r) => sum + r.discrepancies.length, 0),
    byType: {
      naming: 0,
      structural: 0,
      derivative: 0,
      state: 0,
    },
    bySeverity: {
      error: 0,
      warning: 0,
      info: 0,
    },
  };

  for (const result of results) {
    for (const disc of result.discrepancies) {
      summary.byType[disc.type]++;
      summary.bySeverity[disc.severity]++;
    }
  }

  return summary;
}

/**
 * Export results to JSON
 */
async function exportJSON(results: ProjectScanResult[], summary: ScanSummary): Promise<void> {
  const outputPath = path.join(__dirname, '../../../docs/analysis/discrepancies.json');
  await fs.ensureDir(path.dirname(outputPath));

  const data = {
    summary,
    results,
  };

  await fs.writeJSON(outputPath, data, { spaces: 2 });
  console.log(`\nExported JSON: ${outputPath}`);
}

/**
 * Export results to CSV
 */
async function exportCSV(results: ProjectScanResult[]): Promise<void> {
  const outputPath = path.join(__dirname, '../../../docs/analysis/discrepancies.csv');
  await fs.ensureDir(path.dirname(outputPath));

  const rows = [
    ['Project Code', 'Project Path', 'Type', 'Severity', 'Issue', 'File', 'Details', 'Suggestion'],
  ];

  for (const result of results) {
    for (const disc of result.discrepancies) {
      rows.push([
        result.projectCode,
        result.projectPath,
        disc.type,
        disc.severity,
        disc.issue,
        disc.file || '',
        disc.details || '',
        disc.suggestion || '',
      ]);
    }
  }

  // Properly escape CSV cells (double any quotes, then wrap in quotes)
  const csv = rows
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');
  await fs.writeFile(outputPath, csv);
  console.log(`Exported CSV: ${outputPath}`);
}

/**
 * Export results to Markdown
 */
async function exportMarkdown(results: ProjectScanResult[], summary: ScanSummary): Promise<void> {
  const outputPath = path.join(__dirname, '../../../docs/analysis/project-discrepancies.md');
  await fs.ensureDir(path.dirname(outputPath));

  const lines = [
    '# Project Discrepancy Report',
    '',
    `**Scan Date:** ${new Date(summary.scanDate).toLocaleString()}`,
    `**Projects Scanned:** ${summary.projectsScanned}`,
    `**Projects with Issues:** ${summary.projectsWithIssues}`,
    `**Total Issues Found:** ${summary.totalIssues}`,
    '',
    '## Summary by Type',
    '',
    '| Type | Count | Projects Affected |',
    '|------|-------|-------------------|',
  ];

  // Count projects affected by each type
  const projectsByType = {
    naming: new Set<string>(),
    structural: new Set<string>(),
    derivative: new Set<string>(),
    state: new Set<string>(),
  };

  for (const result of results) {
    for (const disc of result.discrepancies) {
      projectsByType[disc.type].add(result.projectCode);
    }
  }

  for (const [type, count] of Object.entries(summary.byType)) {
    const projectCount = projectsByType[type as DiscrepancyType].size;
    lines.push(`| ${type.charAt(0).toUpperCase() + type.slice(1)} | ${count} | ${projectCount} |`);
  }

  lines.push('');
  lines.push('## Summary by Severity');
  lines.push('');
  lines.push('| Severity | Count | Description |');
  lines.push('|----------|-------|-------------|');
  lines.push(`| ❌ Error | ${summary.bySeverity.error} | Blocks operations, must fix |`);
  lines.push(`| ⚠️ Warning | ${summary.bySeverity.warning} | Should fix, but non-blocking |`);
  lines.push(`| 🔍 Info | ${summary.bySeverity.info} | Informational, may be intentional |`);

  lines.push('');
  lines.push('## Projects with Issues');
  lines.push('');

  for (const result of results) {
    if (result.discrepancies.length === 0) continue;

    lines.push(`### ${result.projectCode} (${result.discrepancies.length} issues)`);
    lines.push('');
    lines.push(`**Path:** \`${result.projectPath}\``);
    lines.push(`**Files:** ${result.fileCount}`);
    lines.push('');

    // Group by type
    const byType = new Map<DiscrepancyType, Discrepancy[]>();
    for (const disc of result.discrepancies) {
      if (!byType.has(disc.type)) {
        byType.set(disc.type, []);
      }
      byType.get(disc.type)!.push(disc);
    }

    for (const [type, discs] of byType.entries()) {
      lines.push(`**${type.charAt(0).toUpperCase() + type.slice(1)} Issues:**`);
      lines.push('');

      for (const disc of discs) {
        const icon = disc.severity === 'error' ? '❌' : disc.severity === 'warning' ? '⚠️' : '🔍';
        lines.push(`${icon} **${disc.issue}**`);
        if (disc.file) {
          lines.push(`  - File: \`${disc.file}\``);
        }
        if (disc.details) {
          lines.push(`  - Details: ${disc.details}`);
        }
        if (disc.suggestion) {
          lines.push(`  - Suggestion: ${disc.suggestion}`);
        }
        lines.push('');
      }
    }

    lines.push('---');
    lines.push('');
  }

  // Projects with no issues
  lines.push('## Projects with No Issues');
  lines.push('');
  for (const result of results) {
    if (result.discrepancies.length === 0) {
      lines.push(`- ✅ **${result.projectCode}** (${result.fileCount} files)`);
    }
  }

  lines.push('');
  lines.push('---');
  lines.push('');
  lines.push('**Generated by:** `server/src/scripts/scanProjects.ts`');
  lines.push(`**Last updated:** ${new Date().toISOString()}`);

  await fs.writeFile(outputPath, lines.join('\n'));
  console.log(`Exported Markdown: ${outputPath}`);
}

/**
 * Main execution
 */
async function main() {
  console.log('='.repeat(60));
  console.log('Project Discrepancy Scanner');
  console.log('='.repeat(60));
  console.log('');
  console.log(`Projects root: ${PROJECTS_ROOT}`);
  console.log('');

  // Check if projects root exists
  const rootExists = await fs.pathExists(PROJECTS_ROOT);
  if (!rootExists) {
    console.error(`ERROR: Projects root not found: ${PROJECTS_ROOT}`);
    console.error('');
    console.error('Set PROJECTS_ROOT environment variable:');
    console.error('  export PROJECTS_ROOT=/path/to/video-projects');
    process.exit(1);
  }

  // Scan all projects
  const results = await scanAllProjects();

  // Generate summary
  const summary = generateSummary(results);

  // Display summary
  console.log('');
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Projects scanned: ${summary.projectsScanned}`);
  console.log(`Projects with issues: ${summary.projectsWithIssues}`);
  console.log(`Total issues: ${summary.totalIssues}`);
  console.log('');
  console.log('By Type:');
  for (const [type, count] of Object.entries(summary.byType)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log('');
  console.log('By Severity:');
  for (const [severity, count] of Object.entries(summary.bySeverity)) {
    console.log(`  ${severity}: ${count}`);
  }

  // Export results
  console.log('');
  console.log('Exporting results...');
  await exportJSON(results, summary);
  await exportCSV(results);
  await exportMarkdown(results, summary);

  console.log('');
  console.log('='.repeat(60));
  console.log('DONE');
  console.log('='.repeat(60));
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { scanProject, scanAllProjects, generateSummary };

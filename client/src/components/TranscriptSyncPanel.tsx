/**
 * FR-75: Transcript Sync Panel
 *
 * Displays transcript with synchronized highlighting as video plays.
 * Supports word-level and phrase-level highlighting modes.
 * Click on text to seek video to that timestamp.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { API_URL } from '../config';
import { parseSrt, srtToTimedWords, findCurrentEntry, findCurrentWord } from '../utils/srt';

// localStorage key for highlight mode preference
const STORAGE_KEY_MODE = 'flihub:watch:highlightMode';

type HighlightMode = 'word' | 'phrase' | 'none';

interface Props {
  projectCode: string;
  segmentName: string | null; // e.g., "01-1-intro" (null if chapter video)
  chapterName?: string | null; // FR-77: e.g., "01-intro" for chapter videos
  currentTime: number; // Video current time in seconds
  onSeek: (time: number) => void; // Callback to seek video
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export function TranscriptSyncPanel({
  projectCode,
  segmentName,
  chapterName,
  currentTime,
  onSeek,
  isCollapsed,
  onToggleCollapse,
}: Props) {
  // SRT data
  const [srtContent, setSrtContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Highlight mode with localStorage persistence
  const [mode, setMode] = useState<HighlightMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_MODE);
    return (saved as HighlightMode) || 'word';
  });

  // Ref for auto-scrolling
  const containerRef = useRef<HTMLDivElement>(null);
  const highlightedRef = useRef<HTMLSpanElement>(null);

  // Parse SRT into entries and words
  const srtEntries = useMemo(() => parseSrt(srtContent), [srtContent]);
  const timedWords = useMemo(() => srtToTimedWords(srtEntries), [srtEntries]);

  // Find current highlighted element
  const currentEntry = useMemo(
    () => findCurrentEntry(srtEntries, currentTime),
    [srtEntries, currentTime]
  );
  const currentWord = useMemo(
    () => findCurrentWord(timedWords, currentTime),
    [timedWords, currentTime]
  );

  // Fetch SRT when segment or chapter changes
  // FR-77: Support both segment SRTs and chapter SRTs
  useEffect(() => {
    // Need either segmentName OR chapterName
    if ((!segmentName && !chapterName) || !projectCode) {
      setSrtContent('');
      setError(null);
      return;
    }

    const fetchSrt = async () => {
      setLoading(true);
      setError(null);

      try {
        // FR-77: Use different endpoint for chapter vs segment
        const url = chapterName
          ? `${API_URL}/api/query/projects/${projectCode}/transcripts/chapters/${chapterName}/srt`
          : `${API_URL}/api/query/projects/${projectCode}/transcripts/${segmentName}/srt`;

        const response = await fetch(url);

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.srt?.content) {
            setSrtContent(data.srt.content);
          } else {
            setSrtContent('');
            setError('No SRT content');
          }
        } else if (response.status === 404) {
          setSrtContent('');
          setError(
            chapterName
              ? 'Chapter SRT not found - regenerate chapter recording to create SRT'
              : 'SRT file not found - transcribe this segment to enable sync'
          );
        } else {
          setError('Failed to load SRT');
        }
      } catch (err) {
        console.error('Error fetching SRT:', err);
        setError('Failed to load SRT');
      } finally {
        setLoading(false);
      }
    };

    fetchSrt();
  }, [projectCode, segmentName, chapterName]);

  // Auto-scroll to keep highlighted text visible
  useEffect(() => {
    if (highlightedRef.current && containerRef.current && !isCollapsed) {
      const container = containerRef.current;
      const highlighted = highlightedRef.current;
      const containerRect = container.getBoundingClientRect();
      const highlightedRect = highlighted.getBoundingClientRect();

      // Check if highlighted element is outside visible area
      const isAbove = highlightedRect.top < containerRect.top;
      const isBelow = highlightedRect.bottom > containerRect.bottom;

      if (isAbove || isBelow) {
        highlighted.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
        });
      }
    }
  }, [currentEntry, currentWord, mode, isCollapsed]);

  // Handle mode toggle - cycles through: word → phrase → none → word
  const handleModeToggle = useCallback(() => {
    setMode((prev) => {
      const modes: HighlightMode[] = ['word', 'phrase', 'none'];
      const currentIndex = modes.indexOf(prev);
      const newMode = modes[(currentIndex + 1) % modes.length];
      localStorage.setItem(STORAGE_KEY_MODE, newMode);
      return newMode;
    });
  }, []);

  // Handle click on word/phrase to seek
  const handleWordClick = useCallback(
    (time: number) => {
      onSeek(time);
    },
    [onSeek]
  );

  // Render transcript with highlighting
  const renderTranscript = () => {
    if (loading) {
      return <div className="text-center py-8 text-warm-muted">Loading transcript...</div>;
    }

    if (error) {
      return <div className="text-center py-8 text-warm-muted">{error}</div>;
    }

    if (srtEntries.length === 0) {
      return <div className="text-center py-8 text-warm-muted">No transcript available</div>;
    }

    if (mode === 'none') {
      // None mode: plain text, no highlighting, but still clickable
      const fullText = srtEntries.map((e) => e.text).join(' ');
      return (
        <div className="leading-relaxed text-sm text-warm-secondary whitespace-pre-wrap">{fullText}</div>
      );
    }

    if (mode === 'phrase') {
      // Phrase mode: highlight entire SRT entries
      return (
        <div className="leading-relaxed text-sm text-warm-secondary">
          {srtEntries.map((entry, i) => {
            const isHighlighted = currentEntry?.index === entry.index;
            return (
              <span
                key={entry.index}
                ref={isHighlighted ? highlightedRef : null}
                onClick={() => handleWordClick(entry.startTime)}
                className={`cursor-pointer transition-colors duration-150 ${
                  isHighlighted ? 'bg-yellow-200 text-warm-primary px-1 rounded' : 'hover:bg-surface-hover'
                }`}
              >
                {entry.text}
                {i < srtEntries.length - 1 ? ' ' : ''}
              </span>
            );
          })}
        </div>
      );
    }

    // Word mode: highlight individual words
    return (
      <div className="leading-relaxed text-sm text-warm-secondary">
        {timedWords.map((tw, i) => {
          const isHighlighted = currentWord?.startTime === tw.startTime;
          return (
            <span
              key={`${tw.entryIndex}-${i}`}
              ref={isHighlighted ? highlightedRef : null}
              onClick={() => handleWordClick(tw.startTime)}
              className={`cursor-pointer transition-colors duration-100 ${
                isHighlighted
                  ? 'bg-yellow-300 text-warm-primary px-0.5 rounded font-medium'
                  : 'hover:bg-surface-hover'
              }`}
            >
              {tw.word}
              {i < timedWords.length - 1 ? ' ' : ''}
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <div className="bg-surface rounded-lg border border-warm overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between bg-surface-muted">
        <button
          onClick={onToggleCollapse}
          className="flex items-center gap-2 hover:text-warm-primary transition-colors"
        >
          <span className="text-warm-muted">📝</span>
          <span className="font-medium text-warm-secondary">
            {chapterName ? 'Chapter Transcript Sync' : 'Transcript Sync'}
          </span>
          {chapterName && (
            <span className="text-xs text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
              Chapter
            </span>
          )}
          <span className="text-warm-muted text-sm">{isCollapsed ? '▼' : '▲'}</span>
        </button>

        {/* Mode Toggle */}
        {!isCollapsed && srtEntries.length > 0 && (
          <button
            onClick={handleModeToggle}
            className={`px-3 py-1 text-xs rounded-full transition-colors ${
              mode === 'none'
                ? 'bg-surface-muted text-warm-muted'
                : 'bg-surface-muted hover:bg-surface-hover text-warm-secondary'
            }`}
            title={`Currently: ${mode} mode. Click to cycle: Word → Phrase → None`}
          >
            {mode === 'word' ? 'Word' : mode === 'phrase' ? 'Phrase' : 'None'} ↔
          </button>
        )}
      </div>

      {/* Content */}
      {!isCollapsed && (
        <div ref={containerRef} className="p-4 max-h-60 overflow-y-auto">
          {renderTranscript()}
        </div>
      )}
    </div>
  );
}

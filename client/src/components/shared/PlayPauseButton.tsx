// B068: Extracted shared play/pause toggle button
// Used by VideoPlayerModal and WatchPage

export interface PlayPauseButtonProps {
  isPlaying: boolean;
  onClick: () => void;
}

export function PlayPauseButton({ isPlaying, onClick }: PlayPauseButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`text-lg transition-colors ${
        isPlaying ? 'text-red-500 hover:text-red-600' : 'text-blue-500 hover:text-blue-600'
      }`}
      title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
    >
      {isPlaying ? '\u23F9' : '\u25B6'}
    </button>
  );
}

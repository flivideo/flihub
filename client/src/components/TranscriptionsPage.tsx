// FR-30: Transcription monitoring page
// FR-52: Added TranscriptionProgressBar for project-wide status
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getSocket } from '../hooks/useSocket';
import { OpenFolderButton } from './shared';
import { TranscriptModal } from './TranscriptModal';
import { TranscriptionProgressBar } from './TranscriptionProgressBar';
import { QUERY_KEYS } from '../constants/queryKeys';
import { API_URL } from '../config';
import { formatDuration, formatFileSize } from '../utils/formatting';
import { useConfig } from '../hooks/useApi';
import type { TranscriptionsResponse, QueryTranscript } from '../../../shared/types';

export function TranscriptionsPage() {
  const queryClient = useQueryClient();
  const [streamingText, setStreamingText] = useState('');
  const [viewingTranscript, setViewingTranscript] = useState<string | null>(null);

  // Get active project
  const { data: config } = useConfig();
  const activeProject = config?.activeProject;

  // Fetch transcription state (jobs)
  const { data, refetch } = useQuery<TranscriptionsResponse>({
    queryKey: QUERY_KEYS.transcriptions,
    queryFn: async () => {
      const res = await fetch(`${API_URL}/api/transcriptions`);
      return res.json();
    },
    refetchInterval: 5000, // Fallback polling
  });

  // Fetch transcript files for active project
  const { data: transcriptsData } = useQuery<{ success: boolean; transcripts: QueryTranscript[] }>({
    queryKey: ['project-transcripts', activeProject],
    queryFn: async () => {
      if (!activeProject) return { success: true, transcripts: [] };
      const res = await fetch(`${API_URL}/api/query/projects/${activeProject}/transcripts`);
      return res.json();
    },
    enabled: !!activeProject,
    refetchInterval: 10000, // Refresh every 10s
  });

  // Listen for socket events
  useEffect(() => {
    const socket = getSocket();

    const handleProgress = ({ text }: { jobId: string; text: string }) => {
      setStreamingText((prev) => prev + text);
    };

    const handleComplete = () => {
      setStreamingText('');
      refetch();
      // Also invalidate recordings to update status badges
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings });
      // FR-52: Invalidate project stats to update progress bar
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      // Invalidate project transcripts to update the list
      queryClient.invalidateQueries({ queryKey: ['project-transcripts', activeProject] });
    };

    const handleError = () => {
      setStreamingText('');
      refetch();
    };

    const handleStarted = () => {
      setStreamingText('');
      refetch();
    };

    const handleQueued = () => {
      refetch();
    };

    socket.on('transcription:progress', handleProgress);
    socket.on('transcription:complete', handleComplete);
    socket.on('transcription:error', handleError);
    socket.on('transcription:started', handleStarted);
    socket.on('transcription:queued', handleQueued);

    return () => {
      socket.off('transcription:progress', handleProgress);
      socket.off('transcription:complete', handleComplete);
      socket.off('transcription:error', handleError);
      socket.off('transcription:started', handleStarted);
      socket.off('transcription:queued', handleQueued);
    };
  }, [refetch, queryClient]);

  const { active, queue, recent } = data || { active: null, queue: [], recent: [] };
  const transcripts = transcriptsData?.transcripts || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Transcriptions</h2>
        <OpenFolderButton folder="transcripts" label="Transcripts" />
      </div>

      {/* FR-52: Progress bar at top of page */}
      <TranscriptionProgressBar transcriptionData={data} />

      {/* Transcript Files for Active Project */}
      {activeProject && (
        <section>
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            PROJECT TRANSCRIPTS
            <span className="text-gray-400 ml-1">
              ({activeProject}) {transcripts.length > 0 && `- ${transcripts.length} files`}
            </span>
          </h3>
          {transcripts.length === 0 ? (
            <div className="bg-white border rounded-lg p-4 text-center text-gray-500">
              <p className="text-sm">No transcripts yet</p>
              <p className="text-xs text-gray-400 mt-1">
                Transcripts will appear here after you rename recordings
              </p>
            </div>
          ) : (
            <div className="bg-white border rounded-lg divide-y">
              {transcripts.map((transcript) => (
                <div
                  key={transcript.filename}
                  className="p-3 flex items-center justify-between hover:bg-gray-50"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-mono text-sm text-blue-600">
                      {transcript.chapter}-{transcript.sequence}
                    </span>
                    <span className="text-sm text-gray-700">{transcript.name}</span>
                    <span className="text-xs text-gray-400">{formatFileSize(transcript.size)}</span>
                  </div>
                  {transcript.preview && (
                    <div className="text-xs text-gray-400 italic max-w-md truncate ml-4">
                      {transcript.preview}
                    </div>
                  )}
                  <button
                    onClick={() =>
                      setViewingTranscript(transcript.filename.replace('.txt', '.mov'))
                    }
                    className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded ml-3"
                  >
                    View
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Active transcription */}
      {active && (
        <section>
          <h3 className="text-sm font-medium text-gray-500 mb-2">ACTIVE</h3>
          <div className="border rounded-lg p-4 bg-blue-50">
            <div className="flex items-center gap-3 mb-2">
              <span className="animate-pulse text-blue-600">&#9679;</span>
              <span className="font-medium">{active.videoFilename}</span>
              <span className="font-mono text-sm text-gray-500">
                {formatDuration(active.duration)}
              </span>
              <span className="text-sm text-gray-500">
                {active.size ? formatFileSize(active.size) : '-'}
              </span>
            </div>
            <div className="text-xs text-gray-500 mb-3">
              Started{' '}
              {active.startedAt ? new Date(active.startedAt).toLocaleTimeString() : 'just now'}
            </div>
            <div className="bg-white rounded border p-3 max-h-48 overflow-y-auto font-mono text-sm whitespace-pre-wrap">
              {streamingText || active.streamedText || 'Processing...'}
              <span className="animate-pulse ml-0.5 text-blue-600">|</span>
            </div>
          </div>
        </section>
      )}

      {/* Queue */}
      {queue.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-gray-500 mb-2">
            QUEUE <span className="text-gray-400">({queue.length} pending)</span>
          </h3>
          <div className="bg-white border rounded-lg divide-y">
            {queue.map((job, index) => (
              <div key={job.jobId} className="p-3 flex items-center gap-3">
                <span className="text-gray-400 text-sm w-6">{index + 1}.</span>
                <span className="font-mono text-sm">{job.videoFilename}</span>
                <span className="font-mono text-sm text-gray-400">
                  {formatDuration(job.duration)}
                </span>
                <span className="text-sm text-gray-400">
                  {job.size ? formatFileSize(job.size) : '-'}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent */}
      {recent.length > 0 && (
        <section>
          <h3 className="text-sm font-medium text-gray-500 mb-2">RECENT</h3>
          <div className="bg-white border rounded-lg divide-y">
            {recent.map((job) => (
              <div key={job.jobId} className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusIcon status={job.status} />
                  <span className="font-mono text-sm">{job.videoFilename}</span>
                  <span className="font-mono text-sm text-gray-400">
                    {formatDuration(job.duration)}
                  </span>
                  <span className="text-sm text-gray-400">
                    {job.size ? formatFileSize(job.size) : '-'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {job.status === 'complete' && (
                    <button
                      onClick={() => setViewingTranscript(job.videoFilename)}
                      className="text-xs text-blue-600 hover:text-blue-700 px-2 py-1 hover:bg-blue-50 rounded"
                    >
                      View
                    </button>
                  )}
                  {job.status === 'error' && job.error && (
                    <span className="text-xs text-red-500" title={job.error}>
                      {job.error.length > 30 ? job.error.slice(0, 30) + '...' : job.error}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Transcript Modal */}
      {viewingTranscript && (
        <TranscriptModal filename={viewingTranscript} onClose={() => setViewingTranscript(null)} />
      )}
    </div>
  );
}

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'complete':
      return <span className="text-green-500">&#10003;</span>;
    case 'error':
      return <span className="text-red-500">&#10005;</span>;
    default:
      return <span className="text-gray-400">&#9675;</span>;
  }
}

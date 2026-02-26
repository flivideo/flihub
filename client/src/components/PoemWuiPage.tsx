// FR-144: POEM WUI Workflow Intake Page
import { useMemo, useState } from 'react';
import { usePoemWuiStatus, useSendToPoem } from '../hooks/usePoemWuiApi';

export function PoemWuiPage() {
  const { data, isLoading, refetch } = usePoemWuiStatus();
  const send = useSendToPoem();

  const payloadJson = useMemo(() => {
    if (!data?.transcriptFound) return null;
    const payload = {
      workflowId: 'youtube-launch-optimizer',
      store: {
        projectFolder: data.projectFolder ?? '',
        transcript: data.transcript ?? '',
        chapterFolderNames: [],
        srt: data.srtRaw ?? null,
        brandConfig: null,
      },
    };
    return JSON.stringify(payload, null, 2);
  }, [data]);

  const [copied, setCopied] = useState(false);

  const handleSend = async () => {
    await send.mutateAsync();
  };

  const handleCopyPayload = async () => {
    if (!payloadJson) return;
    await navigator.clipboard.writeText(payloadJson);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-700">POEM WUI</h2>
        <button
          onClick={() => refetch()}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-gray-500">Loading...</div>
      ) : !data?.success ? (
        <div className="text-sm text-red-500">{data?.error || 'No project selected'}</div>
      ) : (
        <div className="space-y-4">
          {/* Status bar */}
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span className="font-medium text-gray-700">Project:</span>
                  <span className="font-mono">{data.projectFolder || '—'}</span>
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span className="font-medium text-gray-700">SRT:</span>
                  {data.transcriptFound ? (
                    <>
                      <span className="font-mono text-gray-700">{data.srtFile}</span>
                      <span className="text-green-600">✓</span>
                    </>
                  ) : (
                    <span className="text-red-500">No SRT found — check s3-staging/post/, final/, or recording-transcripts/</span>
                  )}
                </div>
                <div className="text-xs text-gray-500 flex items-center gap-2">
                  <span className="font-medium text-gray-700">Brand config:</span>
                  {data.brandConfigFound ? (
                    <span className="text-green-600">✓ loaded</span>
                  ) : (
                    <span className="text-amber-500">⚠ not found — brandConfig will be null</span>
                  )}
                </div>
              </div>
              <button
                onClick={handleSend}
                disabled={!data.transcriptFound || send.isPending}
                title={!data.transcriptFound ? 'No SRT file found' : undefined}
                className="px-4 py-2 text-sm bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
              >
                {send.isPending ? (
                  <>
                    <span className="animate-spin inline-block">⟳</span>
                    <span>Sending...</span>
                  </>
                ) : (
                  'Send to POEM WUI →'
                )}
              </button>
            </div>
          </div>

          {/* Transcript + Payload side by side */}
          {data.transcriptFound && data.transcript ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase">
                  Transcript
                  <span className="ml-2 font-normal text-gray-400">
                    ({data.transcript.split('\n').filter(Boolean).length} lines · {data.transcript.length.toLocaleString()} chars)
                  </span>
                </div>
                <textarea
                  readOnly
                  value={data.transcript}
                  className="w-full h-[calc(100vh-300px)] min-h-64 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
              <div className="space-y-1">
                <div className="text-xs font-medium text-gray-500 uppercase flex items-center justify-between">
                  <span>
                    JSON Payload
                    <span className="ml-2 font-normal text-gray-400 normal-case">
                      ({payloadJson ? payloadJson.length.toLocaleString() : 0} chars)
                    </span>
                  </span>
                  <button
                    onClick={handleCopyPayload}
                    disabled={!payloadJson}
                    className="text-xs font-normal normal-case px-2 py-0.5 rounded bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors disabled:opacity-50"
                  >
                    {copied ? '✓ Copied' : '📋 Copy'}
                  </button>
                </div>
                <textarea
                  readOnly
                  value={payloadJson ?? ''}
                  className="w-full h-[calc(100vh-300px)] min-h-64 text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-purple-300"
                />
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center text-sm text-gray-400">
              No transcript available. Make sure an SRT file is present in one of:
              <div className="mt-2 font-mono text-xs space-y-0.5">
                <div>s3-staging/post/*.srt</div>
                <div>final/*.srt</div>
                <div>recording-transcripts/*.srt</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

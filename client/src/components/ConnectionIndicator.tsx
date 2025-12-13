// FR-28: Server Connection Indicator

type ConnectionState = 'connected' | 'disconnected' | 'reconnecting'

interface ConnectionIndicatorProps {
  isConnected: boolean
  isReconnecting: boolean
}

const STATE_CONFIG = {
  connected: { color: 'bg-green-500', tooltip: 'Connected' },
  disconnected: { color: 'bg-red-500', tooltip: 'Disconnected' },
  reconnecting: { color: 'bg-yellow-500', tooltip: 'Reconnecting...' },
}

export function ConnectionIndicator({ isConnected, isReconnecting }: ConnectionIndicatorProps) {
  const state: ConnectionState = isReconnecting
    ? 'reconnecting'
    : isConnected
      ? 'connected'
      : 'disconnected'

  const config = STATE_CONFIG[state]

  return (
    <div className="relative group">
      <div className={`w-2 h-2 rounded-full ${config.color}`} />
      <span className="absolute bottom-full right-0 mb-1 px-2 py-1 text-xs bg-gray-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {config.tooltip}
      </span>
    </div>
  )
}

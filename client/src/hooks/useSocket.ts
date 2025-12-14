import { useEffect, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { QUERY_KEYS } from '../constants/queryKeys'
import { API_URL } from '../config'
import type { FileInfo, ServerToClientEvents, ClientToServerEvents } from '../../../shared/types'

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null

function getSocket(): Socket<ServerToClientEvents, ClientToServerEvents> {
  if (!socket) {
    socket = io(API_URL, {
      transports: ['websocket', 'polling'],
    })
  }
  return socket
}

// Export for other hooks to use
export { getSocket }

export function useSocket() {
  const [files, setFiles] = useState<FileInfo[]>([])
  const [connected, setConnected] = useState(false)
  const [isReconnecting, setIsReconnecting] = useState(false)

  useEffect(() => {
    const socket = getSocket()

    socket.on('connect', () => {
      setConnected(true)
      setIsReconnecting(false)
      console.log('Connected to server')
    })

    socket.on('disconnect', () => {
      setConnected(false)
      console.log('Disconnected from server')
    })

    // FR-28: Track reconnection attempts
    socket.io.on('reconnect_attempt', () => {
      setIsReconnecting(true)
      console.log('Reconnecting to server...')
    })

    socket.on('file:new', (file: FileInfo) => {
      setFiles((prev) => {
        // Avoid duplicates
        if (prev.some((f) => f.path === file.path)) {
          return prev
        }
        toast.info(`New file: ${file.filename}`)
        return [...prev, file]
      })
    })

    socket.on('file:renamed', ({ oldPath, newPath }) => {
      setFiles((prev) => prev.filter((f) => f.path !== oldPath))
      toast.success(`Renamed to: ${newPath.split('/').pop()}`)
    })

    // FR-4: Handle file deleted from disk
    socket.on('file:deleted', ({ path }) => {
      setFiles((prev) => prev.filter((f) => f.path !== path))
      toast.info(`File removed (deleted from disk)`)
    })

    socket.on('file:error', ({ path, error }) => {
      toast.error(`Error with ${path.split('/').pop()}: ${error}`)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('file:new')
      socket.off('file:renamed')
      socket.off('file:deleted')
      socket.off('file:error')
      socket.io.off('reconnect_attempt')
    }
  }, [])

  const removeFile = useCallback((path: string) => {
    setFiles((prev) => prev.filter((f) => f.path !== path))
  }, [])

  return { files, connected, isReconnecting, removeFile }
}

// NFR-5: Hook for thumbs socket events - invalidates React Query cache
export function useThumbsSocket() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSocket()

    const handleThumbsChanged = () => {
      console.log('Socket: thumbs:changed - invalidating cache')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.thumbs })
    }

    const handleZipAdded = () => {
      console.log('Socket: thumbs:zip-added - invalidating cache')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.thumbZips })
    }

    socket.on('thumbs:changed', handleThumbsChanged)
    socket.on('thumbs:zip-added', handleZipAdded)

    return () => {
      socket.off('thumbs:changed', handleThumbsChanged)
      socket.off('thumbs:zip-added', handleZipAdded)
    }
  }, [queryClient])
}

// NFR-5: Hook for assets socket events - invalidates React Query cache
export function useAssetsSocket() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSocket()

    const handleIncomingChanged = () => {
      console.log('Socket: assets:incoming-changed - invalidating cache')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.incomingImages })
    }

    const handleAssignedChanged = () => {
      console.log('Socket: assets:assigned-changed - invalidating cache')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projectImages })
    }

    socket.on('assets:incoming-changed', handleIncomingChanged)
    socket.on('assets:assigned-changed', handleAssignedChanged)

    return () => {
      socket.off('assets:incoming-changed', handleIncomingChanged)
      socket.off('assets:assigned-changed', handleAssignedChanged)
    }
  }, [queryClient])
}

// NFR-5: Hook for recordings socket events - invalidates React Query cache
export function useRecordingsSocket() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSocket()

    const handleRecordingsChanged = () => {
      console.log('Socket: recordings:changed - invalidating cache')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.recordings })
    }

    socket.on('recordings:changed', handleRecordingsChanged)

    return () => {
      socket.off('recordings:changed', handleRecordingsChanged)
    }
  }, [queryClient])
}

// NFR-5: Hook for projects socket events - invalidates React Query cache
export function useProjectsSocket() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSocket()

    const handleProjectsChanged = () => {
      console.log('Socket: projects:changed - invalidating cache')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects })
    }

    socket.on('projects:changed', handleProjectsChanged)

    return () => {
      socket.off('projects:changed', handleProjectsChanged)
    }
  }, [queryClient])
}

// FR-59: Hook for inbox socket events - invalidates React Query cache
export function useInboxSocket(projectCode: string | null) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!projectCode) return

    const socket = getSocket()

    const handleInboxChanged = () => {
      console.log('Socket: inbox:changed - invalidating cache')
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inbox(projectCode) })
    }

    socket.on('inbox:changed', handleInboxChanged)

    return () => {
      socket.off('inbox:changed', handleInboxChanged)
    }
  }, [queryClient, projectCode])
}

// FR-58: Hook for chapter recording socket events - shows completion toast
export function useChapterRecordingSocket() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSocket()

    const handleComplete = (data: { generated: string[]; errors?: string[] }) => {
      console.log('Socket: chapters:complete', data)
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chapterRecordingStatus })

      if (data.generated.length > 0) {
        toast.success(`Generated ${data.generated.length} chapter recording${data.generated.length > 1 ? 's' : ''}`)
      }
      if (data.errors && data.errors.length > 0) {
        toast.error(`${data.errors.length} error${data.errors.length > 1 ? 's' : ''} during generation`)
      }
    }

    socket.on('chapters:complete', handleComplete)

    return () => {
      socket.off('chapters:complete', handleComplete)
    }
  }, [queryClient])
}

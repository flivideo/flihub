/**
 * API Registry
 * Metadata for all FliHub REST API endpoints
 */

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
export type ParameterType = 'path' | 'query' | 'body'
export type DataType = 'string' | 'number' | 'boolean' | 'object' | 'array'

export interface ApiParameter {
  name: string
  type: ParameterType
  dataType: DataType
  description?: string
  required?: boolean
  enum?: string[]
  example?: any
  properties?: ApiParameter[] // For object/array types
}

export interface ApiEndpoint {
  id: string
  method: HttpMethod
  path: string
  group: string
  description: string
  parameters: ApiParameter[]
  exampleResponse?: any
  notes?: string
}

/**
 * API Endpoint Registry
 * Grouped by functional area
 */
export const API_ENDPOINTS: ApiEndpoint[] = [
  // ========================================
  // Query API (Read-only, LLM-optimized)
  // ========================================
  {
    id: 'query-config',
    method: 'GET',
    path: '/api/query/config',
    group: 'Query API',
    description: 'Get configuration metadata (stages, priorities, tags, etc.)',
    parameters: [],
    exampleResponse: {
      success: true,
      stages: ['planning', 'recording', 'first-edit'],
      priorities: ['normal', 'pinned'],
      tags: ['CTA', 'SKOOL']
    }
  },
  {
    id: 'query-projects',
    method: 'GET',
    path: '/api/query/projects',
    group: 'Query API',
    description: 'List all projects with optional filtering',
    parameters: [
      {
        name: 'filter',
        type: 'query',
        dataType: 'string',
        enum: ['pinned', 'all'],
        description: 'Filter projects by priority'
      },
      {
        name: 'stage',
        type: 'query',
        dataType: 'string',
        description: 'Filter by stage (e.g., "recording", "first-edit")'
      },
      {
        name: 'recent',
        type: 'query',
        dataType: 'number',
        description: 'Limit to N most recent projects',
        example: 10
      },
      {
        name: 'format',
        type: 'query',
        dataType: 'string',
        enum: ['json', 'text'],
        description: 'Output format (text for CLI)'
      }
    ],
    exampleResponse: {
      success: true,
      projects: [
        {
          code: 'b85-example',
          stage: 'recording',
          priority: 'pinned',
          recordingsCount: 24
        }
      ]
    }
  },
  {
    id: 'query-project-detail',
    method: 'GET',
    path: '/api/query/projects/:code',
    group: 'Query API',
    description: 'Get full project details with stats',
    parameters: [
      {
        name: 'code',
        type: 'path',
        dataType: 'string',
        required: true,
        description: 'Project code (e.g., "b85-example")',
        example: 'b85-example'
      }
    ],
    exampleResponse: {
      success: true,
      project: {
        code: 'b85-example',
        path: '/path/to/project',
        stage: 'recording',
        recordingsCount: 24,
        transcriptPercent: 100
      }
    }
  },
  {
    id: 'query-recordings',
    method: 'GET',
    path: '/api/query/projects/:code/recordings',
    group: 'Query API',
    description: 'List recordings for a project',
    parameters: [
      {
        name: 'code',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'b85-example'
      },
      {
        name: 'chapter',
        type: 'query',
        dataType: 'string',
        description: 'Filter by chapter number',
        example: '10'
      },
      {
        name: 'missing-transcripts',
        type: 'query',
        dataType: 'boolean',
        description: 'Only show files without transcripts'
      },
      {
        name: 'format',
        type: 'query',
        dataType: 'string',
        enum: ['json', 'text']
      }
    ],
    exampleResponse: {
      success: true,
      recordings: [
        {
          filename: '10-5-intro-CTA.mov',
          chapter: '10',
          sequence: '5',
          name: 'intro',
          duration: 125.5
        }
      ]
    }
  },
  {
    id: 'query-transcripts',
    method: 'GET',
    path: '/api/query/projects/:code/transcripts',
    group: 'Query API',
    description: 'List transcripts for a project',
    parameters: [
      {
        name: 'code',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'b85-example'
      },
      {
        name: 'chapter',
        type: 'query',
        dataType: 'string',
        description: 'Filter by chapter'
      },
      {
        name: 'segments',
        type: 'query',
        dataType: 'string',
        description: 'Filter by segments (comma-delimited, e.g., "1,2,3")',
        example: '1,2,3'
      },
      {
        name: 'include',
        type: 'query',
        dataType: 'string',
        description: 'Set to "content" to get full transcript text (default: preview only)',
        enum: ['content']
      }
    ],
    exampleResponse: {
      success: true,
      transcripts: [
        {
          filename: '10-5-intro.txt',
          chapter: '10',
          sequence: '5'
        }
      ]
    }
  },
  {
    id: 'query-chapters',
    method: 'GET',
    path: '/api/query/projects/:code/chapters',
    group: 'Query API',
    description: 'Get chapter timestamps extracted from SRT',
    parameters: [
      {
        name: 'code',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'b85-example'
      }
    ],
    exampleResponse: {
      success: true,
      chapters: [
        {
          chapter: '01',
          name: 'Introduction',
          timestamp: '00:00:00'
        }
      ]
    }
  },
  {
    id: 'query-images',
    method: 'GET',
    path: '/api/query/projects/:code/images',
    group: 'Query API',
    description: 'List images for a project',
    parameters: [
      {
        name: 'code',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'b85-example'
      },
      {
        name: 'chapter',
        type: 'query',
        dataType: 'string',
        description: 'Filter by chapter'
      }
    ],
    exampleResponse: {
      success: true,
      images: [
        {
          filename: '05-3-2a-workflow.png',
          chapter: '05',
          sequence: '3',
          label: 'workflow'
        }
      ]
    }
  },
  {
    id: 'query-export',
    method: 'GET',
    path: '/api/query/projects/:code/export',
    group: 'Query API',
    description: 'Export combined project data (for LLM context)',
    parameters: [
      {
        name: 'code',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'b85-example'
      },
      {
        name: 'include',
        type: 'query',
        dataType: 'string',
        description: 'Comma-separated: project,recordings,transcripts,chapters,images',
        example: 'project,recordings,transcripts'
      },
      {
        name: 'format',
        type: 'query',
        dataType: 'string',
        enum: ['json', 'text']
      }
    ],
    exampleResponse: {
      success: true,
      project: {},
      recordings: [],
      transcripts: []
    }
  },
  {
    id: 'query-inbox',
    method: 'GET',
    path: '/api/query/projects/:code/inbox',
    group: 'Query API',
    description: 'List inbox files and subfolders',
    parameters: [
      {
        name: 'code',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'b85-example'
      }
    ],
    exampleResponse: {
      success: true,
      folders: [
        {
          name: 'raw',
          files: ['notes.md'],
          totalSize: 1024
        }
      ]
    }
  },
  {
    id: 'query-inbox-file',
    method: 'GET',
    path: '/api/query/projects/:code/inbox/:subfolder/:filename',
    group: 'Query API',
    description: 'Read inbox file content',
    parameters: [
      {
        name: 'code',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'b85-example'
      },
      {
        name: 'subfolder',
        type: 'path',
        dataType: 'string',
        required: true,
        description: 'Subfolder name or "(root)" for root files',
        example: 'raw'
      },
      {
        name: 'filename',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'notes.md'
      }
    ],
    exampleResponse: {
      success: true,
      content: '# Project Notes\n...'
    }
  },

  // ========================================
  // Configuration
  // ========================================
  {
    id: 'get-config',
    method: 'GET',
    path: '/api/config',
    group: 'Configuration',
    description: 'Get current server configuration',
    parameters: [],
    exampleResponse: {
      watchDirectory: '~/Movies/Ecamm Live',
      projectsRootDirectory: '~/dev/video-projects/v-appydave',
      activeProject: 'b72-project-name',
      availableTags: ['CTA', 'SKOOL']
    }
  },
  {
    id: 'update-config',
    method: 'POST',
    path: '/api/config',
    group: 'Configuration',
    description: 'Update server configuration',
    parameters: [
      {
        name: 'watchDirectory',
        type: 'body',
        dataType: 'string',
        description: 'Ecamm recording watch directory'
      },
      {
        name: 'projectsRootDirectory',
        type: 'body',
        dataType: 'string',
        description: 'Root directory for all projects'
      },
      {
        name: 'activeProject',
        type: 'body',
        dataType: 'string',
        description: 'Current active project code'
      }
    ],
    exampleResponse: {
      success: true
    }
  },

  // ========================================
  // Projects
  // ========================================
  {
    id: 'get-projects',
    method: 'GET',
    path: '/api/projects/stats',
    group: 'Projects',
    description: 'Get stats for all projects',
    parameters: [],
    exampleResponse: {
      projects: [
        {
          code: 'b72-project',
          recordingsCount: 15,
          stage: 'recording',
          transcriptPercent: 80
        }
      ]
    }
  },
  {
    id: 'create-project',
    method: 'POST',
    path: '/api/projects',
    group: 'Projects',
    description: 'Create a new project',
    parameters: [
      {
        name: 'code',
        type: 'body',
        dataType: 'string',
        required: true,
        description: 'Project code (e.g., "b73-new-project")',
        example: 'b73-new-project'
      }
    ],
    exampleResponse: {
      success: true,
      code: 'b73-new-project',
      path: '/path/to/b73-new-project'
    }
  },
  {
    id: 'update-project-priority',
    method: 'PUT',
    path: '/api/projects/:code/priority',
    group: 'Projects',
    description: 'Update project priority (pin/unpin)',
    parameters: [
      {
        name: 'code',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'b72-project'
      },
      {
        name: 'priority',
        type: 'body',
        dataType: 'string',
        required: true,
        enum: ['normal', 'pinned'],
        example: 'pinned'
      }
    ],
    exampleResponse: {
      success: true
    }
  },
  {
    id: 'update-project-stage',
    method: 'PUT',
    path: '/api/projects/:code/stage',
    group: 'Projects',
    description: 'Update project stage',
    parameters: [
      {
        name: 'code',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'b72-project'
      },
      {
        name: 'stage',
        type: 'body',
        dataType: 'string',
        required: true,
        enum: ['planning', 'recording', 'first-edit', 'second-edit', 'review', 'ready-to-publish', 'published', 'archived', 'auto'],
        example: 'first-edit'
      }
    ],
    exampleResponse: {
      success: true
    }
  },
  {
    id: 'get-project-final',
    method: 'GET',
    path: '/api/projects/:code/final',
    group: 'Projects',
    description: 'Get final video and SRT info',
    parameters: [
      {
        name: 'code',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'b72-project'
      }
    ],
    exampleResponse: {
      success: true,
      video: {
        filename: 'b72-final-v1.mp4',
        size: 524288000
      }
    }
  },
  {
    id: 'write-to-inbox',
    method: 'POST',
    path: '/api/projects/:code/inbox/write',
    group: 'Projects',
    description: 'Write file to inbox subfolder',
    parameters: [
      {
        name: 'code',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'b72-project'
      },
      {
        name: 'subfolder',
        type: 'body',
        dataType: 'string',
        required: true,
        description: 'Inbox subfolder (e.g., "raw", "dataset")',
        example: 'raw'
      },
      {
        name: 'filename',
        type: 'body',
        dataType: 'string',
        required: true,
        example: 'notes.md'
      },
      {
        name: 'content',
        type: 'body',
        dataType: 'string',
        required: true,
        example: '# Project Notes\n...'
      }
    ],
    exampleResponse: {
      success: true,
      path: '/path/to/inbox/raw/notes.md'
    }
  },

  // ========================================
  // Recordings
  // ========================================
  {
    id: 'get-pending-files',
    method: 'GET',
    path: '/api/files',
    group: 'Recordings',
    description: 'List pending files in watch directory',
    parameters: [],
    exampleResponse: {
      files: [
        {
          filename: 'Movie on 2025-01-15.mov',
          size: 524288000,
          duration: 125.5
        }
      ]
    }
  },
  {
    id: 'get-recordings',
    method: 'GET',
    path: '/api/recordings',
    group: 'Recordings',
    description: 'List all recordings in current project',
    parameters: [],
    exampleResponse: {
      recordings: [
        {
          filename: '10-5-intro-CTA.mov',
          chapter: '10',
          sequence: '5',
          isSafe: false,
          isParked: false
        }
      ]
    }
  },
  {
    id: 'get-suggested-naming',
    method: 'GET',
    path: '/api/suggested-naming',
    group: 'Recordings',
    description: 'Calculate suggested naming for next recording',
    parameters: [],
    exampleResponse: {
      chapter: '10',
      sequence: '6',
      name: 'intro'
    }
  },
  {
    id: 'rename-recording',
    method: 'POST',
    path: '/api/rename',
    group: 'Recordings',
    description: 'Rename and move file to recordings folder',
    parameters: [
      {
        name: 'originalPath',
        type: 'body',
        dataType: 'string',
        required: true,
        description: 'Full path to source file'
      },
      {
        name: 'chapter',
        type: 'body',
        dataType: 'string',
        required: true,
        example: '10'
      },
      {
        name: 'sequence',
        type: 'body',
        dataType: 'string',
        required: true,
        example: '5'
      },
      {
        name: 'name',
        type: 'body',
        dataType: 'string',
        required: true,
        example: 'intro'
      },
      {
        name: 'tags',
        type: 'body',
        dataType: 'array',
        description: 'Optional tags (uppercase)',
        example: ['CTA', 'SKOOL']
      }
    ],
    exampleResponse: {
      success: true,
      newPath: '/path/to/recordings/10-5-intro-CTA.mov'
    }
  },
  {
    id: 'park-recording',
    method: 'POST',
    path: '/api/recordings/park',
    group: 'Recordings',
    description: 'Mark recording as parked (good content, not for this edit)',
    parameters: [
      {
        name: 'filename',
        type: 'body',
        dataType: 'string',
        required: true,
        example: '10-5-intro.mov'
      }
    ],
    exampleResponse: {
      success: true
    }
  },
  {
    id: 'unpark-recording',
    method: 'POST',
    path: '/api/recordings/unpark',
    group: 'Recordings',
    description: 'Unpark recording',
    parameters: [
      {
        name: 'filename',
        type: 'body',
        dataType: 'string',
        required: true,
        example: '10-5-intro.mov'
      }
    ],
    exampleResponse: {
      success: true
    }
  },

  // ========================================
  // Transcription
  // ========================================
  {
    id: 'get-transcriptions',
    method: 'GET',
    path: '/api/transcriptions',
    group: 'Transcription',
    description: 'Get transcription queue state',
    parameters: [],
    exampleResponse: {
      active: {
        jobId: 'job_123',
        videoPath: '/path/to/video.mov'
      },
      queue: [],
      recent: []
    }
  },
  {
    id: 'get-transcript-status',
    method: 'GET',
    path: '/api/transcriptions/status/:filename',
    group: 'Transcription',
    description: 'Get transcription status for a file',
    parameters: [
      {
        name: 'filename',
        type: 'path',
        dataType: 'string',
        required: true,
        example: '10-5-intro.mov'
      }
    ],
    exampleResponse: {
      filename: '10-5-intro.mov',
      status: 'complete',
      transcriptPath: '/path/to/10-5-intro.txt'
    }
  },
  {
    id: 'queue-transcription',
    method: 'POST',
    path: '/api/transcriptions/queue',
    group: 'Transcription',
    description: 'Queue a video for transcription',
    parameters: [
      {
        name: 'videoPath',
        type: 'body',
        dataType: 'string',
        required: true,
        description: 'Full path to video file'
      }
    ],
    exampleResponse: {
      success: true,
      jobId: 'job_124'
    }
  },
  {
    id: 'queue-all-transcriptions',
    method: 'POST',
    path: '/api/transcriptions/queue-all',
    group: 'Transcription',
    description: 'Queue all videos for transcription',
    parameters: [
      {
        name: 'scope',
        type: 'body',
        dataType: 'string',
        required: true,
        enum: ['project', 'chapter'],
        description: 'Scope of operation'
      },
      {
        name: 'chapter',
        type: 'body',
        dataType: 'string',
        description: 'Chapter number (required if scope=chapter)',
        example: '10'
      }
    ],
    exampleResponse: {
      success: true,
      queued: 5
    }
  },

  // ========================================
  // System
  // ========================================
  {
    id: 'health-check',
    method: 'GET',
    path: '/api/system/health',
    group: 'System',
    description: 'Health check endpoint',
    parameters: [],
    exampleResponse: {
      success: true,
      status: 'healthy',
      server: 'FliHub',
      port: 5101
    }
  },
  {
    id: 'get-environment',
    method: 'GET',
    path: '/api/system/environment',
    group: 'System',
    description: 'Detect server runtime environment',
    parameters: [],
    exampleResponse: {
      platform: 'darwin',
      isWSL: false,
      pathFormat: 'unix'
    }
  },
  {
    id: 'open-folder',
    method: 'POST',
    path: '/api/system/open-folder',
    group: 'System',
    description: 'Open folder in file explorer',
    parameters: [
      {
        name: 'folder',
        type: 'body',
        dataType: 'string',
        required: true,
        enum: ['ecamm', 'downloads', 'recordings', 'safe', 'trash', 'images', 'thumbs', 'transcripts', 'project', 'final', 's3Staging', 'inbox', 'shadows', 'chapters'],
        description: 'Folder key to open'
      },
      {
        name: 'projectCode',
        type: 'body',
        dataType: 'string',
        description: 'Project code (required for project-specific folders)',
        example: 'b72-project'
      }
    ],
    exampleResponse: {
      success: true
    }
  },
  {
    id: 'get-watchers',
    method: 'GET',
    path: '/api/system/watchers',
    group: 'System',
    description: 'Get list of active file watchers',
    parameters: [],
    exampleResponse: {
      watchers: [
        {
          path: '~/Movies/Ecamm Live',
          type: 'ecamm'
        }
      ]
    }
  },

  // ========================================
  // State Management
  // ========================================
  {
    id: 'get-project-state',
    method: 'GET',
    path: '/api/projects/:code/state',
    group: 'State',
    description: 'Get project state from .flihub-state.json',
    parameters: [
      {
        name: 'code',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'b72-project'
      }
    ],
    exampleResponse: {
      success: true,
      state: {
        recordings: {
          '10-5-intro.mov': {
            isSafe: false,
            parked: false
          }
        }
      }
    }
  },
  {
    id: 'update-project-state',
    method: 'POST',
    path: '/api/projects/:code/state',
    group: 'State',
    description: 'Update project state (merges with existing)',
    parameters: [
      {
        name: 'code',
        type: 'path',
        dataType: 'string',
        required: true,
        example: 'b72-project'
      },
      {
        name: 'recordings',
        type: 'body',
        dataType: 'object',
        description: 'Recording state updates'
      },
      {
        name: 'glingDictionary',
        type: 'body',
        dataType: 'array',
        description: 'Project-specific dictionary words'
      }
    ],
    exampleResponse: {
      success: true
    }
  }
]

/**
 * Group endpoints by category
 */
export function getEndpointGroups(): Map<string, ApiEndpoint[]> {
  const groups = new Map<string, ApiEndpoint[]>()

  for (const endpoint of API_ENDPOINTS) {
    const existing = groups.get(endpoint.group) || []
    existing.push(endpoint)
    groups.set(endpoint.group, existing)
  }

  return groups
}

/**
 * Get endpoint by ID
 */
export function getEndpointById(id: string): ApiEndpoint | undefined {
  return API_ENDPOINTS.find(e => e.id === id)
}

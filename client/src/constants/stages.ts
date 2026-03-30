// FR-148: Stage display config — shared across toolbar, drawer, and panel
import type { ProjectStage } from '../../../shared/types';

export const STAGE_DISPLAY: Record<
  ProjectStage,
  { label: string; bg: string; text: string; description: string }
> = {
  planning: {
    label: 'Plan',
    bg: 'bg-purple-100',
    text: 'text-purple-700',
    description: 'Preparing content outline and script',
  },
  recording: {
    label: 'REC',
    bg: 'bg-yellow-100',
    text: 'text-yellow-700',
    description: 'Actively recording video segments',
  },
  'first-edit': {
    label: '1st',
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    description: 'Initial rough cut and assembly',
  },
  'second-edit': {
    label: '2nd',
    bg: 'bg-blue-200',
    text: 'text-blue-800',
    description: 'Refining edit and adding polish',
  },
  review: {
    label: 'Rev',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    description: 'Final review before publishing',
  },
  'ready-to-publish': {
    label: 'Ready',
    bg: 'bg-green-100',
    text: 'text-green-700',
    description: 'Approved and ready to upload',
  },
  published: {
    label: 'Pub',
    bg: 'bg-green-200',
    text: 'text-green-800',
    description: 'Live on YouTube',
  },
  archived: {
    label: 'Arch',
    bg: 'bg-surface-muted',
    text: 'text-warm-secondary',
    description: 'Completed and archived',
  },
};

export const STAGE_ORDER: ProjectStage[] = [
  'planning',
  'recording',
  'first-edit',
  'second-edit',
  'review',
  'ready-to-publish',
  'published',
  'archived',
];

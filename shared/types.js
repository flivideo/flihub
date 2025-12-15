// Shared types between client and server
// Default tags (used when config doesn't specify any)
export const DEFAULT_TAGS = ['cta', 'endcards'];
// FR-80: Default stages if not configured
export const DEFAULT_PROJECT_STAGES = [
    'planning',
    'recording',
    'first-edit',
    'second-edit',
    'review',
    'ready-to-publish',
    'published',
    'archived',
];
// FR-80: Stage display labels for UI
export const STAGE_LABELS = {
    'planning': 'Plan',
    'recording': 'REC',
    'first-edit': '1st Edit',
    'second-edit': '2nd Edit',
    'review': 'Review',
    'ready-to-publish': 'Ready',
    'published': 'Published',
    'archived': 'Archived',
};

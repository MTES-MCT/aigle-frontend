import { ObjectsFilterPreset } from '@/utils/objects-filter-presets';

// Opens the map or the table with these object filters applied (see `buildAppFilterUrl`).
export interface AppFilterLink {
    label: string;
    path: '/map' | '/table';
    filter: Partial<ObjectsFilterPreset['filter']>;
}

// Inline strings in every block accept `**bold**` and `[label](url)`. A url starting with `/` is an
// in-app link, anything else opens in a new tab.
export type ContentBlock =
    | { type: 'paragraph'; text: string }
    | { type: 'list'; items: string[]; ordered?: boolean }
    | { type: 'note'; text: string }
    | { type: 'warning'; text: string }
    | { type: 'example'; text: string }
    | { type: 'table'; head: string[]; rows: string[][] }
    | { type: 'checklist'; id: string; items: string[]; summary?: string }
    | ({ type: 'appLink' } & AppFilterLink);

export interface Video {
    id: string;
    title: string;
    durationSeconds: number;
    url: string;
    embedUrl: string;
}

export interface FaqQuestion {
    id: string;
    question: string;
    answer: ContentBlock[];
}

export interface FaqCategory {
    id: string;
    title: string;
    questions: FaqQuestion[];
}

export interface ExerciseSection {
    title: string;
    blocks: ContentBlock[];
}

export interface Exercise {
    id: string;
    label: string;
    title: string;
    objective: string;
    relatedVideoIds: string[];
    sections: ExerciseSection[];
}

export interface Webinar {
    id: string;
    title: string;
    // Paris wall-clock values, kept as strings so no user timezone ever shifts them.
    date: string;
    timeSlot?: { start: string; end: string };
    description: ContentBlock[];
    registrationUrl?: string;
    visioUrl?: string;
    replay?: Video;
    supportUrl?: string;
}

import { AppFilterLink, ContentBlock, Webinar } from './content/types';

export const HELP_CENTER_PATH = '/help-center';

export const HELP_CENTER_TABS = ['videos', 'exercices', 'faq', 'webinaires'] as const;
export type HelpCenterTab = (typeof HELP_CENTER_TABS)[number];

// The anchor alone is enough to land on an exercise or a question: the page picks the tab from it.
export const getHelpCenterUrl = (tab: HelpCenterTab, anchor?: string): string =>
    `${window.location.origin}${HELP_CENTER_PATH}?onglet=${tab}${anchor ? `#${anchor}` : ''}`;

// Same keys and formats as `objectsFilterToParams`. The map and table only read them on a full
// page load, and every key left out falls back to its default (e.g. `prescripted` to "Non-prescrits").
export const buildAppFilterUrl = ({ path, filter }: AppFilterLink): string => {
    const params = new URLSearchParams();

    if (filter.detectionValidationStatuses) {
        params.set('detectionValidationStatuses', filter.detectionValidationStatuses.join(','));
    }
    if (filter.detectionControlStatuses) {
        params.set('detectionControlStatuses', filter.detectionControlStatuses.join(','));
    }
    if (filter.prescripted !== undefined) {
        params.set('prescripted', String(filter.prescripted));
    }

    return `${path}?${params.toString()}`;
};

// Accents, case and apostrophe style are ignored so "Mobil-home", "mobil home" and "l'édition"
// all find what users type from memory.
export const normalizeSearchText = (text: string): string =>
    text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[’‘`]/g, "'")
        .replace(/-/g, ' ')
        .toLowerCase()
        .replace(/œ/g, 'oe')
        .replace(/æ/g, 'ae');

const isWordChar = (char: string | undefined): boolean => !!char && /[a-z0-9]/.test(char);

// Terms only match from the start of a word, and short ones ("pv", "plu") only as a whole word:
// otherwise "plu" finds every "plusieurs" and "charge" every "télécharger".
export const findSearchTerm = (normalizedText: string, term: string, fromIndex = 0): number => {
    let start = normalizedText.indexOf(term, fromIndex);

    while (start !== -1) {
        const isWordStart = !isWordChar(normalizedText[start - 1]);
        const isWordEnd = !isWordChar(normalizedText[start + term.length]);
        if (isWordStart && (term.length > 3 || isWordEnd)) {
            return start;
        }
        start = normalizedText.indexOf(term, start + 1);
    }

    return -1;
};

export const stripInlineMarkup = (text: string): string =>
    text.replace(/\*\*(.+?)\*\*/g, '$1').replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

export const getBlocksText = (blocks: ContentBlock[]): string =>
    blocks
        .map((block) => {
            switch (block.type) {
                case 'list':
                case 'checklist':
                    return block.items.join(' ');
                case 'table':
                    return [...block.head, ...block.rows.flat()].join(' ');
                case 'appLink':
                    return block.label;
                default:
                    return block.text;
            }
        })
        .map(stripInlineMarkup)
        .join(' ');

export const formatVideoDuration = (durationSeconds: number): string => {
    const totalMinutes = Math.round(durationSeconds / 60);

    if (totalMinutes < 60) {
        return `${Math.max(1, totalMinutes)} min`;
    }

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes ? `${hours} h ${String(minutes).padStart(2, '0')}` : `${hours} h`;
};

const PARIS_NOW_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
});

// "YYYY-MM-DD HH:MM" in Paris time, comparable as a plain string with the webinar data.
const getParisNow = (): string => PARIS_NOW_FORMATTER.format(new Date());

export const isWebinarUpcoming = (webinar: Webinar): boolean =>
    getParisNow() < `${webinar.date} ${webinar.timeSlot?.end ?? '23:59'}`;

// The date is built and formatted in UTC so the weekday cannot drift with the viewer's timezone.
const WEBINAR_DATE_FORMATTER = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'UTC',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
});

export const formatWebinarDate = (isoDate: string): string => {
    const [year, month, day] = isoDate.split('-').map(Number);
    const formatted = WEBINAR_DATE_FORMATTER.format(new Date(Date.UTC(year, month - 1, day)));
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
};

const formatTime = (time: string): string => time.replace(':', 'h');

export const formatWebinarTimeSlot = (timeSlot: { start: string; end: string }): string =>
    `${formatTime(timeSlot.start)} – ${formatTime(timeSlot.end)} (heure de Paris)`;

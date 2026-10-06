import { trackEvent } from '@/utils/matomo';
import { Exercise, Video, Webinar } from './content/types';
import { VIDEOS } from './content/videos';

// One Matomo event category per section, under a shared prefix so they sort together.
export const TRACKING_CATEGORIES = {
    helpCenter: 'Centre d’aide',
    videos: 'Centre d’aide - Vidéos',
    exercises: 'Centre d’aide - Exercices',
    faq: 'Centre d’aide - FAQ',
    webinars: 'Centre d’aide - Webinaires',
} as const;

// The players are cross-origin iframes: opening a video is all that can be seen, not whether it is played.
export const trackVideoOpen = (video: Video) => {
    const index = VIDEOS.findIndex(({ id }) => id === video.id);
    trackEvent(
        TRACKING_CATEGORIES.videos,
        'Vidéo ouverte',
        index === -1 ? video.title : `${index + 1}. ${video.title}`,
    );
};

export const getExerciseTrackingName = (exercise: Exercise): string => `${exercise.label} : ${exercise.title}`;

export type WebinarLink = 'Inscription' | 'Lien de connexion' | 'Replay' | 'Support';

// The date tells apart sessions that share a title.
export const trackWebinarLink = (link: WebinarLink, webinar: Webinar) =>
    trackEvent(TRACKING_CATEGORIES.webinars, link, `${webinar.date} - ${webinar.title}`);

// Named after the channel on the page; in the FAQ, after the question whose answer holds the link, or 'Aucun résultat'.
export const trackContact = (category: string, name: string) => trackEvent(category, 'Contacter l’équipe', name);

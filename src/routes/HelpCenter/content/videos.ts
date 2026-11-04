import { TutorialVideo, Video } from './types';

const loomVideo = (id: string, title: string): Video => ({
    id,
    title,
    url: `https://www.loom.com/share/${id}`,
    embedUrl: `https://www.loom.com/embed/${id}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`,
});

const tubeVideo = (videoId: string, title: string): Video => ({
    id: videoId,
    title,
    url: `https://tube.numerique.gouv.fr/w/${videoId}`,
    embedUrl: `https://tube.numerique.gouv.fr/videos/embed/${videoId}?title=0&warningTitle=0&peertubeLink=0`,
});

const TUBE_VIDEO_URL_REGEX = /^https:\/\/tube\.numerique\.gouv\.fr\/(?:w|videos\/watch|videos\/embed)\/([\w-]+)/;
const LOOM_VIDEO_URL_REGEX = /^https:\/\/(?:www\.)?loom\.com\/(?:share|embed)\/(\w+)/;

// A link to tube.numerique.gouv.fr or Loom plays in the video modal; any other one is opened as is.
export const getPlayableVideo = (url: string, title: string): Video | null => {
    const tubeVideoId = url.match(TUBE_VIDEO_URL_REGEX)?.[1];
    if (tubeVideoId) {
        return tubeVideo(tubeVideoId, title);
    }

    const loomVideoId = url.match(LOOM_VIDEO_URL_REGEX)?.[1];
    if (loomVideoId) {
        return loomVideo(loomVideoId, title);
    }

    return null;
};

export const TUBE_CHANNEL_URL = 'https://tube.numerique.gouv.fr/video-channels/videos_formation_aigle';

export const VIDEO_IDS = {
    INTRODUCTION: 'b64715359b4e438dbbb53f205ec080c9',
    CUSTOM_ZONES: '35c89384fb88452d937aa943280fcc0e',
    HISTORY: '54bef9e70ff94c97a524c5739b893c4d',
    MAP: 'e697e1fc90a140abb2fd47ed8bfd421b',
    TABLE: 'f5eaaf7d58b643e0b725eda14a1afde1',
    DETECTED_OBJECTS: '508ee6f2e931465a83e130ddafbbae16',
    STATUSES: 'c61a857dd05844b19a9c15f4a6021dc3',
    CONTROL_STATUSES: '47dbd0262add4b09b8cf74bb6f176445',
    SUPPORT: 'e708a6042a5d49879f764461220202b1',
} as const;

const tutorial = (id: string, title: string, durationSeconds: number): TutorialVideo => ({
    ...loomVideo(id, title),
    durationSeconds,
});

// In the order the team recommends watching them.
export const VIDEOS: TutorialVideo[] = [
    tutorial(VIDEO_IDS.INTRODUCTION, 'Introduction à AIGLE', 233),
    tutorial(VIDEO_IDS.CUSTOM_ZONES, 'Les zones à enjeux', 201),
    tutorial(VIDEO_IDS.HISTORY, 'Historique des détections et millésimes', 204),
    tutorial(VIDEO_IDS.MAP, 'L’interface cartographique', 300),
    tutorial(VIDEO_IDS.TABLE, 'Édition multiple et interface tableau', 301),
    tutorial(VIDEO_IDS.DETECTED_OBJECTS, 'Les objets détectés', 284),
    tutorial(VIDEO_IDS.STATUSES, 'Fiche objet et gestion des statuts (1/2)', 300),
    tutorial(VIDEO_IDS.CONTROL_STATUSES, 'Les statuts de contrôle (2/2)', 300),
    tutorial(VIDEO_IDS.SUPPORT, 'Support, centre d’aide et ressources disponibles', 84),
];

import { Video } from './types';

const loomVideo = (id: string, title: string, durationSeconds: number): Video => ({
    id,
    title,
    durationSeconds,
    url: `https://www.loom.com/share/${id}`,
    embedUrl: `https://www.loom.com/embed/${id}?hide_owner=true&hide_share=true&hide_title=true&hideEmbedTopBar=true`,
});

export const tubeVideo = (shortUuid: string, title: string, durationSeconds: number): Video => ({
    id: shortUuid,
    title,
    durationSeconds,
    url: `https://tube.numerique.gouv.fr/w/${shortUuid}`,
    embedUrl: `https://tube.numerique.gouv.fr/videos/embed/${shortUuid}?title=0&warningTitle=0&peertubeLink=0`,
});

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

// In the order the team recommends watching them.
export const VIDEOS: Video[] = [
    loomVideo(VIDEO_IDS.INTRODUCTION, 'Introduction à AIGLE', 233),
    loomVideo(VIDEO_IDS.CUSTOM_ZONES, 'Les zones à enjeux', 201),
    loomVideo(VIDEO_IDS.HISTORY, 'Historique des détections et millésimes', 204),
    loomVideo(VIDEO_IDS.MAP, 'L’interface cartographique', 300),
    loomVideo(VIDEO_IDS.TABLE, 'Édition multiple et interface tableau', 301),
    loomVideo(VIDEO_IDS.DETECTED_OBJECTS, 'Les objets détectés', 284),
    loomVideo(VIDEO_IDS.STATUSES, 'Fiche objet et gestion des statuts (1/2)', 300),
    loomVideo(VIDEO_IDS.CONTROL_STATUSES, 'Les statuts de contrôle (2/2)', 300),
    loomVideo(VIDEO_IDS.SUPPORT, 'Support, centre d’aide et ressources disponibles', 84),
];

import { SignalementFailureReason as PdfFailureReason } from '@/components/signalement-pdf/SignalementPDFData';
import { MapGeoCustomZoneLayer } from '@/models/map-layer';
import { MapSettings } from '@/models/map-settings';
import { trackEvent } from '@/utils/matomo';
import { SignalementSource, TRACKING_CATEGORIES } from '@/utils/tracking';

export type DrawMode = 'MULTIPLE_EDIT' | 'ADD_DETECTION' | 'MULTIPLE_DOWNLOAD';

// Fixed names rather than the toolbar titles: rewording a title must not split the series.
export const DRAW_TOOL_TRACKING_NAMES: Record<DrawMode, string> = {
    ADD_DETECTION: 'Ajout d’objet',
    MULTIPLE_EDIT: 'Édition multiple',
    MULTIPLE_DOWNLOAD: 'Téléchargement multiple',
};

export type MapPanel = 'Recherche' | 'Filtres' | 'Couches' | 'Légende';

export const trackMapPanelOpened = (panel: MapPanel) => trackEvent(TRACKING_CATEGORIES.map, 'Panneau ouvert', panel);

// An uncategorized zone layer is named after the zone itself, which can be a place name: only category names are sent.
export const getZoneLayerTrackingName = (
    { name, customZoneUuids }: Pick<MapGeoCustomZoneLayer, 'name' | 'customZoneUuids'>,
    settings?: MapSettings,
) =>
    !settings || settings.geoCustomZonesUncategorized.some(({ uuid }) => customZoneUuids.includes(uuid))
        ? 'Zone non catégorisée'
        : name;

// Ranks rather than years, which differ from one département to the other: 'n' is the most recent one.
export const getBackgroundYearRank = (year: string, backgroundLayerYears: string[]) => {
    const index = backgroundLayerYears.indexOf(year);
    return index > 0 ? `n-${index}` : 'n';
};

// SignalementPDFData's own reasons, plus the failures that happen before it is rendered.
export type SignalementFailureReason = PdfFailureReason | 'Aucune parcelle' | 'Parcelle introuvable';

const getSecondsSince = (startedAt: number) => Math.round((Date.now() - startedAt) / 1000);

export const trackSignalementStarted = (source: SignalementSource, pages: number) =>
    trackEvent(TRACKING_CATEGORIES.signalement, 'Génération lancée', source, pages);

export const trackSignalementDownloaded = (source: SignalementSource, startedAt: number) =>
    trackEvent(TRACKING_CATEGORIES.signalement, 'Fiche téléchargée', source, getSecondsSince(startedAt));

// Never the message shown to the agent: only the reason SignalementPDFData passes along with it.
export const trackSignalementFailed = (
    source: SignalementSource,
    reason: SignalementFailureReason = 'Erreur de génération',
) => trackEvent(TRACKING_CATEGORIES.signalement, 'Génération échouée', `${source} : ${reason}`);

export const trackSignalementCancelled = (source: SignalementSource, startedAt: number) =>
    trackEvent(TRACKING_CATEGORIES.signalement, 'Génération annulée', source, getSecondsSince(startedAt));

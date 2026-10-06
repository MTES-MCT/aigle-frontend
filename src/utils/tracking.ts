import { ObjectsFilter } from '@/models/detection-filter';
import { CUSTOM_PRESET_ID, getMatchingPresetId } from '@/utils/objects-filter-presets';

// Matomo event categories of the app. The help center keeps its own, in routes/HelpCenter/tracking.ts.
export const TRACKING_CATEGORIES = {
    map: 'Carte',
    mapTools: 'Carte - Outils',
    mapFilters: 'Carte - Filtres',
    tableFilters: 'Tableau - Filtres',
    mapLayers: 'Carte - Couches',
    detection: 'Détection',
    signalement: 'Signalement',
    bulkEdit: 'Édition multiple',
    table: 'Tableau',
    statistics: 'Statistiques',
    navigation: 'Navigation',
    account: 'Compte',
    errors: 'Erreurs',
    support: 'Support',
    admin: 'Administration',
} as const;

export type SignalementSource =
    | 'Fiche objet'
    | 'Fiche parcelle'
    | 'Courrier préalable'
    | 'Recherche parcelle'
    | 'Sélection multiple';

// What fetch rejects with when the request never got an answer (Chrome, Firefox, Safari wordings).
const NETWORK_ERROR_MESSAGE = /failed to fetch|networkerror|load failed|network request failed/i;

export const isNetworkError = (error: unknown): boolean =>
    error instanceof TypeError && NETWORK_ERROR_MESSAGE.test(error.message);

// Matched on its name, not with instanceof: importing api.ts here would make a cycle with its error tracking.
const getApiErrorStatus = (error: unknown): number | null => {
    const status = (error as { status?: unknown } | null)?.status;
    return error instanceof Error && error.name === 'ApiError' && typeof status === 'number' ? status : null;
};

// Never the message: it can hold a path with uuids, or text typed by the user.
export const getErrorTrackingName = (error: unknown): string => {
    const status = getApiErrorStatus(error);
    if (status !== null) {
        return String(status);
    }

    return isNetworkError(error) ? 'réseau' : 'inconnue';
};

export const getFilterTrackingName = (objectsFilter: ObjectsFilter): string =>
    getMatchingPresetId(objectsFilter) ?? CUSTOM_PRESET_ID;

// Page titles sent with the page views, keyed by route pattern (the tracked url is the pattern too).
export const PAGE_TRACKING_TITLES: Record<string, string> = {
    '/login': 'Connexion',
    '/reset-password': 'Mot de passe oublié',
    '/reset-password/:uid/:token': 'Nouveau mot de passe',
    '/map': 'Carte',
    '/table': 'Tableau',
    '/statistics': 'Statistiques',
    '/about': 'À propos',
    '/help': 'Centre d’aide',
    '/admin/users': 'Administration - Utilisateurs',
    '/admin/users/form': 'Administration - Utilisateur (création)',
    '/admin/users/form/:uuid': 'Administration - Utilisateur (modification)',
    '/admin/user-groups': 'Administration - Groupes utilisateurs',
    '/admin/user-groups/form': 'Administration - Groupe utilisateurs (création)',
    '/admin/user-groups/form/:uuid': 'Administration - Groupe utilisateurs (modification)',
    '/admin/custom-zones': 'Administration - Zones à enjeux',
    '/admin/custom-zones/form': 'Administration - Zone à enjeux (création)',
    '/admin/custom-zones/form/:uuid': 'Administration - Zone à enjeux (modification)',
    '/admin/custom-zones/category-form': 'Administration - Catégorie de zones à enjeux (création)',
    '/admin/custom-zones/category-form/:uuid': 'Administration - Catégorie de zones à enjeux (modification)',
    '/admin/collectivites': 'Administration - Collectivités',
    '/admin/collectivites/:collectivityType/form/:uuid': 'Administration - Collectivité (modification)',
    '/admin/object-types': 'Administration - Types d’objets',
    '/admin/object-types/form': 'Administration - Type d’objet (création)',
    '/admin/object-types/form/:uuid': 'Administration - Type d’objet (modification)',
    '/admin/object-type-categories': 'Administration - Thématiques',
    '/admin/object-type-categories/form': 'Administration - Thématique (création)',
    '/admin/object-type-categories/form/:uuid': 'Administration - Thématique (modification)',
    '/admin/tile-sets': 'Administration - Fonds de carte',
    '/admin/tile-sets/form': 'Administration - Fond de carte (création)',
    '/admin/tile-sets/form/:uuid': 'Administration - Fond de carte (modification)',
    '/admin/imports': 'Administration - Imports',
    '/admin/run-command': 'Administration - Commandes',
    '/admin/user-action-logs': 'Administration - Journal des actions',
    '/admin/deployed-data': 'Administration - Données déployées',
    '/admin/deployed-data/:uuid': 'Administration - Données déployées (détail)',
};

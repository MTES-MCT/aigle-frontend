import { GEO_COMMUNE_LIST_ENDPOINT, GEO_DEPARTMENT_LIST_ENDPOINT, GEO_REGION_LIST_ENDPOINT } from '@/api-endpoints';
import {
    DetectionControlStatus,
    DetectionPrescriptionStatus,
    DetectionSource,
    DetectionValidationStatus,
} from '@/models/detection';
import { CollectivityType } from '@/models/geo/_common';
import { GeoCustomZoneStatus, GeoCustomZoneType } from '@/models/geo/geo-custom-zone';
import { ObjectTypeMinimal } from '@/models/object-type';
import { ObjectTypeCategoryObjectTypeStatus } from '@/models/object-type-category';
import { TileSetStatus, TileSetType } from '@/models/tile-set';
import { UserGroupRight, UserRole } from '@/models/user';
import { UserGroupType } from '@/models/user-group';
import { colors } from '@/utils/colors';

export const DEFAULT_ROUTE = '/';

export const AUTH_ACCESS_TOKEN_STORAGE_KEY = 'auth_access_token';
export const AUTH_REFRESH_TOKEN_STORAGE_KEY = 'auth_refresh_token';

export const TILES_URL_FALLBACK = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

export const PASSWORD_MIN_LENGTH = 8;

export const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;
export const ENVIRONMENT = import.meta.env.VITE_ENVIRONMENT;

export const PARCEL_COLOR = '#FF6F00';

export const ROLES_NAMES_MAP: { [role in UserRole]: string } = {
    SUPER_ADMIN: 'super admin',
    ADMIN: 'admin',
    REGULAR: 'normal',
} as const;
export const COLLECTIVITY_TYPES_NAMES_MAP: {
    [role in CollectivityType]: string;
} = {
    region: 'région',
    department: 'département',
    commune: 'commune',
} as const;
export const TILE_SET_STATUSES_NAMES_MAP: {
    [role in TileSetStatus]: string;
} = {
    VISIBLE: 'visible',
    HIDDEN: 'caché par défaut',
    DEACTIVATED: 'désactivé',
} as const;
export const TILE_SET_TYPES_NAMES_MAP: {
    [role in TileSetType]: string;
} = {
    BACKGROUND: 'orthos',
    PARTIAL: 'satellites',
    INDICATIVE: 'indicatives',
} as const;

export const GEO_CUSTOM_ZONE_STATUSES_NAMES_MAP: {
    [status in GeoCustomZoneStatus]: string;
} = {
    ACTIVE: 'Actif',
    INACTIVE: 'Inactif',
} as const;

export const GEO_CUSTOM_ZONE_TYPES_NAMES_MAP: {
    [type in GeoCustomZoneType]: string;
} = {
    COMMON: 'Commun',
    COLLECTIVITY_MANAGED: 'Géré niveau collectivité',
} as const;

export const DETECTION_CONTROL_STATUSES_NAMES_MAP: {
    [status in DetectionControlStatus]: string;
} = {
    NOT_CONTROLLED: 'Non contrôlé',
    PRIOR_LETTER_SENT: 'Courrier préalable envoyé',
    CONTROLLED_FIELD: 'Contrôlé terrain',
    OFFICIAL_REPORT_DRAWN_UP: 'PV dressé',
    ADMINISTRATIVE_CONSTRAINT: 'Astreinte Administrative',
    OBSERVARTION_REPORT_REDACTED: 'Rapport de constatations rédigé',
    REHABILITATED: 'Remis en état',
} as const;

export const DETECTION_PRESCRIPTION_STATUSES_NAMES_MAP: {
    [status in DetectionPrescriptionStatus]: string;
} = {
    PRESCRIBED: 'Prescrit',
    NOT_PRESCRIBED: 'Non prescrit',
} as const;

export const DETECTION_VALIDATION_STATUSES_NAMES_MAP: {
    [status in DetectionValidationStatus]: string;
} = {
    DETECTED_NOT_VERIFIED: 'Non vérifié',
    SUSPECT: 'Suspect',
    LEGITIMATE: 'Légal',
    INVALIDATED: 'Invalidé',
} as const;

export const DETECTION_VALIDATION_STATUSES_COLORS_MAP: {
    [status in DetectionValidationStatus]: string;
} = {
    DETECTED_NOT_VERIFIED: colors.BLUE,
    SUSPECT: colors.YELLOW,
    LEGITIMATE: colors.GREEN,
    INVALIDATED: colors.RED,
} as const;

export const USER_GROUP_TYPES_NAMES_MAP: {
    [type in UserGroupType]: string;
} = {
    DDTM: 'DDTM',
    COLLECTIVITY: 'Collectivité',
} as const;

export const USER_GROUP_RIGHTS_ORDERED: UserGroupRight[] = ['WRITE', 'ANNOTATE', 'READ'] as const;
export const USER_GROUP_RIGHTS_NAMES_MAP: {
    [role in UserGroupRight]: string;
} = {
    WRITE: 'Ecriture',
    ANNOTATE: 'Annotation',
    READ: 'Lecture',
} as const;

export const OBJECT_TYPE_CATEGROY_OBJECT_TYPE_STATUSES_NAMES_MAP: {
    [status in ObjectTypeCategoryObjectTypeStatus]: string;
} = {
    VISIBLE: 'Visible par défaut',
    HIDDEN: 'Caché par défaut',
    OTHER_CATEGORY: 'Visible dans la catégorie "autres"',
} as const;

export const DETECTION_SOURCE_NAMES_MAP: {
    [source in DetectionSource]: string;
} = {
    INTERFACE_DRAWN: 'Dessin interface',
    ANALYSIS: 'Analyse',
} as const;

export const COLLECTIVITY_TYPES_ENDPOINTS_MAP: {
    [role in CollectivityType]: string;
} = {
    region: GEO_REGION_LIST_ENDPOINT,
    department: GEO_DEPARTMENT_LIST_ENDPOINT,
    commune: GEO_COMMUNE_LIST_ENDPOINT,
} as const;

export const DEFAULT_DATE_FORMAT = 'dd/MM/yyyy';
export const DEFAULT_DATETIME_FORMAT = 'dd/MM/yyyy à HH:mm';

export const CUSTOM_ZONE_NEGATIVE_COLOR = '#808080';

export const OTHER_OBJECT_TYPE: ObjectTypeMinimal = {
    name: 'Autres',
    color: '#FFFFFF',
    uuid: 'OTHER_OBJECT_TYPES',
} as const;

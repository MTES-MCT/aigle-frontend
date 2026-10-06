import { UserGroupRight, UserRole, UserUserGroupInput, userGroupRights } from '@/models/user';
import { ApiError } from '@/utils/api';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES, getErrorTrackingName } from '@/utils/tracking';
import { FormErrors } from '@mantine/form';

export type AdminFormEntity = 'Utilisateur' | 'Zone' | 'Catégorie';
export type AdminImportStep = 'dépôt' | 'aperçu' | 'import' | 'erreur technique';

interface UserAccess {
    userRole: UserRole;
    userUserGroups: UserUserGroupInput[];
}

// userGroupRights is ordered from the highest right to the lowest.
const getHighestRight = (rights: readonly UserGroupRight[]): UserGroupRight | undefined =>
    userGroupRights.find((right) => rights.includes(right));

// Field paths only, never values or messages: 'userUserGroups.0.userGroupRights' -> 'userUserGroups.userGroupRights'.
const toTrackedKeys = (keys: string[]) =>
    Array.from(new Set(keys.map((key) => key.replace(/\.\d+(?=\.|$)/g, ''))))
        .sort()
        .join(',');

const trackFormRejected = (entity: AdminFormEntity, side: 'client' | 'serveur', reason: string) =>
    trackEvent(TRACKING_CATEGORIES.admin, 'Formulaire refusé', `${entity} (${side}) : ${reason}`);

export const trackAdminFormRejectedByClient = (entity: AdminFormEntity, errors: FormErrors) =>
    trackFormRejected(entity, 'client', toTrackedKeys(Object.keys(errors).filter((key) => !!errors[key])));

// A 400 names the refused fields (a duplicate email is 'email'), anything else its HTTP status.
export const trackAdminFormRejectedByServer = (entity: AdminFormEntity, error: unknown) => {
    const body = error instanceof ApiError ? error.body : undefined;
    const keys =
        error instanceof ApiError && error.status === 400 && body && typeof body === 'object' && !Array.isArray(body)
            ? Object.keys(body)
            : [];

    trackFormRejected(entity, 'serveur', keys.length ? toTrackedKeys(keys) : getErrorTrackingName(error));
};

export const trackAdminUserCreated = ({ userUserGroups }: UserAccess) =>
    trackEvent(
        TRACKING_CATEGORIES.admin,
        'Utilisateur créé',
        getHighestRight(userUserGroups.flatMap(({ userGroupRights }) => userGroupRights)) ?? 'Aucun groupe',
        userUserGroups.length,
    );

export const trackAdminUserUpdated = (before: UserAccess, after: UserAccess) => {
    const getRightsByGroup = ({ userUserGroups }: UserAccess) =>
        new Map(
            userUserGroups.map(({ userGroupUuid, userGroupRights }) => [
                userGroupUuid,
                getHighestRight(userGroupRights) ?? 'aucun',
            ]),
        );
    const rightsBefore = getRightsByGroup(before);
    const rightsAfter = getRightsByGroup(after);

    new Set([...rightsBefore.keys(), ...rightsAfter.keys()]).forEach((userGroupUuid) => {
        const rightBefore = rightsBefore.get(userGroupUuid) ?? 'aucun';
        const rightAfter = rightsAfter.get(userGroupUuid) ?? 'aucun';

        if (rightBefore !== rightAfter) {
            trackEvent(TRACKING_CATEGORIES.admin, 'Droits modifiés', `${rightBefore} → ${rightAfter}`);
        }
    });

    if (after.userRole === 'DEACTIVATED' && before.userRole !== 'DEACTIVATED') {
        trackEvent(TRACKING_CATEGORIES.admin, 'Utilisateur désactivé', 'Rôle DEACTIVATED');
    } else if (before.userUserGroups.length && !after.userUserGroups.length) {
        trackEvent(TRACKING_CATEGORIES.admin, 'Utilisateur désactivé', 'Retiré de tous ses groupes');
    }
};

export const trackAdminZoneCreated = (geoCustomZoneCategoryUuid?: string) =>
    trackEvent(TRACKING_CATEGORIES.admin, 'Zone créée', geoCustomZoneCategoryUuid ? 'catégorie' : 'couleur');

// entityLabel is the bulk config's own constant ('utilisateurs', 'groupes', 'zones', 'fonds de carte').
export const trackAdminImportRejected = (entityLabel: string, step: AdminImportStep, errorsCount?: number) =>
    trackEvent(TRACKING_CATEGORIES.admin, 'Import rejeté', `${entityLabel} : ${step}`, errorsCount);

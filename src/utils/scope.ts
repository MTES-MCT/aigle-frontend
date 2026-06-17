import { useAuth } from '@/store/slices/auth';

/**
 * Route prefix on which the SUPER_ADMIN impersonation scope is disabled.
 *
 * A SUPER_ADMIN can pick a "viewing as" user group via the UserGroupSelector;
 * the selection is sent to the API as `X-User-Group-Uuid`, which scopes most
 * responses to that group's data. The admin section (`/admin/*`) manages
 * cross-tenant configuration and must always see ALL data regardless of the
 * picker, so the header must never be sent there.
 *
 * Everything related to that rule lives in this file — the API client just
 * asks `getActiveScopedUserGroupUuid()` what to send.
 */
const SCOPE_DISABLED_PATH_PREFIX = '/admin';

export const isScopeDisabledPath = (pathname: string): boolean =>
    pathname === SCOPE_DISABLED_PATH_PREFIX || pathname.startsWith(`${SCOPE_DISABLED_PATH_PREFIX}/`);

/**
 * The user-group UUID to forward as `X-User-Group-Uuid` for the current
 * request, or `undefined` if no impersonation should apply (no group selected,
 * or a scope-disabled route — see {@link SCOPE_DISABLED_PATH_PREFIX}).
 */
export const getActiveScopedUserGroupUuid = (): string | undefined => {
    const { selectedUserGroupUuid } = useAuth.getState();

    if (!selectedUserGroupUuid) {
        return undefined;
    }

    if (typeof window !== 'undefined' && isScopeDisabledPath(window.location.pathname)) {
        return undefined;
    }

    return selectedUserGroupUuid;
};

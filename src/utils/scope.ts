import { userGroupEndpoints, usersEndpoints } from '@/api/endpoints';
import { UserRole } from '@/models/user';

/**
 * SUPER_ADMIN "viewing as a user group" scope — the ONE home for every decision
 * about it. `api.ts` and `App.tsx` call into here; they hold no scope logic of
 * their own, so the normal request/bootstrap flow stays free of super-admin
 * special-casing.
 *
 * A SUPER_ADMIN picks a user group in the UserGroupSelector; its uuid is sent to
 * the API as `X-User-Group-Uuid`, which scopes every response to that group's
 * data (object types, tile set years, custom zones, detections...).
 *
 * Rule: A SCOPE CHANGE IS ALWAYS A PAGE RELOAD.
 * Group-scoped data ends up in half a dozen zustand stores, the TanStack cache,
 * the URL and the Mapbox instance. Selectively invalidating all of that is what
 * used to leave stale layers/years/object types behind, so we don't: we persist
 * the uuid and reload, which rebuilds every piece of state from scratch.
 *
 * The uuid lives in its own localStorage key rather than in the (persisted) auth
 * store so it can be read synchronously — before React mounts and before zustand
 * rehydrates — which is what lets the very first request of a page already carry
 * the right scope.
 */
const STORAGE_KEY = 'aigle.scoped-user-group-uuid';

/**
 * Route prefix on which the scope is disabled. The admin section manages
 * cross-tenant configuration and must always see ALL data, so the header is
 * never sent there. Crossing this boundary is a scope change — see
 * {@link isScopeBoundaryCrossed}.
 */
const SCOPE_DISABLED_PATH_PREFIX = '/admin';

export const isScopeDisabledPath = (pathname: string): boolean =>
    pathname === SCOPE_DISABLED_PATH_PREFIX || pathname.startsWith(`${SCOPE_DISABLED_PATH_PREFIX}/`);

/** True when navigating from `fromPathname` to `toPathname` flips the scope on or off. */
export const isScopeBoundaryCrossed = (fromPathname: string, toPathname: string): boolean =>
    isScopeDisabledPath(fromPathname) !== isScopeDisabledPath(toPathname);

export const getStoredUserGroupUuid = (): string | undefined => localStorage.getItem(STORAGE_KEY) || undefined;

export const clearStoredUserGroupUuid = (): void => localStorage.removeItem(STORAGE_KEY);

/**
 * Reload dropping the query string. The URL carries the object-type, custom-zone
 * and tile-set uuids of the group we are leaving; keeping them would restore a
 * filter selection that resolves to nothing under the new scope.
 */
export const reloadWithoutQuery = (): void => {
    window.location.replace(`${window.location.origin}${window.location.pathname}`);
};

/** Persist the new scope and hard-reload the app so no state survives the switch. */
export const setScopedUserGroupUuid = (uuid: string): void => {
    if (getStoredUserGroupUuid() === uuid) {
        return;
    }

    localStorage.setItem(STORAGE_KEY, uuid);
    reloadWithoutQuery();
};

/**
 * The uuid to forward as `X-User-Group-Uuid` for a request issued from the
 * current route, or `undefined` when no scope applies.
 */
const getActiveScopedUserGroupUuid = (): string | undefined => {
    if (isScopeDisabledPath(window.location.pathname)) {
        return undefined;
    }

    return getStoredUserGroupUuid();
};

/**
 * The only endpoints a SUPER_ADMIN may call before their scope is resolved — they
 * are what resolves it: auth, "who am I", and the group list itself.
 */
const isScopeBootstrapPath = (path: string): boolean =>
    path.startsWith('/auth/') || [usersEndpoints.me, userGroupEndpoints.list].includes(path.split('?')[0]);

export type RequestScope =
    | { readonly kind: 'send'; readonly uuid: string } // attach this uuid
    | { readonly kind: 'omit' } // no scope applies — send as-is
    | { readonly kind: 'block' }; // super admin without a scope — must not be answered unscoped

/**
 * How `api.ts` should scope one outgoing request. All the super-admin reasoning
 * lives here so the fetch path stays a plain "attach header or don't".
 */
export const resolveRequestScope = (path: string, userRole: UserRole | undefined): RequestScope => {
    // Only a SUPER_ADMIN may send the header — the API 403s it for anyone else, and a
    // uuid left in localStorage by a previous session must not leak into theirs.
    if (userRole !== 'SUPER_ADMIN') {
        return { kind: 'omit' };
    }

    const uuid = getActiveScopedUserGroupUuid();
    if (uuid) {
        return { kind: 'send', uuid };
    }

    // No scope resolved yet. Bootstrap calls (which resolve it) and the unscoped admin
    // section go through; anything else would come back as unrestricted super-admin
    // data — ALL object types, ALL tile set years — so block it instead.
    if (isScopeDisabledPath(window.location.pathname) || isScopeBootstrapPath(path)) {
        return { kind: 'omit' };
    }

    return { kind: 'block' };
};

// Returned by the API when the stored group was deleted (see aigle-api
// core/permissions/scope.py). The client keys its recovery on this exact code.
const UNKNOWN_SCOPED_USER_GROUP_CODE = 'UNKNOWN_SCOPED_USER_GROUP';

/**
 * A stored group that no longer exists fails every scoped call. Drop it and reload:
 * the bootstrap then falls back on the first available group. Loop-safe — once
 * cleared no header is sent, so the error cannot recur. Returns whether it recovered.
 */
export const recoverFromUnknownScope = (status: number, body: unknown): boolean => {
    if (status !== 400 || !getStoredUserGroupUuid()) {
        return false;
    }

    if ((body as { code?: string })?.code !== UNKNOWN_SCOPED_USER_GROUP_CODE) {
        return false;
    }

    clearStoredUserGroupUuid();
    reloadWithoutQuery();

    return true;
};

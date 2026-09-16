import { authEndpoints } from '@/api/endpoints';
import { useAuth } from '@/store/slices/auth';
import { resetBrevo } from '@/utils/brevo';
import { forgetMatomoUser, isMatomoUserIdentified, trackEvent, trackEventOnce } from '@/utils/matomo';
import { clearStoredUserGroupUuid, recoverFromUnknownScope, resolveRequestScope } from '@/utils/scope';
import { isNetworkError, TRACKING_CATEGORIES } from '@/utils/tracking';

const BASE_URL = import.meta.env.VITE_API_BASE_URL as string;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type ApiResponseType = 'json' | 'blob' | 'text';

export interface ApiFetchOptions {
    method?: HttpMethod;
    body?: unknown;
    params?: Record<string, unknown>;
    headers?: Record<string, string>;
    signal?: AbortSignal;
    responseType?: ApiResponseType;
    auth?: boolean;
}

export class ApiError<TBody = unknown> extends Error {
    readonly status: number;
    readonly body: TBody | undefined;
    readonly url: string;

    constructor(message: string, url: string, status: number, body?: TBody) {
        super(message);
        this.name = 'ApiError';
        this.url = url;
        this.status = status;
        this.body = body;
    }
}

const buildQuery = (params: Record<string, unknown> | undefined, pathHasQuery: boolean): string => {
    if (!params) {
        return '';
    }

    const parts: string[] = [];

    for (const key of Object.keys(params)) {
        const value = params[key];

        if (value === undefined || value === null) {
            continue;
        }

        if (Array.isArray(value)) {
            parts.push(`${encodeURIComponent(key)}=${value.map((v) => encodeURIComponent(String(v))).join(',')}`);
        } else {
            parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
        }
    }

    if (!parts.length) {
        return '';
    }

    return `${pathHasQuery ? '&' : '?'}${parts.join('&')}`;
};

const serializeBody = (body: unknown, headers: Record<string, string>): BodyInit | undefined => {
    if (body === undefined || body === null) {
        return undefined;
    }

    if (
        (typeof FormData !== 'undefined' && body instanceof FormData) ||
        (typeof Blob !== 'undefined' && body instanceof Blob) ||
        (typeof URLSearchParams !== 'undefined' && body instanceof URLSearchParams) ||
        body instanceof ArrayBuffer ||
        typeof body === 'string'
    ) {
        return body as BodyInit;
    }

    if (!headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    return JSON.stringify(body);
};

const doFetch = async (path: string, options: ApiFetchOptions): Promise<Response> => {
    const { method = 'GET', body, params, headers: userHeaders = {}, signal, auth = true } = options;

    const url = `${BASE_URL}${path}${buildQuery(params, path.includes('?'))}`;

    const headers: Record<string, string> = { ...userHeaders };

    const authState = useAuth.getState();
    const token = authState.accessToken;
    if (auth && token && !headers['Authorization']) {
        headers['Authorization'] = `JWT ${token}`;
    }

    if (auth && !headers['X-User-Group-Uuid']) {
        const scope = resolveRequestScope(path, authState.userMe?.userRole);

        if (scope.kind === 'send') {
            headers['X-User-Group-Uuid'] = scope.uuid;
        } else if (scope.kind === 'block') {
            // An unheadered scoped request comes back as unrestricted super-admin data
            // (ALL object types, ALL tile set years). Never let that reach a store.
            throw new ApiError(`${path} blocked: no user group scope selected`, path, 0);
        }
    }

    const fetchBody = serializeBody(body, headers);

    return fetch(url, {
        method,
        headers,
        body: fetchBody,
        signal,
    });
};

const NON_REPLAYABLE_PATHS = new Set<string>([authEndpoints.refreshToken, authEndpoints.login]);

// Single-flight refresh: concurrent 401s share one refresh promise instead of
// each firing its own refresh request and racing to overwrite the token.
let refreshPromise: Promise<string> | null = null;

const doRefresh = async (): Promise<string> => {
    const refreshToken = useAuth.getState().refreshToken;

    if (!refreshToken) {
        throw new ApiError('No refresh token available', authEndpoints.refreshToken, 401);
    }

    const response = await doFetch(authEndpoints.refreshToken, {
        method: 'POST',
        body: { refresh: refreshToken },
        auth: false,
    });

    if (!response.ok) {
        throw new ApiError('Refresh token request failed', authEndpoints.refreshToken, response.status);
    }

    const data = (await response.json()) as {
        access: string;
        refresh?: string;
    };

    useAuth.setState({
        accessToken: data.access,
        refreshToken: data.refresh ?? refreshToken,
    });

    return data.access;
};

const runRefresh = (): Promise<string> => {
    if (!refreshPromise) {
        refreshPromise = doRefresh().finally(() => {
            refreshPromise = null;
        });
    }

    return refreshPromise;
};

const UUID_SEGMENT = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATIC_SEGMENT = /^[a-z_-]+$/i;
const ERROR_CODE = /^[a-z0-9_]{1,64}$/i;

// '/api/detection-object/<uuid>/history/?x=1' -> '/api/detection-object/:uuid/history/': no id reaches Matomo.
const getEndpointPattern = (path: string): string =>
    path
        .split('?')[0]
        .split('/')
        .map((segment) => {
            if (!segment || STATIC_SEGMENT.test(segment)) {
                return segment;
            }

            return UUID_SEGMENT.test(segment) ? ':uuid' : ':id';
        })
        .join('/');

// A DRF validation error on a field named `code` (the geo zones have one) is a list of messages, not a code.
const getErrorCode = (body: unknown): string | undefined => {
    const code = (body as { code?: unknown } | null | undefined)?.code;
    return typeof code === 'string' && ERROR_CODE.test(code) ? code : undefined;
};

// Once per page load and name: TanStack retries a failed query 3 times, and the map refetches on every pan.
const trackApiError = (cause: string, method: HttpMethod, path: string, code?: string) =>
    trackEventOnce(
        TRACKING_CATEGORIES.errors,
        'Erreur API reçue',
        `${cause} ${method} ${getEndpointPattern(path)}${code ? ` ${code}` : ''}`,
    );

// The auth forms report their own failures.
const isAuthPath = (path: string) => path.startsWith('/auth/');

// The request itself, as opposed to the token refresh it may trigger, which reports its own failures.
const fetchRequest = async (path: string, options: ApiFetchOptions): Promise<Response> => {
    try {
        return await doFetch(path, options);
    } catch (error) {
        if (isNetworkError(error) && !isAuthPath(path)) {
            trackApiError('Réseau', options.method ?? 'GET', path);
        }

        throw error;
    }
};

const SESSION_CLOSED_STORAGE_KEY = 'aigle.session-closed';
const SESSION_EXPIRED = 'Jeton expiré';

const trackSessionClosed = (reason: string) => trackEvent(TRACKING_CATEGORIES.account, 'Session fermée', reason);

// An expiry found while bootstrapping is followed by a reload, which would drop the hit: the next load sends it.
const reportSessionExpired = () => {
    if (isMatomoUserIdentified()) {
        trackSessionClosed(SESSION_EXPIRED);
        return;
    }

    try {
        sessionStorage.setItem(SESSION_CLOSED_STORAGE_KEY, SESSION_EXPIRED);
    } catch {
        // storage unavailable: the hit is lost
    }
};

/** Sends the session expiry stashed by the load that logged the user out, if any. */
export const trackPendingSessionClosed = () => {
    let reason: string | null = null;

    try {
        reason = sessionStorage.getItem(SESSION_CLOSED_STORAGE_KEY);
        sessionStorage.removeItem(SESSION_CLOSED_STORAGE_KEY);
    } catch {
        return;
    }

    if (reason === SESSION_EXPIRED) {
        trackSessionClosed(reason);
    }
};

// Only the refresh endpoint saying the token is invalid ends the session. A network error, a 429 or
// a 5xx is the server's problem: the request fails, and the next one tries to refresh again.
const isRefreshTokenRejected = (error: unknown): boolean =>
    error instanceof ApiError && error.url === authEndpoints.refreshToken && [400, 401].includes(error.status);

const handleRefreshFailure = (refreshError: unknown) => {
    if (!isRefreshTokenRejected(refreshError)) {
        if (refreshError instanceof ApiError) {
            trackApiError(String(refreshError.status), 'POST', authEndpoints.refreshToken);
        } else if (isNetworkError(refreshError)) {
            trackApiError('Réseau', 'POST', authEndpoints.refreshToken);
        }

        return;
    }

    // Concurrent 401s share one refresh: only the first of them still finds the token.
    const wasSignedIn = !!useAuth.getState().refreshToken;

    useAuth.setState({
        accessToken: undefined,
        refreshToken: undefined,
        userMe: undefined,
    });
    clearStoredUserGroupUuid();
    // ponytail: clears the persisted visitor; this soft-logout doesn't reload, so a
    // loaded widget lingers until the next navigation: the deliberate logout() reloads
    resetBrevo();

    if (wasSignedIn) {
        reportSessionExpired();
    }
    forgetMatomoUser();
};

const fetchWithAuth = async (path: string, options: ApiFetchOptions): Promise<Response> => {
    let response = await fetchRequest(path, options);

    // Un 401 sur ces routes n'est pas un jeton expiré : refresh EST la route de refresh, et
    // login répond 401 sur identifiants invalides. Les rejouer masquerait l'erreur réelle.
    if (response.status === 401 && !NON_REPLAYABLE_PATHS.has(path)) {
        let newToken: string;

        try {
            newToken = await runRefresh();
        } catch (refreshError) {
            handleRefreshFailure(refreshError);

            throw refreshError;
        }

        response = await fetchRequest(path, {
            ...options,
            headers: {
                ...(options.headers ?? {}),
                Authorization: `JWT ${newToken}`,
            },
        });
    }

    return response;
};

const parseErrorBody = async (response: Response): Promise<unknown> => {
    const contentType = response.headers.get('content-type') ?? '';

    try {
        if (contentType.includes('application/json')) {
            return await response.json();
        }

        return await response.text();
    } catch {
        return undefined;
    }
};

const parseBody = async <T>(response: Response, responseType: ApiResponseType): Promise<T> => {
    if (responseType === 'blob') {
        return (await response.blob()) as T;
    }

    if (responseType === 'text') {
        return (await response.text()) as T;
    }

    // json — tolerate empty bodies (e.g. 204 No Content)
    const text = await response.text();

    if (!text) {
        return undefined as T;
    }

    try {
        return JSON.parse(text) as T;
    } catch {
        return text as T;
    }
};

export const apiFetchRaw = async (path: string, options: ApiFetchOptions = {}): Promise<Response> => {
    const response = await fetchWithAuth(path, options);

    if (!response.ok) {
        const errorBody = await parseErrorBody(response);
        const errorCode = getErrorCode(errorBody);

        // A 400 without a code is a form validation error, shown to the user.
        if (!isAuthPath(path) && (response.status !== 400 || errorCode)) {
            trackApiError(String(response.status), options.method ?? 'GET', path, errorCode);
        }

        // Can reload the page synchronously: the error is tracked first.
        recoverFromUnknownScope(response.status, errorBody);

        throw new ApiError(
            `${options.method ?? 'GET'} ${path} failed with status ${response.status}`,
            path,
            response.status,
            errorBody,
        );
    }

    return response;
};

async function api<T = unknown>(path: string, options: ApiFetchOptions = {}): Promise<T> {
    const response = await apiFetchRaw(path, options);
    return parseBody<T>(response, options.responseType ?? 'json');
}

export default api;

import { authEndpoints } from '@/api/endpoints';
import { useAuth } from '@/store/slices/auth';

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
            parts.push(`${key}=${value.join(',')}`);
        } else {
            parts.push(`${key}=${value}`);
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
    const { method = 'GET', body, params, headers: userHeaders = {}, signal } = options;
    const url = `${BASE_URL}${path}${buildQuery(params, path.includes('?'))}`;

    const headers: Record<string, string> = { ...userHeaders };
    const token = useAuth.getState().accessToken;
    if (token && !headers['Authorization']) {
        headers['Authorization'] = `JWT ${token}`;
    }

    const fetchBody = serializeBody(body, headers);

    return fetch(url, {
        method,
        headers,
        body: fetchBody,
        signal,
    });
};

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
        body: { token: refreshToken },
    });

    if (!response.ok) {
        throw new ApiError('Refresh token request failed', authEndpoints.refreshToken, response.status);
    }

    const data = (await response.json()) as { access: string };
    useAuth.setState({ accessToken: data.access });
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

const fetchWithAuth = async (path: string, options: ApiFetchOptions): Promise<Response> => {
    let response = await doFetch(path, options);

    if (response.status === 401 && path !== authEndpoints.refreshToken) {
        try {
            const newToken = await runRefresh();
            response = await doFetch(path, {
                ...options,
                headers: {
                    ...(options.headers ?? {}),
                    Authorization: `JWT ${newToken}`,
                },
            });
        } catch (refreshError) {
            useAuth.setState({
                accessToken: undefined,
                refreshToken: undefined,
                userMe: undefined,
            });
            throw refreshError;
        }
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

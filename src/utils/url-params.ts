export const setUrlParam = (key: string, value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState({}, '', url.toString());
};

export const getUrlParam = (key: string): string | null => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
};

// Merges a query string (`search`, with or without a leading "?") into `basePath`, keeping any
// params already present on `basePath`; params from `search` win on conflict. Always returns a
// well-formed path with a single "?" — safe even when `basePath` already carries a query string
// (e.g. the collectivites list path, which embeds `?collectivityType=...`).
// Pure helper with no router/DOM dependency; `useFilterNavigation` composes it with the current
// location to carry admin list filters (q, statuses, ...) across list ↔ form navigation.
export const mergeSearchIntoPath = (basePath: string, search: string): string => {
    const [pathname, baseQuery = ''] = basePath.split('?');
    const params = new URLSearchParams(baseQuery);
    new URLSearchParams(search).forEach((value, key) => {
        params.set(key, value);
    });
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
};

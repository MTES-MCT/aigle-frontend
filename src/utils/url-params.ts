export const setUrlParam = (key: string, value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState({}, '', url.toString());
};

export const getUrlParam = (key: string): string | null => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
};

// `search` params win on conflict; safe when `basePath` already carries a query string
// (e.g. the collectivites list path, which embeds `?collectivityType=...`).
export const mergeSearchIntoPath = (basePath: string, search: string): string => {
    const [pathname, baseQuery = ''] = basePath.split('?');
    const params = new URLSearchParams(baseQuery);
    new URLSearchParams(search).forEach((value, key) => {
        params.set(key, value);
    });
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
};

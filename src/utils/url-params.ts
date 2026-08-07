// `search` params win on conflict; safe when `basePath` already carries a query string
// (e.g. the collectivites list path, which embeds `?tab=...`).
export const mergeSearchIntoPath = (basePath: string, search: string): string => {
    const [pathname, baseQuery = ''] = basePath.split('?');
    const params = new URLSearchParams(baseQuery);
    new URLSearchParams(search).forEach((value, key) => {
        params.set(key, value);
    });
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
};

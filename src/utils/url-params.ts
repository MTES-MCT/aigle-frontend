export const setUrlParam = (key: string, value: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(key, value);
    window.history.replaceState({}, '', url.toString());
};

export const getUrlParam = (key: string): string | null => {
    const params = new URLSearchParams(window.location.search);
    return params.get(key);
};


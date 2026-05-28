interface MapViewState {
    latitude: number;
    longitude: number;
    zoom: number;
}

export const getViewStateFromUrl = (): MapViewState | null => {
    const hash = window.location.hash;
    const match = hash.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*),(\d+\.?\d*)z/);
    if (!match) return null;

    const latitude = parseFloat(match[1]);
    const longitude = parseFloat(match[2]);
    const zoom = parseFloat(match[3]);

    if (isNaN(latitude) || isNaN(longitude) || isNaN(zoom)) return null;
    if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

    return { latitude, longitude, zoom };
};

export const setViewStateInUrl = (latitude: number, longitude: number, zoom: number) => {
    const roundedLat = Math.round(latitude * 1e7) / 1e7;
    const roundedLng = Math.round(longitude * 1e7) / 1e7;
    const roundedZoom = Math.round(zoom * 100) / 100;

    const url = new URL(window.location.href);
    url.hash = `@${roundedLat},${roundedLng},${roundedZoom}z`;
    window.history.replaceState({}, '', url.toString());
};

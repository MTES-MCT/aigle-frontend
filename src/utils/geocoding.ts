import { MAPBOX_TOKEN } from '@/utils/constants';

const FORWARD_GEOCODING_URL = 'https://api.mapbox.com/search/geocode/v6/forward';

export interface AddressSuggestion {
    id: string;
    name: string;
    context: string;
    postcode?: string;
    center: [number, number];
}

interface MapboxForwardFeature {
    id: string;
    properties: {
        name?: string;
        place_formatted?: string;
        full_address?: string;
        coordinates?: { longitude: number; latitude: number };
        context?: { postcode?: { name?: string } };
    };
    geometry: { coordinates: [number, number] };
}

// Corsica departments 2A/2B map to postcode prefix "20"; overseas (97x) use 3-digit prefixes.
export const getDepartmentPostcodePrefix = (code: string): string => {
    if (code.startsWith('97')) {
        return code.substring(0, 3);
    }

    if (code.startsWith('2A') || code.startsWith('2B')) {
        return '20';
    }

    return code.substring(0, 2);
};

interface SearchAddressOptions {
    signal?: AbortSignal;
    bbox?: [number, number, number, number];
    limit?: number;
}

export const searchAddress = async (
    query: string,
    { signal, bbox, limit = 8 }: SearchAddressOptions = {},
): Promise<AddressSuggestion[]> => {
    const params = new URLSearchParams({
        q: query,
        country: 'fr',
        language: 'fr',
        limit: String(limit),
        access_token: MAPBOX_TOKEN,
    });

    if (bbox) {
        params.set('bbox', bbox.join(','));
    }

    const response = await fetch(`${FORWARD_GEOCODING_URL}?${params.toString()}`, { signal });

    if (!response.ok) {
        throw new Error(`Recherche d'adresse indisponible (${response.status})`);
    }

    const data: { features?: MapboxForwardFeature[] } = await response.json();

    return (data.features || []).map((feature) => ({
        id: feature.id,
        name: feature.properties.name || feature.properties.full_address || '',
        context: feature.properties.place_formatted || '',
        postcode: feature.properties.context?.postcode?.name,
        center: feature.properties.coordinates
            ? [feature.properties.coordinates.longitude, feature.properties.coordinates.latitude]
            : feature.geometry.coordinates,
    }));
};

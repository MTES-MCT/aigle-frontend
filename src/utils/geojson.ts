import { CollectivityType } from '@/models/geo/_common';
import { GeoZone } from '@/models/geo/geo-zone';
import { SelectOption } from '@/models/ui/select-option';
import { MAPBOX_TOKEN } from '@/utils/constants';
import { centroid, getCoord } from '@turf/turf';
import { Polygon } from 'geojson';

export type LngLat = [number, number];

export type GeoValues = {
    [key in CollectivityType]: SelectOption[];
};

export const geoZoneToGeoOption = (geoZone: GeoZone): SelectOption => ({
    value: geoZone.uuid,
    label: geoZone.code ? `${geoZone.name} (${geoZone.code})` : geoZone.name,
});

export const extendBbox = (
    bbox: [number, number, number, number],
    level: number = 1,
): [number, number, number, number] => {
    const width = bbox[2] - bbox[0];
    const height = bbox[3] - bbox[1];

    return [bbox[0] - level * width, bbox[1] - level * height, bbox[2] + level * width, bbox[3] + level * height];
};

export const getAddressFromPolygon = async (polygon: Polygon): Promise<string | null> => {
    const [lng, lat] = getCoord(centroid(polygon)) as LngLat;

    const response = await fetch(
        `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&access_token=${MAPBOX_TOKEN}`,
    );
    const data = await response.json();

    if (data.features && data.features.length > 0) {
        const address = data.features[0].properties.name_preferred;
        return address;
    } else {
        return null;
    }
};

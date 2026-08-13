import { useAuth } from '@/store/slices/auth';
import { useMap } from '@/store/slices/map';
import { MAPBOX_TOKEN } from '@/utils/constants';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { bbox } from '@turf/turf';
import mapboxgl from 'mapbox-gl';
import React, { useEffect } from 'react';
import { IControl, useControl } from 'react-map-gl';

// the geocoder types describe the whole mapbox-gl module namespace, the app imports its default export
type GeocoderMapboxgl = NonNullable<NonNullable<ConstructorParameters<typeof MapboxGeocoder>[0]>['mapboxgl']>;

// Corsica departments 2A/2B map to postcode prefix "20"; overseas (97x) use 3-digit prefixes.
const getDepartmentPostcodePrefix = (code: string): string => {
    if (code.startsWith('97')) return code.substring(0, 3);
    if (code.startsWith('2A') || code.startsWith('2B')) return '20';
    return code.substring(0, 2);
};

interface ComponentProps {
    onSearch: () => void;
}

// mapbox appends top-left controls in the order they are added, so this has to stay the
// first child of the map for the search bar to keep its place at the far left
const Component: React.FC<ComponentProps> = ({ onSearch }) => {
    const { settings } = useMap();
    const { userMe } = useAuth();

    // react-map-gl types every control against its own IControl, which the geocoder class
    // does not structurally match, hence the casts on the way in and out
    const geocoder = useControl(
        () =>
            new MapboxGeocoder({
                accessToken: MAPBOX_TOKEN,
                mapboxgl: mapboxgl as unknown as GeocoderMapboxgl,
                placeholder: 'Rechercher par adresse',
                countries: 'fr',
            }) as unknown as IControl,
        { position: 'top-left' },
    ) as unknown as MapboxGeocoder;

    useEffect(() => {
        if (!settings?.globalGeometryBbox) {
            return;
        }

        geocoder.setBbox(bbox(settings.globalGeometryBbox) as [number, number, number, number]);
    }, [geocoder, settings?.globalGeometryBbox]);

    useEffect(() => {
        if (!userMe || userMe.userRole === 'SUPER_ADMIN') {
            return;
        }

        const geoZones = userMe.userUserGroups.flatMap(({ userGroup }) => userGroup.geoZones);
        const postcodePrefixes = new Set<string>();

        for (const zone of geoZones) {
            if (!zone.code) continue;

            if (zone.geoZoneType === 'DEPARTMENT' || zone.geoZoneType === 'COMMUNE') {
                postcodePrefixes.add(getDepartmentPostcodePrefix(zone.code));
            }
        }

        if (!postcodePrefixes.size) {
            return;
        }

        geocoder.setFilter((feature: GeoJSON.Feature) => {
            const context = (feature as { context?: { id: string; text: string }[] }).context;
            const postcodeEntry = context?.find((c) => c.id.startsWith('postcode.'));

            if (!postcodeEntry) return true;

            return postcodePrefixes.has(getDepartmentPostcodePrefix(postcodeEntry.text));
        });
    }, [geocoder, userMe]);

    useEffect(() => {
        geocoder.on('loading', onSearch);

        return () => {
            try {
                geocoder.off('loading', onSearch);
            } catch {}
        };
    }, [geocoder, onSearch]);

    return null;
};

export default Component;

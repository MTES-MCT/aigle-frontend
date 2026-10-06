import { useAuth } from '@/store/slices/auth';
import { useMap } from '@/store/slices/map';
import { MAPBOX_TOKEN } from '@/utils/constants';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import { notifications } from '@mantine/notifications';
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import { bbox } from '@turf/turf';
import mapboxgl from 'mapbox-gl';
import React, { useEffect, useRef } from 'react';
import { IControl, useControl } from 'react-map-gl';

// the geocoder types describe the whole mapbox-gl module namespace, the app imports its default export
type GeocoderMapboxgl = NonNullable<NonNullable<ConstructorParameters<typeof MapboxGeocoder>[0]>['mapboxgl']>;

// Corsica departments 2A/2B map to postcode prefix "20"; overseas (97x) use 3-digit prefixes.
const getDepartmentPostcodePrefix = (code: string): string => {
    if (code.startsWith('97')) return code.substring(0, 3);
    if (code.startsWith('2A') || code.startsWith('2B')) return '20';
    return code.substring(0, 2);
};

// The geocoder searches as the agent types: a query only counts as failed once the typing has stopped.
const FAILED_SEARCH_SETTLE_DELAY_MS = 1500;
const MIN_TRACKED_QUERY_LENGTH = 3;

type AddressSearchFailure = 'Aucun résultat' | 'Hors périmètre' | 'Erreur';

type GeocoderFeature = GeoJSON.Feature & {
    id?: string;
    place_type?: string[];
    place_name?: string;
    user_coordinates?: number[];
};

// One typing session runs from the first keystroke to a pick or a clear.
interface SearchSession {
    query: string;
    suggestions: GeocoderFeature[];
    // suggestions of the response being handled dropped by the perimeter filter: the geocoder runs the
    // filter right before each 'results', so responses to overlapping queries do not add up
    filteredOut: number;
    lastSelectedLabel?: string;
    failureTimer?: ReturnType<typeof setTimeout>;
    failureTracked: boolean;
    errorNotified: boolean;
}

interface ComponentProps {
    onSearch: () => void;
    tracked?: boolean;
}

// mapbox appends top-left controls in the order they are added, so this has to stay the
// first child of the map for the search bar to keep its place at the far left
const Component: React.FC<ComponentProps> = ({ onSearch, tracked = false }) => {
    const { settings } = useMap();
    const { userMe } = useAuth();
    const sessionRef = useRef<SearchSession>({
        query: '',
        suggestions: [],
        filteredOut: 0,
        failureTracked: false,
        errorNotified: false,
    });
    const trackedRef = useRef(tracked);
    trackedRef.current = tracked;

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

            if (postcodePrefixes.has(getDepartmentPostcodePrefix(postcodeEntry.text))) {
                return true;
            }

            sessionRef.current.filteredOut += 1;
            return false;
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

    useEffect(() => {
        const session = sessionRef.current;

        const cancelFailure = () => {
            clearTimeout(session.failureTimer);
            session.failureTimer = undefined;
        };

        // the latest outcome wins: a failure is sent only if no other query follows it
        const settleFailure = (failure: AddressSearchFailure) => {
            cancelFailure();

            if (
                !trackedRef.current ||
                session.failureTracked ||
                session.query.trim().length < MIN_TRACKED_QUERY_LENGTH ||
                session.query === session.lastSelectedLabel
            ) {
                return;
            }

            session.failureTimer = setTimeout(() => {
                session.failureTimer = undefined;
                session.failureTracked = true;
                trackEvent(TRACKING_CATEGORIES.map, 'Adresse recherchée', failure);
            }, FAILED_SEARCH_SETTLE_DELAY_MS);
        };

        const endSession = () => {
            cancelFailure();
            session.failureTracked = false;
            session.errorNotified = false;
            session.suggestions = [];
        };

        const handleLoading = ({ query }: { query: string }) => {
            cancelFailure();
            session.query = query;
        };

        // also emitted, empty, right before 'error': the error then replaces this outcome
        const handleResults = ({ features }: { features: GeocoderFeature[] }) => {
            const { filteredOut } = session;
            session.filteredOut = 0;
            session.suggestions = features;

            if (features.length) {
                cancelFailure();
                return;
            }

            settleFailure(filteredOut ? 'Hors périmètre' : 'Aucun résultat');
        };

        const handleError = () => {
            // the geocoder only says so in english, inside its own dropdown
            if (!session.errorNotified) {
                session.errorNotified = true;
                notifications.show({
                    color: 'red',
                    title: 'Recherche par adresse indisponible',
                    message: "Le service de recherche d'adresse n'a pas répondu, veuillez réessayer",
                });
            }

            settleFailure('Erreur');
        };

        const handleResult = ({ result }: { result: GeocoderFeature }) => {
            const rank = session.suggestions.findIndex(({ id }) => id === result.id) + 1;

            if (trackedRef.current && !result.user_coordinates) {
                trackEvent(
                    TRACKING_CATEGORIES.map,
                    'Adresse recherchée',
                    `Choisie : ${result.place_type?.[0] ?? 'inconnu'}`,
                    rank || undefined,
                );
            }

            endSession();
            session.lastSelectedLabel = result.place_name;
        };

        geocoder.on('loading', handleLoading);
        geocoder.on('results', handleResults);
        geocoder.on('error', handleError);
        geocoder.on('result', handleResult);
        geocoder.on('clear', endSession);

        return () => {
            cancelFailure();
            try {
                geocoder.off('loading', handleLoading);
                geocoder.off('results', handleResults);
                geocoder.off('error', handleError);
                geocoder.off('result', handleResult);
                geocoder.off('clear', endSession);
            } catch {}
        };
    }, [geocoder]);

    return null;
};

export default Component;

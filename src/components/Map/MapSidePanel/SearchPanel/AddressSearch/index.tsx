import React, { useEffect, useMemo, useRef, useState } from 'react';

import Autocomplete, { AutocompleteOption } from '@/components/dsfr/Autocomplete';
import { useAuth } from '@/store/slices/auth';
import { useMap } from '@/store/slices/map';
import { AddressSuggestion, getDepartmentPostcodePrefix, searchAddress } from '@/utils/geocoding';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import { bbox } from '@turf/turf';

const SEARCH_DEBOUNCE_MS = 250;

// The search runs as the agent types: a query only counts as failed once the typing has stopped.
const FAILED_SEARCH_SETTLE_DELAY_MS = 1500;
const MIN_TRACKED_QUERY_LENGTH = 3;

type AddressSearchFailure = 'Aucun résultat' | 'Hors périmètre' | 'Erreur';

// One typing session runs from the first keystroke to a pick or a clear.
interface SearchSession {
    lastSelectedLabel?: string;
    failureTracked: boolean;
    errorNotified: boolean;
}

interface ComponentProps {
    tracked: boolean;
}

const Component: React.FC<ComponentProps> = ({ tracked }: ComponentProps) => {
    const { settings, eventEmitter } = useMap();
    const { userMe } = useAuth();
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);
    const sessionRef = useRef<SearchSession>({ failureTracked: false, errorNotified: false });

    // Non super-admins only get suggestions inside the postcodes of the zones they can access.
    const allowedPostcodePrefixes = useMemo(() => {
        if (!userMe || userMe.userRole === 'SUPER_ADMIN') {
            return null;
        }

        const prefixes = new Set<string>();

        userMe.userUserGroups
            .flatMap(({ userGroup }) => userGroup.geoZones)
            .forEach((zone) => {
                if (zone.code && ['DEPARTMENT', 'COMMUNE'].includes(zone.geoZoneType)) {
                    prefixes.add(getDepartmentPostcodePrefix(zone.code));
                }
            });

        return prefixes.size ? prefixes : null;
    }, [userMe]);

    const globalBbox = useMemo(
        () =>
            settings?.globalGeometryBbox
                ? (bbox(settings.globalGeometryBbox) as [number, number, number, number])
                : undefined,
        [settings?.globalGeometryBbox],
    );

    const {
        data: suggestions,
        isFetching,
        isError,
    } = useQuery<AddressSuggestion[]>({
        queryKey: ['address-search', debouncedSearch, globalBbox?.join(',')],
        enabled: !!debouncedSearch,
        queryFn: ({ signal }) => searchAddress(debouncedSearch, { signal, bbox: globalBbox }),
    });

    const visibleSuggestions = useMemo(
        () =>
            (suggestions || []).filter(
                ({ postcode }) =>
                    !allowedPostcodePrefixes ||
                    !postcode ||
                    allowedPostcodePrefixes.has(getDepartmentPostcodePrefix(postcode)),
            ),
        [suggestions, allowedPostcodePrefixes],
    );

    // the latest outcome wins: a failure is sent only if no other query follows it
    useEffect(() => {
        const session = sessionRef.current;

        if (!debouncedSearch || isFetching) {
            return;
        }

        let failure: AddressSearchFailure | undefined;

        if (isError) {
            if (!session.errorNotified) {
                session.errorNotified = true;
                notifications.show({
                    color: 'red',
                    title: 'Recherche par adresse indisponible',
                    message: "Le service de recherche d'adresse n'a pas répondu, veuillez réessayer",
                });
            }

            failure = 'Erreur';
        } else if (!visibleSuggestions.length) {
            failure = suggestions?.length ? 'Hors périmètre' : 'Aucun résultat';
        }

        if (
            !failure ||
            !tracked ||
            session.failureTracked ||
            debouncedSearch.trim().length < MIN_TRACKED_QUERY_LENGTH ||
            debouncedSearch === session.lastSelectedLabel
        ) {
            return;
        }

        const failureTimer = setTimeout(() => {
            session.failureTracked = true;
            trackEvent(TRACKING_CATEGORIES.map, 'Adresse recherchée', failure);
        }, FAILED_SEARCH_SETTLE_DELAY_MS);

        return () => clearTimeout(failureTimer);
    }, [debouncedSearch, isFetching, isError, suggestions, visibleSuggestions, tracked]);

    const endSession = () => {
        sessionRef.current.failureTracked = false;
        sessionRef.current.errorNotified = false;
    };

    const options: AutocompleteOption[] = useMemo(
        () => visibleSuggestions.map(({ id, name, context }) => ({ value: id, label: name, description: context })),
        [visibleSuggestions],
    );

    return (
        <Autocomplete
            variant="search"
            label="Rechercher par adresse"
            placeholder="Rechercher par adresse"
            value={search}
            options={options}
            loading={isFetching}
            emptyText="Aucune adresse trouvée"
            onChange={(value) => {
                if (!value) {
                    endSession();
                }
                setSearch(value);
            }}
            onSelect={({ value, label }) => {
                const suggestionIndex = visibleSuggestions.findIndex((item) => item.id === value);
                const suggestion = visibleSuggestions[suggestionIndex];

                if (!suggestion) {
                    return;
                }

                if (tracked) {
                    trackEvent(
                        TRACKING_CATEGORIES.map,
                        'Adresse recherchée',
                        `Choisie : ${suggestion.featureType ?? 'inconnu'}`,
                        suggestionIndex + 1,
                    );
                }

                endSession();
                sessionRef.current.lastSelectedLabel = label;
                setSearch(label);
                eventEmitter.emit('JUMP_TO', suggestion.center);
            }}
        />
    );
};

export default Component;

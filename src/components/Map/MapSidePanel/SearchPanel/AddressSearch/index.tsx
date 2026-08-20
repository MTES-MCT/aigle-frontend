import React, { useMemo, useState } from 'react';

import Autocomplete, { AutocompleteOption } from '@/components/dsfr/Autocomplete';
import { useAuth } from '@/store/slices/auth';
import { useMap } from '@/store/slices/map';
import { AddressSuggestion, getDepartmentPostcodePrefix, searchAddress } from '@/utils/geocoding';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { bbox } from '@turf/turf';

const SEARCH_DEBOUNCE_MS = 250;

const Component: React.FC = () => {
    const { settings, eventEmitter } = useMap();
    const { userMe } = useAuth();
    const [search, setSearch] = useState('');
    const [debouncedSearch] = useDebouncedValue(search, SEARCH_DEBOUNCE_MS);

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

    const { data: suggestions, isFetching } = useQuery<AddressSuggestion[]>({
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
            onChange={setSearch}
            onSelect={({ value, label }) => {
                const suggestion = visibleSuggestions.find((item) => item.id === value);

                if (!suggestion) {
                    return;
                }

                setSearch(label);
                eventEmitter.emit('JUMP_TO', suggestion.center);
            }}
        />
    );
};

export default Component;

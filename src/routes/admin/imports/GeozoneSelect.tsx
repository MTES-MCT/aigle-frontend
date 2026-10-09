import React, { useMemo, useState } from 'react';

import { getGeoListEndpoint } from '@/api/endpoints';
import { Paginated } from '@/models/data';
import { CollectivityType, GeoCollectivity } from '@/models/geo/_common';
import { SelectOption } from '@/models/ui/select-option';
import api from '@/utils/api';
import { geoZoneToGeoOption } from '@/utils/geojson';
import { SegmentedControl, Select, Stack } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';

const OPTIONS_LIMIT = 20;

// the levels a deployment can target (a region is not deployable)
const COLLECTIVITY_TYPES: { value: CollectivityType; label: string }[] = [
    { value: 'department', label: 'Département' },
    { value: 'epci', label: 'EPCI' },
    { value: 'commune', label: 'Commune' },
];

interface ComponentProps {
    label: string;
    description?: string;
    value: string | null;
    onChange: (uuid: string | null) => void;
}

// Pick the collectivity to deploy onto, by uuid.
const Component: React.FC<ComponentProps> = ({ label, description, value, onChange }) => {
    const [collectivityType, setCollectivityType] = useState<CollectivityType>('department');
    const [search, setSearch] = useState('');
    // kept apart from the results: they change with the search, the picked label must not
    const [selected, setSelected] = useState<SelectOption | null>(null);
    // picking an option fills the input with its label, which is no search
    const [searchDebounced] = useDebouncedValue(search === selected?.label ? '' : search, 250);

    const { data: geos, isFetching } = useQuery({
        queryKey: ['geozone-select', collectivityType, searchDebounced],
        queryFn: ({ signal }) =>
            api<Paginated<GeoCollectivity>>(getGeoListEndpoint(collectivityType), {
                params: { q: searchDebounced, limit: OPTIONS_LIMIT, offset: 0 },
                signal,
            }).then((res) => res.results),
    });

    const options = useMemo(
        () => [
            ...(selected ? [selected] : []),
            ...(geos || []).filter((geo) => geo.uuid !== selected?.value).map(geoZoneToGeoOption),
        ],
        [selected, geos],
    );

    const changeCollectivityType = (type: string) => {
        setCollectivityType(type as CollectivityType);
        setSearch('');
        setSelected(null);
        onChange(null);
    };

    return (
        <Stack gap="xs">
            <SegmentedControl data={COLLECTIVITY_TYPES} value={collectivityType} onChange={changeCollectivityType} />
            <Select
                label={label}
                description={description}
                placeholder="Rechercher une collectivité"
                data={options}
                value={value}
                onChange={(uuid, option) => {
                    setSelected(uuid ? option : null);
                    onChange(uuid);
                }}
                searchValue={search}
                onSearchChange={setSearch}
                searchable
                clearable
                nothingFoundMessage={isFetching ? 'Recherche en cours…' : 'Aucun résultat'}
                // the backend already did the filtering, keep all it returned
                filter={({ options }) => options}
            />
        </Stack>
    );
};

export default Component;

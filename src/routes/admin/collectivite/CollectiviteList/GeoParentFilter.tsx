import React, { useEffect, useMemo, useState } from 'react';

import { getGeoListEndpoint } from '@/api/endpoints';
import { Paginated } from '@/models/data';
import { CollectivityType, GeoCollectivity } from '@/models/geo/_common';
import api from '@/utils/api';
import { geoZoneToGeoOption } from '@/utils/geojson';
import { MultiSelect } from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';

const OPTIONS_LIMIT = 20;

const fetchGeo = (collectivityType: CollectivityType, params: Record<string, unknown>, signal: AbortSignal) =>
    api<Paginated<GeoCollectivity>>(getGeoListEndpoint(collectivityType), { params, signal }).then(
        (res) => res.results,
    );

interface ComponentProps {
    collectivityType: CollectivityType;
    label: string;
    placeholder: string;
    value: string[];
    onChange: (uuids: string[]) => void;
}

const Component: React.FC<ComponentProps> = ({ collectivityType, label, placeholder, value, onChange }) => {
    const [search, setSearch] = useState('');
    const [searchDebounced] = useDebouncedValue(search, 250);
    // Every label we have ever seen. A uuid arriving from the URL (or from a drill-down
    // button) has no label until resolved, and must not lose it when the search changes.
    const [labels, setLabels] = useState<Record<string, string>>({});

    const { data: searched } = useQuery({
        queryKey: ['geo-filter', collectivityType, searchDebounced],
        queryFn: ({ signal }) =>
            fetchGeo(collectivityType, { q: searchDebounced, limit: OPTIONS_LIMIT, offset: 0 }, signal),
    });

    const uuidsUnresolved = value.filter((uuid) => !labels[uuid]).join(',');
    const { data: resolved } = useQuery({
        queryKey: ['geo-filter-resolve', collectivityType, uuidsUnresolved],
        enabled: !!uuidsUnresolved,
        queryFn: ({ signal }) =>
            fetchGeo(collectivityType, { uuids: uuidsUnresolved, limit: uuidsUnresolved.split(',').length }, signal),
    });

    useEffect(() => {
        const geos = [...(searched || []), ...(resolved || [])];

        if (!geos.length) {
            return;
        }

        setLabels((prev) => ({
            ...prev,
            ...Object.fromEntries(geos.map((geo) => [geo.uuid, geoZoneToGeoOption(geo).label])),
        }));
    }, [searched, resolved]);

    const options = useMemo(
        () => [
            ...value.map((uuid) => ({ value: uuid, label: labels[uuid] || uuid })),
            ...(searched || []).filter((geo) => !value.includes(geo.uuid)).map(geoZoneToGeoOption),
        ],
        [value, labels, searched],
    );

    return (
        <MultiSelect
            label={label}
            placeholder={placeholder}
            data={options}
            value={value}
            onChange={onChange}
            onSearchChange={setSearch}
            searchable
            clearable
            hidePickedOptions
            // the backend already did the filtering, keep all it returned
            filter={({ options }) => options}
        />
    );
};

export default Component;

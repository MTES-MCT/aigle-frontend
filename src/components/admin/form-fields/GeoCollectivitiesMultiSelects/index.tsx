import { getGeoListEndpoint } from '@/api-endpoints';
import { Paginated } from '@/models/data';
import { CollectivityType, GeoCollectivity, collectivityTypes } from '@/models/geo/_common';
import { GeoCommune } from '@/models/geo/geo-commune';
import { GeoDepartment } from '@/models/geo/geo-department';
import { GeoRegion } from '@/models/geo/geo-region';
import { SelectOption } from '@/models/ui/select-option';
import api from '@/utils/api';
import { GeoValues, geoZoneToGeoOption } from '@/utils/geojson';
import { Loader as MantineLoader, MultiSelect } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

const GEO_COLLECTIVITIES_LIMIT = 10;

const fetchGeoCollectivities = async <T extends GeoCollectivity>(
    collectivityType: CollectivityType,
    q: string,
): Promise<T[]> => {
    const endpoint = getGeoListEndpoint(collectivityType);
    const res = await api.get<Paginated<T>>(endpoint, {
        params: {
            q,
            limit: GEO_COLLECTIVITIES_LIMIT,
            offset: 0,
        },
    });
    return res.data.results;
};

const getGeoSelectedUuids = (
    geoSelectedValues: GeoValues,
): {
    [key in CollectivityType]: string[];
} => {
    return {
        region: geoSelectedValues.region.map((geo) => geo.value),
        department: geoSelectedValues.department.map((geo) => geo.value),
        commune: geoSelectedValues.commune.map((geo) => geo.value),
    };
};

const getGeoMultiSelectValues = (
    geoResults: {
        [key in CollectivityType]: GeoCollectivity[];
    },
    geoSelectedValues: GeoValues,
): {
    [key in CollectivityType]: SelectOption[];
} => {
    const geoSelectedUuids = getGeoSelectedUuids(geoSelectedValues);

    const res: {
        [key in CollectivityType]: SelectOption[];
    } = {
        region: [],
        department: [],
        commune: [],
    };

    collectivityTypes.forEach((collectivityType) => {
        res[collectivityType] = [
            ...geoSelectedValues[collectivityType],
            ...(geoResults[collectivityType] || [])
                .filter((geo) => !geoSelectedUuids[collectivityType].includes(geo.uuid))
                .map((geo) => geoZoneToGeoOption(geo)),
        ];
    });

    return res;
};

interface GeoCollectivitiesFormValues {
    regionsUuids: string[];
    departmentsUuids: string[];
    communesUuids: string[];
}

interface ComponentProps<T extends GeoCollectivitiesFormValues> {
    form: UseFormReturnType<T>;
    initialGeoSelectedValues?: GeoValues;
    className?: string;
}

const Component = <T extends GeoCollectivitiesFormValues>({
    form,
    initialGeoSelectedValues,
    className,
}: ComponentProps<T>) => {
    const [geoInputValues, setGeoInputValues] = useState<{
        [key in CollectivityType]: string;
    }>({
        region: '',
        department: '',
        commune: '',
    });
    const [debouncedGeoInputValues] = useDebouncedValue(geoInputValues, 250);

    const { data: regions, isLoading: regionsIsLoading } = useQuery<GeoRegion[]>({
        queryKey: ['regions', debouncedGeoInputValues.region],
        enabled: !!debouncedGeoInputValues.region,
        queryFn: () => fetchGeoCollectivities<GeoRegion>('region', debouncedGeoInputValues.region),
    });
    const { data: departments, isLoading: departmentsIsLoading } = useQuery<GeoDepartment[]>({
        queryKey: ['departments', debouncedGeoInputValues.department],
        enabled: !!debouncedGeoInputValues.department,
        queryFn: () => fetchGeoCollectivities<GeoDepartment>('department', debouncedGeoInputValues.department),
    });
    const { data: communes, isLoading: communesIsLoading } = useQuery<GeoCommune[]>({
        queryKey: ['communes', debouncedGeoInputValues.commune],
        enabled: !!debouncedGeoInputValues.commune,
        queryFn: () => fetchGeoCollectivities<GeoCommune>('commune', debouncedGeoInputValues.commune),
    });

    const [geoSelectedValues, setGeoSelectedValues] = useState<GeoValues>(
        initialGeoSelectedValues || {
            region: [],
            department: [],
            commune: [],
        },
    );

    const geoMultiSelectValues = useMemo(
        () =>
            getGeoMultiSelectValues(
                {
                    region: regions || [],
                    department: departments || [],
                    commune: communes || [],
                },
                geoSelectedValues,
            ),
        [regions, departments, communes, geoSelectedValues],
    );

    const geoOnOptionSubmit = (uuid: string, collectivityType: CollectivityType, geoItems?: GeoCollectivity[]) => {
        const option = geoItems?.find((geo) => geo.uuid === uuid);

        if (!option) {
            return;
        }

        setGeoSelectedValues((prev) => ({
            ...prev,
            [collectivityType]: [...prev[collectivityType], geoZoneToGeoOption(option)],
        }));
    };

    const geoOnRemove = (uuid: string, collectivityType: CollectivityType) => {
        setGeoSelectedValues((prev) => ({
            ...prev,
            [collectivityType]: prev[collectivityType].filter((geo) => geo.value !== uuid),
        }));
    };

    return (
        <div className={className}>
            <MultiSelect
                mt="md"
                label="Regions"
                placeholder="Rechercher une région"
                searchable
                data={geoMultiSelectValues.region}
                onSearchChange={(value) => {
                    setGeoInputValues((prev) => ({
                        ...prev,
                        region: value,
                    }));
                }}
                rightSection={regionsIsLoading ? <MantineLoader size="xs" /> : null}
                hidePickedOptions={true}
                key={form.key('regionsUuids')}
                {...form.getInputProps('regionsUuids')}
                onOptionSubmit={(uuid) => geoOnOptionSubmit(uuid, 'region', regions)}
                onRemove={(uuid) => geoOnRemove(uuid, 'region')}
                filter={({ options }) => options}
            />
            <MultiSelect
                mt="md"
                label="Départements"
                placeholder="Rechercher un département"
                searchable
                data={geoMultiSelectValues.department}
                onSearchChange={(value) => {
                    setGeoInputValues((prev) => ({
                        ...prev,
                        department: value,
                    }));
                }}
                rightSection={departmentsIsLoading ? <MantineLoader size="xs" /> : null}
                hidePickedOptions={true}
                key={form.key('departmentsUuids')}
                {...form.getInputProps('departmentsUuids')}
                onOptionSubmit={(uuid) => geoOnOptionSubmit(uuid, 'department', departments)}
                onRemove={(uuid) => geoOnRemove(uuid, 'department')}
                filter={({ options }) => options}
            />
            <MultiSelect
                mt="md"
                label="Communes"
                placeholder="Rechercher une commune"
                searchable
                data={geoMultiSelectValues.commune}
                onSearchChange={(value) => {
                    setGeoInputValues((prev) => ({
                        ...prev,
                        commune: value,
                    }));
                }}
                rightSection={communesIsLoading ? <MantineLoader size="xs" /> : null}
                hidePickedOptions={true}
                key={form.key('communesUuids')}
                {...form.getInputProps('communesUuids')}
                onOptionSubmit={(uuid) => geoOnOptionSubmit(uuid, 'commune', communes)}
                onRemove={(uuid) => geoOnRemove(uuid, 'commune')}
                filter={({ options }) => options}
            />
        </div>
    );
};

export default Component;

import { STATISTICS_VALIDATION_STATUS_EVOLUTION_ENDPOINT } from '@/api-endpoints';
import Loader from '@/components/ui/Loader';
import { ObjectsFilter } from '@/models/detection-filter';
import { ValidationStatusEvolution } from '@/models/statistics/valisation-status-evolution';
import { TileSet } from '@/models/tile-set';
import api from '@/utils/api';
import { DETECTION_VALIDATION_STATUSES_COLORS_MAP, DETECTION_VALIDATION_STATUSES_NAMES_MAP } from '@/utils/constants';
import { AreaChart } from '@mantine/charts';
import { LoadingOverlay } from '@mantine/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import classes from './index.module.scss';

const formatData = (
    data: ValidationStatusEvolution[],
    allTileSets: TileSet[],
    tileSetsUuids: string[],
    objectsFilter: ObjectsFilter,
) => {
    const chartData: any = allTileSets.reduce((prev, current) => {
        if (!tileSetsUuids.includes(current.uuid)) {
            return prev;
        }

        const newItem = {
            [current.uuid]: objectsFilter.detectionValidationStatuses.reduce(
                (prev, curr) => ({
                    ...prev,
                    [DETECTION_VALIDATION_STATUSES_NAMES_MAP[curr]]: 0,
                }),
                {
                    date: new Date(current.date),
                    name: current.name,
                },
            ),
        };

        return {
            ...prev,
            ...newItem,
        };
    }, {});

    data.forEach(({ detectionValidationStatus, detectionsCount, uuid }) => {
        if (!chartData[uuid]) {
            return;
        }

        chartData[uuid][DETECTION_VALIDATION_STATUSES_NAMES_MAP[detectionValidationStatus]] = detectionsCount;
    });

    return Object.values(chartData).sort((a, b) => a.date.getTime() - b.date.getTime());
};

const fetchData = async (
    signal: AbortSignal,
    objectsFilter: ObjectsFilter,
    allTileSets: TileSet[],
    tileSetsUuids: string[],
    communesUuids: string[],
    departmentsUuids: string[],
    regionsUuids: string[],
): any => {
    const params: any = {
        detectionValidationStatuses: objectsFilter.detectionValidationStatuses.join(','),
        tileSetsUuids: tileSetsUuids.join(','),
        detectionControlStatuses: objectsFilter.detectionControlStatuses.join(','),
        score: objectsFilter.score,
        objectTypesUuids: objectsFilter.objectTypesUuids.join(','),
        customZonesUuids: objectsFilter.customZonesUuids.join(','),
        communesUuids: communesUuids.join(','),
        departmentsUuids: departmentsUuids.join(','),
        regionsUuids: regionsUuids.join(','),
        interfaceDrawn: objectsFilter.interfaceDrawn,
    };

    if (objectsFilter.prescripted !== null) {
        params.prescripted = objectsFilter.prescripted;
    }

    const res = await api.get<ValidationStatusEvolution[]>(STATISTICS_VALIDATION_STATUS_EVOLUTION_ENDPOINT, {
        params,
        signal,
    });

    return formatData(res.data, allTileSets, tileSetsUuids, objectsFilter);
};
interface ComponentProps {
    allTileSets: TileSet[];
    objectsFilter: ObjectsFilter;
    tileSetsUuids: string[];
    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
}

const Component: React.FC<ComponentProps> = ({
    allTileSets,
    objectsFilter,
    tileSetsUuids,
    communesUuids,
    departmentsUuids,
    regionsUuids,
}: ComponentProps) => {
    const series = useMemo(() => {
        return objectsFilter.detectionValidationStatuses.map((status) => ({
            name: DETECTION_VALIDATION_STATUSES_NAMES_MAP[status],
            color: DETECTION_VALIDATION_STATUSES_COLORS_MAP[status],
        }));
    }, [objectsFilter.detectionValidationStatuses]);
    const { data: statistics, isFetching } = useQuery({
        queryKey: [
            STATISTICS_VALIDATION_STATUS_EVOLUTION_ENDPOINT,
            Object.values(objectsFilter),
            tileSetsUuids.join(','),
            communesUuids.join(','),
            departmentsUuids.join(','),
            regionsUuids.join(','),
        ],
        placeholderData: keepPreviousData,
        queryFn: ({ signal }) =>
            fetchData(signal, objectsFilter, allTileSets, tileSetsUuids, communesUuids, departmentsUuids, regionsUuids),
    });

    if (!statistics) {
        return <Loader />;
    }

    return (
        <div>
            <h2 className={classes.title}>Evolution du nombre de détections par statut de validation</h2>

            <div className={classes['chart-container']}>
                <LoadingOverlay visible={isFetching}>
                    <Loader />
                </LoadingOverlay>
                <AreaChart
                    withLegend
                    h={300}
                    data={statistics}
                    dataKey="name"
                    series={series}
                    withGradient
                    strokeWidth={2}
                    curveType="linear"
                    type="stacked"
                />
            </div>
        </div>
    );
};

export default Component;
import { statisticsEndpoints } from '@/api/endpoints';
import { objectsFilterToApiParams, valueFormatter } from '@/components/Statistics/utils';
import Loader from '@/components/ui/Loader';
import { ObjectsFilter } from '@/models/detection-filter';
import { ValidationStatusEvolution } from '@/models/statistics/valisation-status-evolution';
import api from '@/utils/api';
import { DETECTION_VALIDATION_STATUSES_COLORS_MAP, DETECTION_VALIDATION_STATUSES_NAMES_MAP } from '@/utils/constants';
import { AreaChart } from '@mantine/charts';
import { LoadingOverlay } from '@mantine/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import classes from './index.module.scss';

const formatData = (data: ValidationStatusEvolution[], tileSetsUuids: string[], objectsFilter: ObjectsFilter) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const chartData: any = data.reduce((prev, current) => {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Object.values(chartData).sort((a: any, b: any) => a.date.getTime() - b.date.getTime());
};

const fetchData = async (
    signal: AbortSignal,
    objectsFilter: ObjectsFilter,
    tileSetsUuids: string[],
    communesUuids: string[],
    departmentsUuids: string[],
    regionsUuids: string[],
    otherObjectTypesUuids: Set<string>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> => {
    const params = objectsFilterToApiParams(
        objectsFilter,
        tileSetsUuids,
        communesUuids,
        departmentsUuids,
        regionsUuids,
        otherObjectTypesUuids,
    );
    params.detectionValidationStatuses = objectsFilter.detectionValidationStatuses.join(',');

    if (objectsFilter.prescripted !== null) {
        params.prescripted = objectsFilter.prescripted;
    }

    const res = await api.get<ValidationStatusEvolution[]>(statisticsEndpoints.validationStatusEvolution, {
        params,
        signal,
    });

    return formatData(res.data, tileSetsUuids, objectsFilter);
};
interface ComponentProps {
    objectsFilter: ObjectsFilter;
    tileSetsUuids: string[];
    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
    otherObjectTypesUuids: Set<string>;
}

const Component: React.FC<ComponentProps> = ({
    objectsFilter,
    tileSetsUuids,
    communesUuids,
    departmentsUuids,
    regionsUuids,
    otherObjectTypesUuids,
}: ComponentProps) => {
    const series = useMemo(() => {
        return objectsFilter.detectionValidationStatuses.map((status) => ({
            name: DETECTION_VALIDATION_STATUSES_NAMES_MAP[status],
            color: DETECTION_VALIDATION_STATUSES_COLORS_MAP[status],
        }));
    }, [objectsFilter.detectionValidationStatuses]);
    const { data: statistics, isFetching } = useQuery({
        queryKey: [
            statisticsEndpoints.validationStatusEvolution,
            Object.values(objectsFilter),
            tileSetsUuids.join(','),
            communesUuids.join(','),
            departmentsUuids.join(','),
            regionsUuids.join(','),
        ],
        placeholderData: keepPreviousData,
        queryFn: ({ signal }) =>
            fetchData(
                signal,
                objectsFilter,
                tileSetsUuids,
                communesUuids,
                departmentsUuids,
                regionsUuids,
                otherObjectTypesUuids,
            ),
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
                    valueFormatter={valueFormatter}
                />
            </div>
        </div>
    );
};

export default Component;

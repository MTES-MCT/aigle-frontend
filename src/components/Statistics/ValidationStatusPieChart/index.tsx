import { STATISTICS_VALIDATION_STATUS_GLOBAL_ENDPOINT } from '@/api-endpoints';
import { objectsFilterToApiParams, valueFormatter } from '@/components/Statistics/utils';
import Loader from '@/components/ui/Loader';
import { detectionValidationStatuses } from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import { ValidationStatusGlobal } from '@/models/statistics/valisation-status-global';
import api from '@/utils/api';
import { DETECTION_VALIDATION_STATUSES_COLORS_MAP, DETECTION_VALIDATION_STATUSES_NAMES_MAP } from '@/utils/constants';
import { PieChart } from '@mantine/charts';
import { ColorSwatch, LoadingOverlay } from '@mantine/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import classes from './index.module.scss';

interface ChartData {
    name: string;
    value: number;
    color: string;
}

const formatData = (data: ValidationStatusGlobal[]): ChartData[] => {
    return data.map((row) => ({
        name: DETECTION_VALIDATION_STATUSES_NAMES_MAP[row.detectionValidationStatus],
        value: row.detectionsCount,
        color: DETECTION_VALIDATION_STATUSES_COLORS_MAP[row.detectionValidationStatus],
    }));
};

const fetchData = async (
    signal: AbortSignal,
    objectsFilter: ObjectsFilter,
    tileSetsUuids: string[],
    communesUuids: string[],
    departmentsUuids: string[],
    regionsUuids: string[],
    otherObjectTypesUuids: Set<string>,
): Promise<ChartData[]> => {
    const params = objectsFilterToApiParams(
        objectsFilter,
        tileSetsUuids,
        communesUuids,
        departmentsUuids,
        regionsUuids,
        otherObjectTypesUuids,
    );

    if (objectsFilter.prescripted !== null) {
        params.prescripted = objectsFilter.prescripted;
    }

    const res = await api.get<ValidationStatusGlobal[]>(STATISTICS_VALIDATION_STATUS_GLOBAL_ENDPOINT, {
        params,
        signal,
    });

    return formatData(res.data);
};

const Legend = () => {
    return (
        <div className={classes['legend-container']}>
            {detectionValidationStatuses.map((dvs) => (
                <div className={classes['legend-item']} key={dvs}>
                    <ColorSwatch color={DETECTION_VALIDATION_STATUSES_COLORS_MAP[dvs]} size={16} />
                    <p>{DETECTION_VALIDATION_STATUSES_NAMES_MAP[dvs]}</p>
                </div>
            ))}
        </div>
    );
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
    const { data: statistics, isFetching } = useQuery({
        queryKey: [
            STATISTICS_VALIDATION_STATUS_GLOBAL_ENDPOINT,
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
            <h2 className={classes.title}>Répartition du nombre de détections par statut de validation</h2>

            <div className={classes['chart-container']}>
                <LoadingOverlay visible={isFetching}>
                    <Loader />
                </LoadingOverlay>
                <PieChart
                    size={300}
                    h={300}
                    w="100%"
                    labelsPosition="outside"
                    labelsType="value"
                    withLabels
                    data={statistics}
                    valueFormatter={valueFormatter}
                />
                <Legend />
            </div>
        </div>
    );
};

export default Component;

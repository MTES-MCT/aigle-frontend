import { STATISTICS_VALIDATION_STATUS_OBJECT_TYPES_GLOBAL_ENDPOINT } from '@/api-endpoints';
import { objectsFilterToApiParams, valueFormatter } from '@/components/Statistics/utils';
import Loader from '@/components/ui/Loader';
import { DetectionValidationStatus, detectionValidationStatuses } from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import { ValidationStatusGlobal } from '@/models/statistics/valisation-status-global';
import { ValidationStatusObjectTypesGlobal } from '@/models/statistics/valisation-status-object-types-global';
import api from '@/utils/api';
import { DETECTION_VALIDATION_STATUSES_COLORS_MAP, DETECTION_VALIDATION_STATUSES_NAMES_MAP } from '@/utils/constants';
import { BarChart } from '@mantine/charts';
import { LoadingOverlay } from '@mantine/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import classes from './index.module.scss';

const formatData = (data: ValidationStatusObjectTypesGlobal[]): any[] => {
    const dataMap = data.reduce<{
        [objectTypeName: string]: {
            [status in DetectionValidationStatus]: number;
        };
    }>((prev, curr) => {
        if (!prev[curr.objectTypeName]) {
            prev[curr.objectTypeName] = {
                DETECTED_NOT_VERIFIED: 0,
                SUSPECT: 0,
                LEGITIMATE: 0,
                INVALIDATED: 0,
            };
        }
        prev[curr.objectTypeName][curr.detectionValidationStatus] = curr.detectionsCount;

        return prev;
    }, {});

    return Object.entries(dataMap).map(([objectTypeName, statusMap]) => ({
        objectTypeName,
        [DETECTION_VALIDATION_STATUSES_NAMES_MAP.DETECTED_NOT_VERIFIED]: statusMap.DETECTED_NOT_VERIFIED,
        [DETECTION_VALIDATION_STATUSES_NAMES_MAP.SUSPECT]: statusMap.SUSPECT,
        [DETECTION_VALIDATION_STATUSES_NAMES_MAP.LEGITIMATE]: statusMap.LEGITIMATE,
        [DETECTION_VALIDATION_STATUSES_NAMES_MAP.INVALIDATED]: statusMap.INVALIDATED,
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
): Promise<any[]> => {
    const params = objectsFilterToApiParams(
        objectsFilter,
        tileSetsUuids,
        communesUuids,
        departmentsUuids,
        regionsUuids,
        otherObjectTypesUuids,
        true
    );

    if (objectsFilter.prescripted !== null) {
        params.prescripted = objectsFilter.prescripted;
    }

    const res = await api.get<ValidationStatusGlobal[]>(STATISTICS_VALIDATION_STATUS_OBJECT_TYPES_GLOBAL_ENDPOINT, {
        params,
        signal,
    });

    return formatData(res.data);
};

const SERIES = detectionValidationStatuses.map((status) => ({
    name: DETECTION_VALIDATION_STATUSES_NAMES_MAP[status],
    color: DETECTION_VALIDATION_STATUSES_COLORS_MAP[status],
}));

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
            STATISTICS_VALIDATION_STATUS_OBJECT_TYPES_GLOBAL_ENDPOINT,
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
            <h2 className={classes.title}>Répartition du nombre de détections par type d&apos;objet</h2>

            <div className={classes['chart-container']}>
                <LoadingOverlay visible={isFetching}>
                    <Loader />
                </LoadingOverlay>
                <BarChart
                    h={600}
                    w="100%"
                    data={statistics}
                    dataKey="objectTypeName"
                    series={SERIES}
                    type="stacked"
                    orientation="vertical"
                    gridAxis="none"
                    valueFormatter={valueFormatter}
                />
            </div>
        </div>
    );
};

export default Component;

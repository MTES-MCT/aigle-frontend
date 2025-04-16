import React from 'react';

import { DETECTION_LIST_OVERVIEW_ENDPOINT } from '@/api-endpoints';
import Loader from '@/components/ui/Loader';
import { DetectionValidationStatus, detectionValidationStatuses } from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import api from '@/utils/api';
import { DETECTION_VALIDATION_STATUSES_COLORS_MAP, DETECTION_VALIDATION_STATUSES_NAMES_MAP } from '@/utils/constants';
import { useStatistics } from '@/utils/context/statistics-context';
import { LoadingOverlay } from '@mantine/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import classes from './index.module.scss';
import { formatBigInt } from '@/utils/format';

const populatePercentages = (
    items: DetectionListOverviewValidationStatusesItem[],
): DetectionListOverviewValidationStatusesItemWithPercentage[] => {
    const total = items.reduce((sum, item) => sum + item.count, 0);

    // Calculate percentages with one decimal place
    const percentages = items.map((item) => Math.floor((item.count / total) * 1000) / 10);

    // Find how much we need to add to reach 100%
    const currentSum = percentages.reduce((sum, p) => sum + p, 0);
    let remaining = Math.round((100 - currentSum) * 10) / 10;

    // Add 0.1% to values starting from the largest until we reach 100%
    const indices = items.map((_, i) => i).sort((a, b) => items[b].count - items[a].count);

    let i = 0;
    while (remaining > 0) {
        percentages[indices[i % items.length]] += 0.1;
        remaining -= 0.1;
        i++;
    }

    // Create new array with percentage property as string
    return items.map((item, index) => ({
        ...item,
        percentage: `${percentages[index].toFixed(1)}%`,
    }));
};

interface DetectionListOverviewValidationStatusesItem {
    count: number;
    detectionValidationStatus: DetectionValidationStatus;
}

interface DetectionListOverviewValidationStatusesItemWithPercentage
    extends DetectionListOverviewValidationStatusesItem {
    percentage: string;
}

interface DetectionListOverview {
    totalCount: number;
    validationStatusesCount: DetectionListOverviewValidationStatusesItem[];
}

interface DetectionListOverviewWithPercentage extends DetectionListOverview {
    validationStatusesCount: DetectionListOverviewValidationStatusesItemWithPercentage[];
}

const fetchData = async (
    signal: AbortSignal,
    objectsFilter: ObjectsFilter,
    communesUuids: string[],
    departmentsUuids: string[],
    regionsUuids: string[],
): Promise<DetectionListOverviewWithPercentage> => {
    const res = await api.get<DetectionListOverview>(DETECTION_LIST_OVERVIEW_ENDPOINT, {
        signal,
        params: {
            ...objectsFilter,
            communesUuids: communesUuids.join(','),
            departmentsUuids: departmentsUuids.join(','),
            regionsUuids: regionsUuids.join(','),
        },
    });

    return {
        ...res.data,
        validationStatusesCount: populatePercentages(
            [...res.data.validationStatusesCount].sort((a, b) => {
                const indexA = detectionValidationStatuses.indexOf(a.detectionValidationStatus);
                const indexB = detectionValidationStatuses.indexOf(b.detectionValidationStatus);
                return indexA - indexB;
            }),
        ),
    };
};

interface DetectionListOverviewItemProps extends DetectionListOverviewValidationStatusesItemWithPercentage {
    totalCount: number;
}

const DetectionListOverviewItem: React.FC<DetectionListOverviewItemProps> = ({
    count,
    percentage,
    detectionValidationStatus,
}: DetectionListOverviewItemProps) => {
    return (
        <div
            className={classes['detection-list-overview-item']}
            style={{
                backgroundColor: `${DETECTION_VALIDATION_STATUSES_COLORS_MAP[detectionValidationStatus]}33`,
            }}
        >
            <div className={classes['detection-list-overview-item-count']}>{percentage}</div>
            <div className={classes['detection-list-overview-item-label']}>
                {DETECTION_VALIDATION_STATUSES_NAMES_MAP[detectionValidationStatus]} ({formatBigInt(count)})
            </div>
        </div>
    );
};

interface ComponentInnerProps {
    objectsFilter: ObjectsFilter;
    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
}
const ComponentInner: React.FC<ComponentInnerProps> = ({
    objectsFilter,
    communesUuids,
    departmentsUuids,
    regionsUuids,
}: ComponentInnerProps) => {
    const { data, isFetching } = useQuery({
        queryKey: [
            DETECTION_LIST_OVERVIEW_ENDPOINT,
            Object.values(objectsFilter),
            communesUuids.join(','),
            departmentsUuids.join(','),
            regionsUuids.join(','),
        ],
        placeholderData: keepPreviousData,
        queryFn: ({ signal }) => fetchData(signal, objectsFilter, communesUuids, departmentsUuids, regionsUuids),
    });

    if (!data) {
        return <Loader />;
    }

    return (
        <div className={classes['container']}>
            <LoadingOverlay visible={isFetching}>
                <Loader />
            </LoadingOverlay>
            <div className={classes['detection-list-overview-items-container']}>
                {data.validationStatusesCount.map((validationStatusCount) => (
                    <DetectionListOverviewItem
                        key={validationStatusCount.detectionValidationStatus}
                        totalCount={data.totalCount}
                        {...validationStatusCount}
                    />
                ))}
            </div>
            <div className={classes['detection-list-overview-total']}>
                <span className={classes['detection-list-overview-total-number']}>{formatBigInt(data.totalCount)}</span>
                {data.totalCount > 1 ? 'detection(s)' : 'detection'}
            </div>
        </div>
    );
};

interface ComponentProps {
    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
}

const Component: React.FC<ComponentProps> = ({ communesUuids, departmentsUuids, regionsUuids }) => {
    const { objectsFilter } = useStatistics();

    if (!objectsFilter) {
        return <Loader />;
    }

    return (
        <ComponentInner
            objectsFilter={objectsFilter}
            communesUuids={communesUuids}
            departmentsUuids={departmentsUuids}
            regionsUuids={regionsUuids}
        />
    );
};

export default Component;

import React from 'react';

import { parcelEndpoints } from '@/api/endpoints';
import Loader from '@/components/ui/Loader';
import { ObjectsFilter } from '@/models/detection-filter';
import { ParcelOverview } from '@/models/parcel';
import { useStatistics } from '@/store/slices/statistics';
import api from '@/utils/api';
import { formatBigInt } from '@/utils/format';
import { LoadingOverlay } from '@mantine/core';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import classes from './index.module.scss';

const calculatePercentage = (count: number, total: number): string => {
    if (total === 0) return '0.0%';
    return `${((count / total) * 100).toFixed(1)}%`;
};

interface ParcelOverviewItem {
    count: number;
    percentage: string;
    label: string;
    color: string;
}

interface ParcelOverviewWithPercentage extends ParcelOverview {
    items: ParcelOverviewItem[];
}

const fetchData = async (
    signal: AbortSignal,
    objectsFilter: ObjectsFilter,
    communesUuids: string[],
    departmentsUuids: string[],
    regionsUuids: string[],
): Promise<ParcelOverviewWithPercentage> => {
    const res = await api.get<ParcelOverview>(parcelEndpoints.overview, {
        signal,
        params: {
            ...objectsFilter,
            communesUuids: communesUuids.join(','),
            departmentsUuids: departmentsUuids.join(','),
            regionsUuids: regionsUuids.join(','),
        },
    });

    const items: ParcelOverviewItem[] = [
        {
            count: res.data.verified,
            percentage: calculatePercentage(res.data.verified, res.data.total),
            label: 'Vérifiées',
            color: '#28a745', // Green for verified
        },
        {
            count: res.data.notVerified,
            percentage: calculatePercentage(res.data.notVerified, res.data.total),
            label: 'Non-vérifiées',
            color: '#dc3545', // Red for not verified
        },
    ];

    return {
        ...res.data,
        items,
    };
};

const DetectionListOverviewItem: React.FC<ParcelOverviewItem> = ({
    count,
    percentage,
    label,
    color,
}: ParcelOverviewItem) => {
    return (
        <div
            className={classes['detection-list-overview-item']}
            style={{
                backgroundColor: `${color}33`,
            }}
        >
            <div className={classes['detection-list-overview-item-count']}>{percentage}</div>
            <div className={classes['detection-list-overview-item-label']}>
                {label} ({formatBigInt(count)})
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
    const queryEnabled = communesUuids.length > 0;
    const { data, isFetching } = useQuery({
        queryKey: [
            parcelEndpoints.overview,
            Object.values(objectsFilter),
            communesUuids.join(','),
            departmentsUuids.join(','),
            regionsUuids.join(','),
        ],
        placeholderData: keepPreviousData,
        queryFn: ({ signal }) => fetchData(signal, objectsFilter, communesUuids, departmentsUuids, regionsUuids),
        enabled: queryEnabled,
    });

    if (!queryEnabled) {
        return null;
    }

    if (!data) {
        return <Loader />;
    }

    return (
        <div className={classes['container']}>
            <LoadingOverlay visible={isFetching}>
                <Loader />
            </LoadingOverlay>
            <div className={classes['detection-list-overview-items-container']}>
                {data.items.map((item) => (
                    <DetectionListOverviewItem key={item.label} {...item} />
                ))}
            </div>
            <div className={classes['detection-list-overview-total']}>
                <span className={classes['detection-list-overview-total-number']}>{formatBigInt(data.total)}</span>
                {data.total > 1 ? 'parcelle(s)' : 'parcelle'}
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

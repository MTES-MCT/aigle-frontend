import React from 'react';

import { parcelEndpoints } from '@/api/endpoints';
import { objectsFilterToApiParams } from '@/components/Map/utils/api';
import InfoBubble from '@/components/ui/InfoBubble';
import Loader from '@/components/ui/Loader';
import { ObjectsFilter } from '@/models/detection-filter';
import { ParcelOverview } from '@/models/parcel';
import { useStatistics } from '@/store/slices/statistics';
import api from '@/utils/api';
import { GREEN, RED } from '@/utils/colors';
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
    tooltip: string;
}

interface ParcelOverviewWithPercentage {
    items: ParcelOverviewItem[];
    total: number;
}

const fetchData = async (
    signal: AbortSignal,
    objectsFilter: ObjectsFilter,
    communesUuids: string[],
    departmentsUuids: string[],
    regionsUuids: string[],
    otherObjectTypesUuids: Set<string>,
): Promise<ParcelOverviewWithPercentage> => {
    const res = await api.get<ParcelOverview>(parcelEndpoints.overview, {
        signal,
        params: {
            ...objectsFilterToApiParams(objectsFilter, otherObjectTypesUuids),
            communesUuids: communesUuids.join(','),
            departmentsUuids: departmentsUuids.join(','),
            regionsUuids: regionsUuids.join(','),
        },
    });

    // if there is not `notVerified` field, it means we are dealing with control statuses instead of detection statuses
    if (!res.data.notVerified) {
        return {
            items: [
                {
                    count: res.data.controlled,
                    percentage: calculatePercentage(res.data.controlled, res.data.total),
                    label: 'Contrôlées',
                    color: GREEN,
                    tooltip:
                        'Statut de contrôle modifié par un agent (contrôlé terrain, courrier préalable envoyé, PV dressé, astreinte administrative, rapport de constatations rédigé, remis en état).',
                },
                {
                    count: res.data.notControlled,
                    percentage: calculatePercentage(res.data.notControlled, res.data.total),
                    label: 'Non-contrôlées',
                    color: RED,
                    tooltip: 'Statut de contrôle encore "Non contrôlé", sans action d\'un agent.',
                },
            ],
            total: res.data.total,
        };
    }

    return {
        items: [
            {
                count: res.data.verified,
                percentage: calculatePercentage(res.data.verified, res.data.total),
                label: 'Vérifiées',
                color: GREEN,
                tooltip: 'Statut de validation modifié par un agent (suspect, légal ou invalidé).',
            },
            {
                count: res.data.notVerified,
                percentage: calculatePercentage(res.data.notVerified, res.data.total),
                label: 'Non-vérifiées',
                color: RED,
                tooltip: 'Statut de validation encore "Non vérifié", sans action d\'un agent.',
            },
        ],
        total: res.data.total,
    };
};

const DetectionListOverviewItem: React.FC<ParcelOverviewItem> = ({
    count,
    percentage,
    label,
    color,
    tooltip,
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
                {label} ({formatBigInt(count)}) <InfoBubble>{tooltip}</InfoBubble>
            </div>
        </div>
    );
};

interface ComponentInnerProps {
    objectsFilter: ObjectsFilter;
    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
    otherObjectTypesUuids: Set<string>;
}
const ComponentInner: React.FC<ComponentInnerProps> = ({
    objectsFilter,
    communesUuids,
    departmentsUuids,
    regionsUuids,
    otherObjectTypesUuids,
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
        queryFn: ({ signal }) =>
            fetchData(signal, objectsFilter, communesUuids, departmentsUuids, regionsUuids, otherObjectTypesUuids),
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
    const { objectsFilter, otherObjectTypesUuids } = useStatistics();

    if (!objectsFilter || !otherObjectTypesUuids) {
        return <Loader />;
    }

    return (
        <ComponentInner
            objectsFilter={objectsFilter}
            communesUuids={communesUuids}
            departmentsUuids={departmentsUuids}
            regionsUuids={regionsUuids}
            otherObjectTypesUuids={otherObjectTypesUuids}
        />
    );
};

export default Component;

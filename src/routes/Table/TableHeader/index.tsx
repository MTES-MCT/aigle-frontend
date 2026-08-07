import React from 'react';

import { parcelEndpoints } from '@/api/endpoints';
import { objectsFilterToApiParams } from '@/components/Map/utils/api';
import InfoBubble from '@/components/ui/InfoBubble';
import Loader from '@/components/ui/Loader';
import { ObjectsFilter } from '@/models/detection-filter';
import { ParcelOverview } from '@/models/parcel';
import { FormValues } from '@/routes/Table/utils';
import { useObjectsFilter } from '@/store/slices/objects-filter';
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

// Collectivities travel as one object, never as positional lists: a misplaced
// argument would silently report another perimeter's figures.
const fetchData = async (
    signal: AbortSignal,
    objectsFilter: ObjectsFilter,
    collectivities: FormValues,
    otherObjectTypesUuids: Set<string>,
): Promise<ParcelOverviewWithPercentage> => {
    const data = await api<ParcelOverview>(parcelEndpoints.overview, {
        signal,
        params: {
            ...objectsFilterToApiParams(objectsFilter, otherObjectTypesUuids),
            communesUuids: collectivities.communesUuids.join(','),
            epcisUuids: collectivities.epcisUuids.join(','),
            departmentsUuids: collectivities.departmentsUuids.join(','),
            regionsUuids: collectivities.regionsUuids.join(','),
        },
    });

    // if there is not `notVerified` field, it means we are dealing with control statuses instead of detection statuses
    if (!data.notVerified) {
        return {
            items: [
                {
                    count: data.controlled,
                    percentage: calculatePercentage(data.controlled, data.total),
                    label: 'Contrôlées',
                    color: GREEN,
                    tooltip:
                        'Statut de contrôle modifié par un agent (contrôlé terrain, courrier préalable envoyé, PV dressé, astreinte administrative, rapport de constatations rédigé, remis en état).',
                },
                {
                    count: data.notControlled,
                    percentage: calculatePercentage(data.notControlled, data.total),
                    label: 'Non-contrôlées',
                    color: RED,
                    tooltip: 'Statut de contrôle encore "Non contrôlé", sans action d\'un agent.',
                },
            ],
            total: data.total,
        };
    }

    return {
        items: [
            {
                count: data.verified,
                percentage: calculatePercentage(data.verified, data.total),
                label: 'Vérifiées',
                color: GREEN,
                tooltip: 'Statut de validation modifié par un agent (suspect, légal ou invalidé).',
            },
            {
                count: data.notVerified,
                percentage: calculatePercentage(data.notVerified, data.total),
                label: 'Non-vérifiées',
                color: RED,
                tooltip: 'Statut de validation encore "Non vérifié", sans action d\'un agent.',
            },
        ],
        total: data.total,
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

interface ComponentInnerProps extends FormValues {
    objectsFilter: ObjectsFilter;
    otherObjectTypesUuids: Set<string>;
}
const ComponentInner: React.FC<ComponentInnerProps> = ({
    objectsFilter,
    otherObjectTypesUuids,
    ...collectivities
}: ComponentInnerProps) => {
    const queryEnabled = collectivities.communesUuids.length > 0 || collectivities.epcisUuids.length > 0;
    const { data, isFetching } = useQuery({
        queryKey: [
            parcelEndpoints.overview,
            Object.values(objectsFilter),
            collectivities.communesUuids.join(','),
            collectivities.epcisUuids.join(','),
            collectivities.departmentsUuids.join(','),
            collectivities.regionsUuids.join(','),
        ],
        placeholderData: keepPreviousData,
        queryFn: ({ signal }) => fetchData(signal, objectsFilter, collectivities, otherObjectTypesUuids),
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

type ComponentProps = FormValues;

const Component: React.FC<ComponentProps> = (collectivities: ComponentProps) => {
    const { otherObjectTypesUuids } = useStatistics();
    const { objectsFilter } = useObjectsFilter();

    if (!objectsFilter || !otherObjectTypesUuids) {
        return <Loader />;
    }

    return (
        <ComponentInner
            objectsFilter={objectsFilter}
            {...collectivities}
            otherObjectTypesUuids={otherObjectTypesUuids}
        />
    );
};

export default Component;

import { STATISTICS_VALIDATION_STATUS_ENDPOINT } from '@/api-endpoints';
import GeoCollectivitiesMultiSelects from '@/components/admin/form-fields/GeoCollectivitiesMultiSelects';
import Loader from '@/components/ui/Loader';
import { ObjectsFilter } from '@/models/detection-filter';
import { ValidationStatusEvolution } from '@/models/statistics/valisation-status-evolution';
import { TileSet } from '@/models/tile-set';
import api from '@/utils/api';
import { DETECTION_VALIDATION_STATUSES_COLORS_MAP, DETECTION_VALIDATION_STATUSES_NAMES_MAP } from '@/utils/constants';
import { useStatistics } from '@/utils/context/statistics-context';
import { LineChart } from '@mantine/charts';
import { LoadingOverlay, MultiSelect } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import classes from './index.module.scss';

interface FormValues {
    tileSetsUuids: string[];

    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
}

const fetchData = async (
    signal: AbortSignal,
    objectsFilter: ObjectsFilter,
    tileSets: TileSet[],
    formValues: FormValues,
): any => {
    const params: any = {
        detectionValidationStatuses: objectsFilter.detectionValidationStatuses.join(','),
        tileSetsUuids: formValues.tileSetsUuids.join(','),
        detectionControlStatuses: objectsFilter.detectionControlStatuses.join(','),
        score: objectsFilter.score,
        objectTypesUuids: objectsFilter.objectTypesUuids.join(','),
        customZonesUuids: objectsFilter.customZonesUuids.join(','),
        communesUuids: formValues.communesUuids.join(','),
        departmentsUuids: formValues.departmentsUuids.join(','),
        regionsUuids: formValues.regionsUuids.join(','),
        interfaceDrawn: objectsFilter.interfaceDrawn,
    };

    if (objectsFilter.prescripted !== null) {
        params.prescripted = objectsFilter.prescripted;
    }

    const res = await api.get<ValidationStatusEvolution[]>(STATISTICS_VALIDATION_STATUS_ENDPOINT, {
        params,
        signal,
    });

    const chartData: any = tileSets.reduce((prev, current) => {
        if (!formValues.tileSetsUuids.includes(current.uuid)) {
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

    res.data.forEach(({ detectionValidationStatus, detectionsCount, uuid }) => {
        if (!chartData[uuid]) {
            return;
        }

        chartData[uuid][DETECTION_VALIDATION_STATUSES_NAMES_MAP[detectionValidationStatus]] = detectionsCount;
    });

    return Object.values(chartData).sort((a, b) => a.date.getTime() - b.date.getTime());
};
interface ComponentInnerProps {
    tileSets: TileSet[];
    objectsFilter: ObjectsFilter;
}

const ComponentInner: React.FC<ComponentInnerProps> = ({ tileSets, objectsFilter }: ComponentInnerProps) => {
    const tileSetsValues = useMemo(() => tileSets.map(({ name, uuid }) => ({ value: uuid, label: name })), [tileSets]);
    const series = useMemo(() => {
        return objectsFilter.detectionValidationStatuses.map((status) => ({
            name: DETECTION_VALIDATION_STATUSES_NAMES_MAP[status],
            color: DETECTION_VALIDATION_STATUSES_COLORS_MAP[status],
        }));
    }, [objectsFilter.detectionValidationStatuses]);

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            tileSetsUuids: tileSets.filter(({ tileSetType }) => tileSetType === 'BACKGROUND').map(({ uuid }) => uuid),
            communesUuids: [] as string[],
            departmentsUuids: [] as string[],
            regionsUuids: [] as string[],
        },
    });

    const { data: statistics, isFetching } = useQuery({
        queryKey: [
            STATISTICS_VALIDATION_STATUS_ENDPOINT,
            Object.values(objectsFilter),
            form.values.tileSetsUuids.join(','),
            form.values.communesUuids.join(','),
            form.values.departmentsUuids.join(','),
            form.values.regionsUuids.join(','),
        ],
        placeholderData: keepPreviousData,
        queryFn: ({ signal }) => fetchData(signal, objectsFilter, tileSets, form.values),
    });

    if (!statistics) {
        return <Loader />;
    }

    return (
        <div>
            <h2 className={classes.title}>Evolution du nombre de détections par statut de validation</h2>

            <MultiSelect
                label="Fonds de carte"
                data={tileSetsValues}
                key={form.key('tileSetsUuids')}
                {...form.getInputProps('tileSetsUuids')}
            />

            <GeoCollectivitiesMultiSelects form={form} className={classes['geocolectivities-container']} />

            <div className={classes['chart-container']}>
                <LoadingOverlay visible={isFetching}>
                    <Loader />
                </LoadingOverlay>
                <LineChart
                    lineProps={{
                        isAnimationActive: true,
                    }}
                    withLegend
                    h={300}
                    data={statistics}
                    dataKey="name"
                    series={series}
                    curveType="linear"
                />
            </div>
        </div>
    );
};

const Component: React.FC = () => {
    const { layers, objectsFilter } = useStatistics();
    const tileSets = useMemo(() => (layers || []).map((layer) => layer.tileSet), [layers]);

    return (
        <>
            {objectsFilter && tileSets && tileSets.length ? (
                <ComponentInner objectsFilter={objectsFilter} tileSets={tileSets} />
            ) : (
                <Loader />
            )}
        </>
    );
};

export default Component;

import ValidationStatusEvolutionChart from '@/components/Statistics/ValidationStatusEvolutionChart';
import ValidationStatusObjectTypesLineChart from '@/components/Statistics/ValidationStatusObjectTypesLineChart';
import ValidationStatusPieChart from '@/components/Statistics/ValidationStatusPieChart';
import GeoCollectivitiesMultiSelects from '@/components/admin/FormFields/GeoCollectivitiesMultiSelects';
import Loader from '@/components/ui/Loader';
import { ObjectsFilter } from '@/models/detection-filter';
import { MapGeoCustomZoneLayer, MapTileSetLayer } from '@/models/map-layer';
import { ObjectType } from '@/models/object-type';
import { useStatistics } from '@/utils/context/statistics-context';
import { MultiSelect } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { useMemo } from 'react';
import FilterObjects from '../FilterObjects';
import SoloAccordion from '../admin/SoloAccordion';

interface FormValues {
    tileSetsUuids: string[];

    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
}

interface ComponentInnerProps {
    layers: MapTileSetLayer[];
    objectsFilter: ObjectsFilter;
    otherObjectTypesUuids: Set<string>;
    allObjectTypes: ObjectType[];
    customZoneLayers: MapGeoCustomZoneLayer[];
}

const ComponentInner: React.FC<ComponentInnerProps> = ({
    layers,
    objectsFilter,
    otherObjectTypesUuids,
    allObjectTypes,
    customZoneLayers,
}: ComponentInnerProps) => {
    const { updateObjectsFilter } = useStatistics();
    const tileSets = useMemo(() => (layers || []).map((layer) => layer.tileSet), [layers]);

    const tileSetsValues = useMemo(() => tileSets.map(({ name, uuid }) => ({ value: uuid, label: name })), [tileSets]);

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            tileSetsUuids: tileSets.filter(({ tileSetType }) => tileSetType === 'BACKGROUND').map(({ uuid }) => uuid),
            communesUuids: [] as string[],
            departmentsUuids: [] as string[],
            regionsUuids: [] as string[],
        },
    });

    if (
        !objectsFilter ||
        !tileSets ||
        !tileSets.length ||
        !otherObjectTypesUuids ||
        !allObjectTypes ||
        !customZoneLayers
    ) {
    }

    return (
        <>
            <SoloAccordion opened>
                <GeoCollectivitiesMultiSelects form={form} />
                <MultiSelect
                    label="Fonds de carte"
                    data={tileSetsValues}
                    key={form.key('tileSetsUuids')}
                    {...form.getInputProps('tileSetsUuids')}
                />

                <FilterObjects
                    objectTypes={allObjectTypes}
                    objectsFilter={objectsFilter}
                    mapGeoCustomZoneLayers={customZoneLayers}
                    updateObjectsFilter={updateObjectsFilter}
                    otherObjectTypesUuids={otherObjectTypesUuids}
                />
            </SoloAccordion>

            <ValidationStatusEvolutionChart
                objectsFilter={objectsFilter}
                tileSetsUuids={form.values.tileSetsUuids}
                communesUuids={form.values.communesUuids}
                departmentsUuids={form.values.departmentsUuids}
                regionsUuids={form.values.regionsUuids}
                otherObjectTypesUuids={otherObjectTypesUuids}
            />

            <ValidationStatusPieChart
                objectsFilter={objectsFilter}
                tileSetsUuids={form.values.tileSetsUuids}
                communesUuids={form.values.communesUuids}
                departmentsUuids={form.values.departmentsUuids}
                regionsUuids={form.values.regionsUuids}
                otherObjectTypesUuids={otherObjectTypesUuids}
            />

            <ValidationStatusObjectTypesLineChart
                objectsFilter={objectsFilter}
                tileSetsUuids={form.values.tileSetsUuids}
                communesUuids={form.values.communesUuids}
                departmentsUuids={form.values.departmentsUuids}
                regionsUuids={form.values.regionsUuids}
                otherObjectTypesUuids={otherObjectTypesUuids}
            />
        </>
    );
};

const Component: React.FC = () => {
    const { layers, objectsFilter, otherObjectTypesUuids, allObjectTypes, customZoneLayers } = useStatistics();

    if (!layers || !objectsFilter || !otherObjectTypesUuids || !allObjectTypes || !customZoneLayers) {
        return <Loader />;
    }

    return (
        <ComponentInner
            layers={layers}
            objectsFilter={objectsFilter}
            otherObjectTypesUuids={otherObjectTypesUuids}
            allObjectTypes={allObjectTypes}
            customZoneLayers={customZoneLayers}
        />
    );
};

export default Component;

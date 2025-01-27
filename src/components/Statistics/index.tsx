import ValidationStatusEvolutionChart from '@/components/Statistics/ValidationStatusEvolutionChart';
import ValidationStatusPieChart from '@/components/Statistics/ValidationStatusPieChart';
import GeoCollectivitiesMultiSelects from '@/components/admin/form-fields/GeoCollectivitiesMultiSelects';
import { useStatistics } from '@/utils/context/statistics-context';
import { Loader, MultiSelect } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { useMemo } from 'react';
import classes from './index.module.scss';
import ValidationStatusObjectTypesLineChart from '@/components/Statistics/ValidationStatusObjectTypesLineChart';

interface FormValues {
    tileSetsUuids: string[];

    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
}

const Component: React.FC = () => {
    const { layers, objectsFilter } = useStatistics();
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

    return (
        <>
            {objectsFilter && tileSets && tileSets.length ? (
                <>
                    <MultiSelect
                        label="Fonds de carte"
                        data={tileSetsValues}
                        key={form.key('tileSetsUuids')}
                        {...form.getInputProps('tileSetsUuids')}
                    />

                    <GeoCollectivitiesMultiSelects form={form} className={classes['geocolectivities-container']} />
                    <ValidationStatusEvolutionChart
                        objectsFilter={objectsFilter}
                        allTileSets={tileSets}
                        tileSetsUuids={form.values.tileSetsUuids}
                        communesUuids={form.values.communesUuids}
                        departmentsUuids={form.values.departmentsUuids}
                        regionsUuids={form.values.regionsUuids}
                    />

                    <ValidationStatusPieChart
                        objectsFilter={objectsFilter}
                        tileSetsUuids={form.values.tileSetsUuids}
                        communesUuids={form.values.communesUuids}
                        departmentsUuids={form.values.departmentsUuids}
                        regionsUuids={form.values.regionsUuids}
                    />

                    <ValidationStatusObjectTypesLineChart
                        objectsFilter={objectsFilter}
                        tileSetsUuids={form.values.tileSetsUuids}
                        communesUuids={form.values.communesUuids}
                        departmentsUuids={form.values.departmentsUuids}
                        regionsUuids={form.values.regionsUuids}
                        />
                </>
            ) : (
                <Loader />
            )}
        </>
    );
};

export default Component;

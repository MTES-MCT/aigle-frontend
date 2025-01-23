import ValidationStatusEvolutionChart from '@/components/Statistics/ValidationStatusEvolutionChart';
import { useStatistics } from '@/utils/context/statistics-context';
import { Loader } from '@mantine/core';
import { useMemo } from 'react';

const Component: React.FC = () => {
    const { layers, objectsFilter } = useStatistics();
    const tileSets = useMemo(() => (layers || []).map((layer) => layer.tileSet), [layers]);

    return (
        <>
            {objectsFilter && tileSets && tileSets.length ? (
                <ValidationStatusEvolutionChart objectsFilter={objectsFilter} tileSets={tileSets} />
            ) : (
                <Loader />
            )}
        </>
    );
};

export default Component;

import FilterObjects from '@/components/FilterObjects';
import LayoutBase from '@/components/LayoutBase';
import Statistics from '@/components/Statistics';
import SoloAccordion from '@/components/admin/SoloAccordion';
import { useStatistics } from '@/utils/context/statistics-context';
import React from 'react';
import classes from './index.module.scss';

const Component: React.FC = () => {
    const { allObjectTypes, objectsFilter, geoCustomZones, updateObjectsFilter } = useStatistics();

    if (!allObjectTypes || !objectsFilter || !geoCustomZones) {
        return null;
    }

    return (
        <LayoutBase>
            <SoloAccordion opened>
                <FilterObjects
                    objectTypes={allObjectTypes}
                    objectsFilter={objectsFilter}
                    geoCustomZones={geoCustomZones}
                    updateObjectsFilter={updateObjectsFilter}
                />
            </SoloAccordion>
            <div className={classes['charts-container']}>
                <Statistics />
            </div>
        </LayoutBase>
    );
};

export default Component;

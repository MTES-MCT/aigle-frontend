import React from 'react';

import FilterObjects from '@/components/FilterObjects';
import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { useMap } from '@/utils/context/map-context';
import { IconFilter } from '@tabler/icons-react';
import classes from './index.module.scss';

const CONTROL_LABEL = 'Filtrer les objets';

interface ComponentProps {
    isShowed: boolean;
    setIsShowed: (state: boolean) => void;
}

const Component: React.FC<ComponentProps> = ({ isShowed, setIsShowed }) => {
    const { objectTypes, customZoneLayers, objectsFilter, updateObjectsFilter } = useMap();

    if (!objectTypes || !objectsFilter || !customZoneLayers) {
        return null;
    }

    return (
        <MapControlCustom
            label={CONTROL_LABEL}
            controlInner={<IconFilter color="#777777" />}
            contentClassName={classes.content}
            containerClassName={classes.container}
            isShowed={isShowed}
            setIsShowed={setIsShowed}
        >
            <FilterObjects
                objectTypes={objectTypes}
                objectsFilter={objectsFilter}
                geoCustomZones={customZoneLayers.map(({ geoCustomZone }) => geoCustomZone)}
                updateObjectsFilter={updateObjectsFilter}
            />
        </MapControlCustom>
    );
};

export default Component;

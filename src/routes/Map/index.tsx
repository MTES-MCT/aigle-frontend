import React from 'react';

import Header from '@/components/Header';
import MapComponent from '@/components/Map';
import Loader from '@/components/ui/Loader';
import { useMap } from '@/store/slices/map';
import { useGroupChange } from '@/utils/group-change';
import { getPageTitle } from '@/utils/html';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import classes from './index.module.scss';

const Component: React.FC = () => {
    const { layers, userLastPosition, initialDetectionObjectUuid } = useMap();
    const onGroupChange = useGroupChange();

    return (
        <>
            <title>{getPageTitle('Carte')}</title>
            <Header onGroupChange={onGroupChange} />
            <div className={classes['map-container']}>
                {layers ? (
                    <MapComponent
                        layers={layers}
                        initialPosition={userLastPosition}
                        initialDetectionObjectUuid={initialDetectionObjectUuid}
                        syncViewStateToUrl
                    />
                ) : (
                    <Loader className={classes.loader} />
                )}
            </div>
        </>
    );
};

export default Component;

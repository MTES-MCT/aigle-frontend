import React from 'react';

import Header from '@/components/Header';
import MapComponent from '@/components/Map';
import Loader from '@/components/ui/Loader';
import { useMap } from '@/utils/context/map-context';
import { getPageTitle } from '@/utils/html';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import classes from './index.module.scss';

const Component: React.FC = () => {
    const { layers, userLastPosition, initialDetectionObjectUuid } = useMap();

    return (
        <>
            <title>{getPageTitle('Carte')}</title>
            <Header />
            <div className={classes['map-container']}>
                {layers ? (
                    <MapComponent
                        layers={layers}
                        initialPosition={userLastPosition}
                        initialDetectionObjectUuid={initialDetectionObjectUuid}
                    />
                ) : (
                    <Loader className={classes.loader} />
                )}
            </div>
        </>
    );
};

export default Component;

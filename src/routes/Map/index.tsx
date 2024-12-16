import React from 'react';

import Header from '@/components/Header';
import MapComponent from '@/components/Map';
import Loader from '@/components/ui/Loader';
import { useMap } from '@/utils/context/map-context';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import classes from './index.module.scss';

const Component: React.FC = () => {
    const { layers, userLastPosition } = useMap();

    return (
        <>
            <Header />
            <div className={classes['map-container']}>
                {layers ? (
                    <MapComponent layers={layers} initialPosition={userLastPosition} />
                ) : (
                    <Loader className={classes.loader} />
                )}
            </div>
        </>
    );
};

export default Component;

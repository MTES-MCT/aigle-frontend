import React, { useEffect, useState } from 'react';

import Header from '@/components/Header';
import MapComponent from '@/components/Map';
import Loader from '@/components/ui/Loader';
import { useAuth } from '@/store/slices/auth';
import { useMap } from '@/store/slices/map';
import { getPageTitle } from '@/utils/html';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css';
import classes from './index.module.scss';

// Module state: the route remounts on every visit to /map, the check is once per page load.
let emptyMapChecked = false;

const Component: React.FC = () => {
    const { layers, userLastPosition, initialDetectionObjectUuid, clearInitialDetectionObjectUuid } = useMap();
    // Read once: the store keeps it for the whole page load, and every later mount would reopen that object.
    const [detectionObjectUuidToOpen] = useState(initialDetectionObjectUuid);

    useEffect(() => {
        if (initialDetectionObjectUuid) {
            clearInitialDetectionObjectUuid();
        }
    }, [initialDetectionObjectUuid]);

    // An account whose map can never show a detection or any imagery: no group, no zone à enjeux or no imagery.
    useEffect(() => {
        const { userMe } = useAuth.getState();
        const { settings, backgroundLayerYears } = useMap.getState();

        // A SUPER_ADMIN reloads the page on each scope switch, so it would be counted once per group.
        if (emptyMapChecked || !layers || !settings || !userMe || userMe.userRole === 'SUPER_ADMIN') {
            return;
        }
        emptyMapChecked = true;

        let name: string | undefined;
        if (!userMe.userUserGroups.length) {
            name = 'Aucun groupe';
        } else if (!settings.geoCustomZonesUncategorized.length && !settings.geoCustomZoneCategories.length) {
            name = 'Aucune zone à enjeux';
        } else if (!backgroundLayerYears?.length) {
            name = 'Aucun fond de carte';
        }

        if (name) {
            trackEvent(TRACKING_CATEGORIES.map, 'Carte vide affichée', name);
        }
    }, [layers]);

    return (
        <>
            <title>{getPageTitle('Carte')}</title>
            <Header />
            <div className={classes['map-container']}>
                {layers ? (
                    <MapComponent
                        layers={layers}
                        initialPosition={userLastPosition}
                        initialDetectionObjectUuid={detectionObjectUuidToOpen}
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

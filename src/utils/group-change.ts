import { mapEndpoints } from '@/api/endpoints';
import { MapSettings } from '@/models/map-settings';
import { useMap } from '@/store/slices/map';
import { useStatistics } from '@/store/slices/statistics';
import api from '@/utils/api';
import { bbox } from '@turf/turf';
import { useCallback } from 'react';

export const useGroupChange = () => {
    const { setMapSettings, eventEmitter } = useMap();
    const { setMapSettings: setStatisticsMapSettings } = useStatistics();

    return useCallback(async () => {
        try {
            const mapSettings = await api<MapSettings>(mapEndpoints.settings);

            if (mapSettings.globalGeometryBbox) {
                const [minLng, minLat, maxLng, maxLat] = bbox(mapSettings.globalGeometryBbox);
                mapSettings.userLastPosition = [(minLng + maxLng) / 2, (minLat + maxLat) / 2];
            }

            setMapSettings(mapSettings);
            setStatisticsMapSettings(mapSettings);

            eventEmitter.emit('UPDATE_DETECTIONS');

            if (mapSettings.userLastPosition) {
                eventEmitter.emit('JUMP_TO', {
                    lng: mapSettings.userLastPosition[0],
                    lat: mapSettings.userLastPosition[1],
                });
            }
        } catch (err) {
            console.error(err);
        }
    }, [setMapSettings, setStatisticsMapSettings, eventEmitter]);
};

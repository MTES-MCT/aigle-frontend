import { DetectionGeojsonData } from '@/models/detection';
import { centroid, circle, distance } from '@turf/turf';

export const processDetections = (detectionGeojsonData: DetectionGeojsonData) => {
    detectionGeojsonData.features = detectionGeojsonData.features.map((feature) => {
        if (feature.properties.tileSetType !== 'PARTIAL') {
            return feature;
        }

        return circle(
            centroid(feature.geometry),
            distance(centroid(feature.geometry), feature.geometry.coordinates[0][0]),
            {
                properties: feature.properties,
            },
        );
    });

    return detectionGeojsonData;
};

import { DetectionGeojsonData } from '@/models/detection';
import { OTHER_OBJECT_TYPE } from '@/utils/constants';
import { centroid, circle, distance } from '@turf/turf';

export const processDetections = (detectionGeojsonData: DetectionGeojsonData, otherObjectTypesUuids: Set<string>) => {
    detectionGeojsonData.features = detectionGeojsonData.features.map((feature) => {
        if (otherObjectTypesUuids.has(feature.properties.objectTypeUuid)) {
            feature.properties.objectTypeColor = OTHER_OBJECT_TYPE.color;
        }

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

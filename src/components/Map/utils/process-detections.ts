import { DetectionGeojsonData } from '@/models/detection';
import { OTHER_OBJECT_TYPE } from '@/utils/constants';
import { centroid, circle, distance } from '@turf/turf';

export const processDetections = (detectionGeojsonData: DetectionGeojsonData, otherObjectTypesUuids: Set<string>) => {
    const features = detectionGeojsonData.features.map((feature) => {
        const properties = otherObjectTypesUuids.has(feature.properties.objectTypeUuid)
            ? { ...feature.properties, objectTypeColor: OTHER_OBJECT_TYPE.color }
            : feature.properties;

        if (properties.tileSetType !== 'PARTIAL') {
            return { ...feature, properties };
        }

        return circle(
            centroid(feature.geometry),
            distance(centroid(feature.geometry), feature.geometry.coordinates[0][0]),
            {
                properties,
            },
        );
    });

    return { ...detectionGeojsonData, features };
};

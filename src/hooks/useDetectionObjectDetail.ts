import { getDetectionObjectDetailEndpoint } from '@/api-endpoints';
import { DetectionObjectDetail } from '@/models/detection-object';
import api from '@/utils/api';
import { useMap } from '@/utils/context/map-context';
import { useQuery } from '@tanstack/react-query';
import { centroid, getCoord } from '@turf/turf';
import { useCallback, useEffect } from 'react';

interface UseDetectionObjectDetailOptions {
    onSuccess?: (detectionObject: DetectionObjectDetail) => void;
    jumpToDetection?: boolean;
}

export const useDetectionObjectDetail = (
    detectionObjectUuid: string,
    options: UseDetectionObjectDetailOptions = {},
) => {
    const { eventEmitter, setIsDetailFetching } = useMap();
    const { onSuccess, jumpToDetection = true } = options;

    const fetchDetectionObject = useCallback(async () => {
        const res = await api.get<DetectionObjectDetail>(getDetectionObjectDetailEndpoint(detectionObjectUuid));
        return res.data;
    }, [detectionObjectUuid]);

    const {
        data: detectionObject,
        isLoading,
        isFetching,
        isRefetching,
        refetch,
        error,
    } = useQuery({
        queryKey: [getDetectionObjectDetailEndpoint(detectionObjectUuid)],
        queryFn: async () => {
            const detectionObject = await fetchDetectionObject();

            if (jumpToDetection) {
                eventEmitter.emit('JUMP_TO', getCoord(centroid(detectionObject.detections[0].geometry)));
            }

            if (onSuccess) {
                onSuccess(detectionObject);
            }

            return detectionObject;
        },
        enabled: !!detectionObjectUuid,
    });

    useEffect(() => {
        setIsDetailFetching(isFetching);
    }, [isFetching, setIsDetailFetching]);

    useEffect(() => {
        const handleUpdate = () => {
            refetch();
        };

        eventEmitter.on('UPDATE_DETECTION_DETAIL', handleUpdate);

        return () => {
            eventEmitter.off('UPDATE_DETECTION_DETAIL', handleUpdate);
        };
    }, [eventEmitter, refetch]);

    return {
        detectionObject,
        isLoading,
        isRefetching,
        refetch,
        error,
    };
};

import { detectionObjectEndpoints } from '@/api/endpoints';
import { DetectionObjectDetail } from '@/models/detection-object';
import { useMap } from '@/store/slices/map';
import api, { ApiError } from '@/utils/api';
import { useQuery } from '@tanstack/react-query';
import { centroid, getCoord } from '@turf/turf';
import { useCallback, useEffect, useRef } from 'react';

const MAX_RETRIES = 3;

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

    const fetchDetectionObject = useCallback(
        (signal?: AbortSignal) =>
            api<DetectionObjectDetail>(detectionObjectEndpoints.detail(detectionObjectUuid), { signal }),
        [detectionObjectUuid],
    );

    const {
        data: detectionObject,
        isLoading,
        isFetching,
        isRefetching,
        refetch,
        error,
    } = useQuery({
        queryKey: [detectionObjectEndpoints.detail(detectionObjectUuid)],
        queryFn: async ({ signal }) => {
            const detectionObject = await fetchDetectionObject(signal);

            if (onSuccess) {
                onSuccess(detectionObject);
            }

            return detectionObject;
        },
        enabled: !!detectionObjectUuid,
        // a deleted or out-of-scope object answers the same on every retry
        retry: (failureCount, error) =>
            !(error instanceof ApiError && error.status < 500) && failureCount < MAX_RETRIES,
    });

    // once per opened object: a refetch (after an edit, a multiple edit elsewhere on the map)
    // must not pull the map back to it
    const jumpedUuidRef = useRef<string>();
    useEffect(() => {
        if (
            !jumpToDetection ||
            detectionObject?.uuid !== detectionObjectUuid ||
            jumpedUuidRef.current === detectionObjectUuid
        ) {
            return;
        }

        jumpedUuidRef.current = detectionObjectUuid;
        eventEmitter.emit('JUMP_TO', getCoord(centroid(detectionObject.detections[0].geometry)));
    }, [detectionObject, detectionObjectUuid, jumpToDetection, eventEmitter]);

    useEffect(() => {
        setIsDetailFetching(isFetching);
    }, [isFetching, setIsDetailFetching]);

    // the flag holds back the map's detections: closing the panel mid-fetch must not leave it set
    useEffect(() => () => setIsDetailFetching(false), [setIsDetailFetching]);

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

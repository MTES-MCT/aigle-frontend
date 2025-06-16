import { getDetectionObjectDetailEndpoint } from '@/api-endpoints';
import { DetectionObjectDetail } from '@/models/detection-object';
import api from '@/utils/api';
import { getAddressFromPolygon } from '@/utils/geojson';
import { useEffect, useState } from 'react';

export const useDetectionAddress = (detectionObject: DetectionObjectDetail) => {
    const [address, setAddress] = useState<string | null | undefined>(detectionObject.address || undefined);
    const [isLoading, setIsLoading] = useState(false);

    const updateAddress = async (detectionObjectUuid: string, newAddress: string) => {
        return api.patch(getDetectionObjectDetailEndpoint(detectionObjectUuid), {
            address: newAddress,
        });
    };

    useEffect(() => {
        if (detectionObject.address) {
            return;
        }

        const fetchAddress = async () => {
            setIsLoading(true);
            try {
                const resolvedAddress = await getAddressFromPolygon(detectionObject.detections[0].geometry);
                setAddress(resolvedAddress);

                if (resolvedAddress) {
                    await updateAddress(detectionObject.uuid, resolvedAddress);
                }
            } catch (error) {
                console.error('Error fetching address:', error);
                setAddress(null);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAddress();
    }, [detectionObject.address, detectionObject.uuid, detectionObject.detections]);

    return {
        address,
        isLoading,
        updateAddress,
    };
};

import React from 'react';

import { DownloadOutputFormat, detectionEndpoints } from '@/api/endpoints';
import { objectsFilterToApiParams } from '@/components/Map/utils/api';
import { ObjectsFilter } from '@/models/detection-filter';
import { useObjectsFilter } from '@/store/slices/objects-filter';
import { useStatistics } from '@/store/slices/statistics';
import api, { ApiError } from '@/utils/api';
import { Button } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { UseMutationResult, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';

const getFileName = (outputFormat: DownloadOutputFormat) =>
    `detections_${format(new Date(), 'dd-MM-yyyy-HH_mm')}.${outputFormat}`;

const download = async (
    outputFormat: DownloadOutputFormat,
    communesUuids: string[],
    departmentsUuids: string[],
    regionsUuids: string[],
    objectsFilter?: ObjectsFilter,
    ordering?: string,
) => {
    if (!objectsFilter) {
        throw new Error('No objects filter provided');
    }

    return api<Blob>(detectionEndpoints.download(outputFormat), {
        params: {
            ...objectsFilter,
            communesUuids: communesUuids.join(','),
            departmentsUuids: departmentsUuids.join(','),
            regionsUuids: regionsUuids.join(','),
            ...(ordering
                ? {
                      ordering,
                  }
                : {}),
        },
        responseType: 'blob',
    });
};

interface ComponentProps {
    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
    ordering?: string;
}
const Component: React.FC<ComponentProps> = ({
    communesUuids,
    departmentsUuids,
    regionsUuids,
    ordering,
}: ComponentProps) => {
    const { objectsFilter } = useObjectsFilter();
    const { otherObjectTypesUuids } = useStatistics();

    const apiObjectsFilter =
        objectsFilter && otherObjectTypesUuids
            ? objectsFilterToApiParams(objectsFilter, otherObjectTypesUuids)
            : objectsFilter;

    const mutation: UseMutationResult<void, ApiError, DownloadOutputFormat> = useMutation({
        mutationFn: (outputFormat: DownloadOutputFormat) =>
            download(outputFormat, communesUuids, departmentsUuids, regionsUuids, apiObjectsFilter, ordering),
        onSuccess: (data, outputFormat) => {
            const blob = new Blob([data], { type: data.type });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = getFileName(outputFormat);
            document.body.appendChild(a);
            a.click();
            a.remove();
        },
    });

    return (
        <Button.Group>
            <Button
                fullWidth
                loading={mutation.isPending}
                rightSection={<IconDownload size={14} />}
                mb="md"
                variant="outline"
                disabled={!objectsFilter || mutation.isPending}
                onClick={() => mutation.mutate('csv')}
            >
                Télécharger csv
            </Button>
            <Button
                fullWidth
                loading={mutation.isPending}
                rightSection={<IconDownload size={14} />}
                mb="md"
                variant="outline"
                disabled={!objectsFilter || mutation.isPending}
                onClick={() => mutation.mutate('xlsx')}
            >
                Télécharger xlsx
            </Button>
        </Button.Group>
    );
};

export default Component;

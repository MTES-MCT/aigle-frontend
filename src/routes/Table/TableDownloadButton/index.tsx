import React from 'react';

import { DownloadOutputFormat, detectionEndpoints } from '@/api/endpoints';
import { objectsFilterToApiParams } from '@/components/Map/utils/api';
import { ObjectsFilter } from '@/models/detection-filter';
import { FormValues } from '@/routes/Table/utils';
import { useObjectsFilter } from '@/store/slices/objects-filter';
import { useStatistics } from '@/store/slices/statistics';
import api, { ApiError } from '@/utils/api';
import { Button } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { UseMutationResult, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';

const getFileName = (outputFormat: DownloadOutputFormat) =>
    `detections_${format(new Date(), 'dd-MM-yyyy-HH_mm')}.${outputFormat}`;

// Collectivities travel as one object, never as positional lists: a misplaced
// argument would silently download another perimeter's data.
const download = async (
    outputFormat: DownloadOutputFormat,
    collectivities: FormValues,
    objectsFilter?: ObjectsFilter,
    ordering?: string,
) => {
    if (!objectsFilter) {
        throw new Error('No objects filter provided');
    }

    return api<Blob>(detectionEndpoints.download(outputFormat), {
        params: {
            ...objectsFilter,
            communesUuids: collectivities.communesUuids.join(','),
            epcisUuids: collectivities.epcisUuids.join(','),
            departmentsUuids: collectivities.departmentsUuids.join(','),
            regionsUuids: collectivities.regionsUuids.join(','),
            ...(ordering
                ? {
                      ordering,
                  }
                : {}),
        },
        responseType: 'blob',
    });
};

interface ComponentProps extends FormValues {
    ordering?: string;
}
const Component: React.FC<ComponentProps> = ({ ordering, ...collectivities }: ComponentProps) => {
    const { objectsFilter } = useObjectsFilter();
    const { otherObjectTypesUuids } = useStatistics();

    const apiObjectsFilter =
        objectsFilter && otherObjectTypesUuids
            ? objectsFilterToApiParams(objectsFilter, otherObjectTypesUuids)
            : objectsFilter;

    const mutation: UseMutationResult<Blob, ApiError, DownloadOutputFormat> = useMutation({
        mutationFn: (outputFormat: DownloadOutputFormat) =>
            download(outputFormat, collectivities, apiObjectsFilter, ordering),
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

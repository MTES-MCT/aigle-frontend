import React from 'react';

import { DownloadOutputFormat, getDetectionListDownloadEndpoint } from '@/api-endpoints';
import { ObjectsFilter } from '@/models/detection-filter';
import api from '@/utils/api';
import { useStatistics } from '@/utils/context/statistics-context';
import { Button, Loader as MantineLoader } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { UseMutationResult, useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { format } from 'date-fns';

const getFileName = (outputFormat: DownloadOutputFormat) =>
    `detections_${format(new Date(), 'dd-MM-yyyy-HH_mm')}.${outputFormat}`;

const download = async (
    outputFormat: DownloadOutputFormat,
    communesUuids: string[],
    departmentsUuids: string[],
    regionsUuids: string[],
    objectsFilter?: ObjectsFilter,
) => {
    if (!objectsFilter) {
        throw new Error('No objects filter provided');
    }

    const res = await api.get(getDetectionListDownloadEndpoint(outputFormat), {
        params: {
            ...objectsFilter,
            communesUuids: communesUuids.join(','),
            departmentsUuids: departmentsUuids.join(','),
            regionsUuids: regionsUuids.join(','),
        },
        responseType: 'blob',
    });
    return res.data;
};

interface ComponentProps {
    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
}
const Component: React.FC<ComponentProps> = ({ communesUuids, departmentsUuids, regionsUuids }: ComponentProps) => {
    const { objectsFilter } = useStatistics();

    const mutation: UseMutationResult<void, AxiosError, DownloadOutputFormat> = useMutation({
        mutationFn: (outputFormat: DownloadOutputFormat) =>
            download(outputFormat, communesUuids, departmentsUuids, regionsUuids, objectsFilter),
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
                rightSection={mutation.isPending ? <MantineLoader size="xs" /> : <IconDownload size={14} />}
                mb="md"
                variant="outline"
                disabled={!objectsFilter || mutation.isPending}
                onClick={() => mutation.mutate('csv')}
            >
                Télécharger csv
            </Button>
            <Button
                fullWidth
                rightSection={mutation.isPending ? <MantineLoader size="xs" /> : <IconDownload size={14} />}
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

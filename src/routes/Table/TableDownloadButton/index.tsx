import React from 'react';

import { DETECTION_LIST_DOWNLOAD_CSV_ENDPOINT } from '@/api-endpoints';
import { ObjectsFilter } from '@/models/detection-filter';
import api from '@/utils/api';
import { useStatistics } from '@/utils/context/statistics-context';
import { Button } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { AxiosError } from 'axios';

const downloadCsv = async (
    communesUuids: string[],
    departmentsUuids: string[],
    regionsUuids: string[],
    objectsFilter?: ObjectsFilter,
) => {
    if (!objectsFilter) {
        throw new Error('No objects filter provided');
    }

    const res = await api.get(DETECTION_LIST_DOWNLOAD_CSV_ENDPOINT, {
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

    const mutation: UseMutationResult<void, AxiosError, void> = useMutation({
        mutationFn: () => downloadCsv(communesUuids, departmentsUuids, regionsUuids, objectsFilter),
        onSuccess: (data) => {
            const blob = new Blob([data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'detection_list.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
        },
    });

    return (
        <Button
            fullWidth
            rightSection={<IconDownload size={14} />}
            mb="md"
            variant="outline"
            disabled={!objectsFilter || mutation.isPending}
            onClick={() => mutation.mutate()}
        >
            Télécharger csv
        </Button>
    );
};

export default Component;

import React from 'react';

import { DownloadOutputFormat, detectionEndpoints } from '@/api/endpoints';
import { objectsFilterToApiParams } from '@/components/Map/utils/api';
import { ObjectsFilter } from '@/models/detection-filter';
import { FormValues } from '@/routes/Table/utils';
import { useObjectsFilter } from '@/store/slices/objects-filter';
import { useStatistics } from '@/store/slices/statistics';
import { apiFetchRaw } from '@/utils/api';
import { triggerDownload } from '@/utils/download';
import { formatBigInt } from '@/utils/format';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES, getErrorTrackingName, getFilterTrackingName } from '@/utils/tracking';
import { Button } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconDownload } from '@tabler/icons-react';
import { UseMutationResult, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';

// Set by the API on every export (aigle-api core/views/detection/detection_list.py), which caps the rows.
const EXPORT_ROW_COUNT_HEADER = 'X-Export-Row-Count';
const EXPORT_TRUNCATED_HEADER = 'X-Export-Truncated';

const getFileName = (outputFormat: DownloadOutputFormat) =>
    `detections_${format(new Date(), 'dd-MM-yyyy-HH_mm')}.${outputFormat}`;

interface ExportFile {
    blob: Blob;
    // Undefined when the API did not say (header missing).
    rowCount?: number;
    truncated: boolean;
}

interface ExportContext {
    startedAt: number;
    // '<format> : <preset id | CUSTOM>', from the filter of the click: it may change while the file is generated.
    trackingName?: string;
}

const readRowCount = (response: Response): number | undefined => {
    const rowCount = Number.parseInt(response.headers.get(EXPORT_ROW_COUNT_HEADER) ?? '', 10);
    return Number.isNaN(rowCount) ? undefined : rowCount;
};

// Collectivities travel as one object, never as positional lists: a misplaced
// argument would silently download another perimeter's data.
const download = async (
    outputFormat: DownloadOutputFormat,
    collectivities: FormValues,
    objectsFilter?: ObjectsFilter,
    ordering?: string,
): Promise<ExportFile> => {
    if (!objectsFilter) {
        throw new Error('No objects filter provided');
    }

    const response = await apiFetchRaw(detectionEndpoints.download(outputFormat), {
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
    });

    return {
        blob: await response.blob(),
        rowCount: readRowCount(response),
        truncated: response.headers.get(EXPORT_TRUNCATED_HEADER) === 'true',
    };
};

const getElapsedSeconds = (context?: ExportContext) =>
    context ? Math.round((Date.now() - context.startedAt) / 1000) : undefined;

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

    const mutation: UseMutationResult<ExportFile, Error, DownloadOutputFormat, ExportContext> = useMutation({
        mutationFn: (outputFormat: DownloadOutputFormat) =>
            download(outputFormat, collectivities, apiObjectsFilter, ordering),
        onMutate: (outputFormat) => ({
            startedAt: Date.now(),
            trackingName: objectsFilter ? `${outputFormat} : ${getFilterTrackingName(objectsFilter)}` : undefined,
        }),
        onSuccess: ({ blob, rowCount, truncated }, outputFormat, context) => {
            triggerDownload(blob, getFileName(outputFormat));
            trackEvent(TRACKING_CATEGORIES.table, 'Export téléchargé', context?.trackingName, rowCount);

            // The API caps the detections, not the rows: the row count is the objects they group into.
            if (truncated) {
                notifications.show({
                    color: 'orange',
                    title: 'Export incomplet',
                    message: `Le nombre de détections exportables est limité : le fichier ne contient que les ${rowCount !== undefined ? `${formatBigInt(rowCount)} ` : ''}premiers objets. Réduisez le périmètre ou affinez les filtres pour obtenir les suivants.`,
                    autoClose: false,
                });
            }
        },
        onError: (error, outputFormat, context) => {
            notifications.show({
                color: 'red',
                title: 'Export impossible',
                message: `Le fichier ${outputFormat} n'a pas pu être généré. Veuillez réessayer, ou réduire le périmètre si l'erreur persiste.`,
            });
            trackEvent(
                TRACKING_CATEGORIES.table,
                'Export échoué',
                `${outputFormat} : ${getErrorTrackingName(error)}`,
                getElapsedSeconds(context),
            );
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

import { detectionDataEndpoints, detectionEndpoints } from '@/api/endpoints';
import DetectionTilePreview from '@/components/DetectionDetail/DetectionTilePreview';
import ErrorCard from '@/components/ui/ErrorCard';
import InfoBubble from '@/components/ui/InfoBubble';
import InfoCard from '@/components/ui/InfoCard';
import {
    DetectionControlStatus,
    DetectionData,
    DetectionDetail,
    DetectionPrescriptionStatus,
    DetectionValidationStatus,
    DetectionWithTile,
    detectionControlStatuses,
    detectionValidationStatuses,
} from '@/models/detection';
import { DetectionObjectDetail } from '@/models/detection-object';
import { TileSet } from '@/models/tile-set';
import { useMap } from '@/store/slices/map';
import api from '@/utils/api';
import {
    DEFAULT_DATE_FORMAT,
    DETECTION_CONTROL_STATUSES_NAMES_MAP,
    DETECTION_VALIDATION_STATUSES_COLORS_MAP,
    DETECTION_VALIDATION_STATUSES_NAMES_MAP,
} from '@/utils/constants';
import { Button, Checkbox, LoadingOverlay, Loader as MantineLoader, Select, Text } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { UseFormReturnType, useForm } from '@mantine/form';
import { UseMutationResult, useMutation } from '@tanstack/react-query';
import { bbox } from '@turf/turf';
import { AxiosError } from 'axios';
import clsx from 'clsx';
import { format, parse } from 'date-fns';
import { Polygon } from 'geojson';
import React, { useEffect, useMemo, useState } from 'react';
import classes from './index.module.scss';

interface FormValues {
    detectionControlStatus: DetectionControlStatus;
    detectionValidationStatus: DetectionValidationStatus;
    detectionPrescriptionStatus: DetectionPrescriptionStatus | null;
    officialReportDate: Date | null;
}

interface RequestData extends Omit<FormValues, 'officialReportDate'> {
    officialReportDate?: string | null;
}

const postForm = async (
    values: FormValues,
    geometry?: Polygon,
    tileSetUuid?: string,
    detectionObjectUuid?: string,
    uuid?: string,
) => {
    let resValue: DetectionData;
    const values_: RequestData = {
        ...values,
        officialReportDate: values.officialReportDate ? format(values.officialReportDate, 'yyyy-MM-dd') : null,
    };

    if (values.detectionControlStatus !== 'OFFICIAL_REPORT_DRAWN_UP') {
        delete values_.officialReportDate;
    }

    if (uuid) {
        const response = await api.patch<DetectionData>(detectionDataEndpoints.detail(uuid), values_);
        resValue = response.data;
    } else {
        const body = {
            detectionObjectUuid,
            tileSetUuid,
            geometry,
            detectionData: values_,
        };
        const response = await api.post<DetectionDetail>(detectionEndpoints.create, body);
        resValue = response.data.detectionData;
    }

    return {
        ...resValue,
        officialReportDate: resValue.officialReportDate ? new Date(resValue.officialReportDate) : null,
    };
};

interface FormProps {
    detectionObjectUuid: string;
    prescriptionDurationYears: number | null;
    tileSetUuid?: string;
    uuid?: string;
    geometry?: Polygon;
    initialValues: FormValues;
    disabled?: boolean;
}

const Form: React.FC<FormProps> = ({
    detectionObjectUuid,
    prescriptionDurationYears,
    tileSetUuid,
    uuid,
    geometry,
    initialValues,
    disabled,
}) => {
    const [error, setError] = useState<AxiosError>();
    const { eventEmitter } = useMap();

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues,
    });

    useEffect(() => {
        form.setValues(initialValues);
    }, [initialValues]);

    const mutation: UseMutationResult<FormValues, AxiosError, FormValues> = useMutation({
        mutationFn: (values: FormValues) => postForm(values, geometry, tileSetUuid, detectionObjectUuid, uuid),
        onSuccess: () => {
            eventEmitter.emit('UPDATE_DETECTIONS');
            eventEmitter.emit('UPDATE_DETECTION_DETAIL');
        },
        onError: (error) => {
            console.error(error);
            setError(error);
            if (error.response?.data) {
                // @ts-expect-error types do not match
                form.setErrors(error.response?.data);
            }
        },
    });

    const submit = async () => {
        if (!uuid) {
            return;
        }

        const formValues = form.getValues();
        await handleSubmit(formValues);
    };
    form.watch('detectionControlStatus', submit);
    form.watch('detectionValidationStatus', submit);
    form.watch('detectionPrescriptionStatus', submit);
    form.watch('officialReportDate', submit);

    const handleSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    return (
        <form onSubmit={form.onSubmit(handleSubmit)} className={classes.form}>
            {!uuid ? (
                <InfoCard title="Ajout d'un objet" withCloseButton={false}>
                    <p>Cet objet n&apos;exsite pas actuellement. Vous êtes sur le point de le créer.</p>
                    <Button mt="xs" type="submit" fullWidth disabled={disabled}>
                        Créer l&apos;objet
                    </Button>
                </InfoCard>
            ) : null}
            {error ? (
                <ErrorCard>
                    <p>Voir les indications ci-dessous pour plus d&apos;info</p>
                </ErrorCard>
            ) : null}

            <Text mt="md" className="input-label">
                Statut de validation{' '}
                <InfoBubble>
                    <>
                        <p>Aucune sélection: l&apos;objet n&apos;a pas été vérifié par un utilisateur</p>
                        <p>
                            Suspect: l&apos;objet est <b>bien présent</b> sur les images et est{' '}
                            <b>suspecté d&apos;être illégal</b>
                        </p>
                        <p>
                            Légitime: l&apos;objet est <b>bien présent</b> sur les images et <b>légal</b>
                        </p>
                        <p>
                            Invalidé: l&apos;objet est <b>absent</b> sur les images
                        </p>
                    </>
                </InfoBubble>
            </Text>
            <div
                className={clsx(classes['detection-validation-status-select-container'], {
                    [classes.disabled]: disabled,
                })}
            >
                {detectionValidationStatuses
                    .filter((status) => status !== 'DETECTED_NOT_VERIFIED')
                    .map((status) => (
                        <Button
                            variant={form.getValues().detectionValidationStatus === status ? 'filled' : 'outline'}
                            color={DETECTION_VALIDATION_STATUSES_COLORS_MAP[status]}
                            key={status}
                            disabled={mutation.status === 'pending'}
                            onClick={() => form.setFieldValue('detectionValidationStatus', status)}
                        >
                            {DETECTION_VALIDATION_STATUSES_NAMES_MAP[status]}
                        </Button>
                    ))}
            </div>

            {prescriptionDurationYears ? (
                <Checkbox
                    mt="md"
                    label={`Prescrit (durée : ${prescriptionDurationYears} ans)`}
                    key={form.key('detectionPrescriptionStatus')}
                    disabled={disabled || mutation.status === 'pending'}
                    checked={form.getValues().detectionPrescriptionStatus === 'PRESCRIBED'}
                    onChange={(event) =>
                        form.setFieldValue(
                            'detectionPrescriptionStatus',
                            event.currentTarget.checked ? 'PRESCRIBED' : 'NOT_PRESCRIBED',
                        )
                    }
                />
            ) : null}

            <Select
                allowDeselect={false}
                mt="md"
                label="Statut du contrôle"
                data={detectionControlStatuses.map((status) => ({
                    value: status,
                    label: DETECTION_CONTROL_STATUSES_NAMES_MAP[status],
                }))}
                key={form.key('detectionControlStatus')}
                disabled={disabled || mutation.status === 'pending'}
                rightSection={mutation.status === 'pending' ? <MantineLoader size="xs" /> : null}
                {...form.getInputProps('detectionControlStatus')}
            />
            {form.getValues().detectionControlStatus === 'OFFICIAL_REPORT_DRAWN_UP' ? (
                <DateInput
                    mt="md"
                    label="Date du PV"
                    dateParser={(value: string) => parse(value, 'dd/MM/yyyy', new Date())}
                    valueFormat="DD/MM/YYYY"
                    placeholder="26/02/2023"
                    description="Optionel"
                    clearable
                    key={form.key('officialReportDate')}
                    {...form.getInputProps('officialReportDate')}
                />
            ) : null}
        </form>
    );
};

const EMPTY_FORM_VALUES: FormValues = {
    detectionControlStatus: 'NOT_CONTROLLED',
    detectionValidationStatus: 'SUSPECT',
    detectionPrescriptionStatus: null,
    officialReportDate: null,
};

interface ComponentProps {
    detectionObject: DetectionObjectDetail;
    initialDetection: DetectionWithTile;
    detectionRefreshing: boolean;
    tileSetSelected: TileSet;
    setTileSetSelected: (tileSet: TileSet) => void;
}
const Component: React.FC<ComponentProps> = ({
    detectionObject,
    tileSetSelected,
    setTileSetSelected,
    initialDetection,
    detectionRefreshing,
}) => {
    const [detectionSelected, setDetectionSelected] = useState<DetectionWithTile | undefined>(initialDetection);

    const previewBounds = useMemo(
        () => bbox(initialDetection.tile.geometry) as [number, number, number, number],
        [detectionObject],
    );

    useEffect(() => {
        selectTileSet(tileSetSelected.uuid);
    }, [detectionObject]);

    useEffect(() => {
        selectDetection(tileSetSelected.uuid);
    }, [tileSetSelected, detectionObject]);

    const selectTileSet = (tileSetUuid: string) => {
        const tileSetPreview = detectionObject.tileSets.find(({ tileSet }) => tileSet.uuid === tileSetUuid);

        if (!tileSetPreview) {
            return;
        }

        setTileSetSelected(tileSetPreview.tileSet);
    };

    const selectDetection = (tileSetUuid: string) => {
        const detection = detectionObject.detections.find((detection) => detection.tileSet.uuid === tileSetUuid);

        setDetectionSelected(detection);
    };

    return (
        <div className={classes.container}>
            <h2 className={classes.title}>Editer ou rajouter une détection</h2>
            <Select
                allowDeselect={false}
                label="Source d'image"
                data={detectionObject.tileSets.map(({ tileSet }) => ({
                    value: tileSet.uuid,
                    label: `${tileSet.name} - ${format(tileSet.date, DEFAULT_DATE_FORMAT)}`,
                }))}
                value={tileSetSelected.uuid}
                onChange={(tileSetUuid) => selectTileSet(String(tileSetUuid))}
            />

            <div className={classes['detection-tile-preview-form-container']}>
                <LoadingOverlay visible={detectionRefreshing} zIndex={10000} overlayProps={{ radius: 'sm', blur: 2 }} />

                <div className={classes['detection-tile-preview-container']}>
                    <DetectionTilePreview
                        key={`${tileSetSelected.uuid}-${detectionSelected?.uuid}`}
                        controlsDisplayed={['ZOOM']}
                        bounds={previewBounds}
                        geometries={[
                            {
                                geometry: detectionSelected?.geometry || initialDetection.geometry,
                                color: detectionObject.objectType.color,
                            },
                        ]}
                        strokedLine={!detectionSelected}
                        tileSet={tileSetSelected}
                        displayName={false}
                        classNames={{
                            inner: 'detection-tile-preview-detail-container',
                            main: 'detection-tile-preview-detail',
                        }}
                    />
                </div>

                <Form
                    key={detectionSelected?.uuid || tileSetSelected.uuid}
                    detectionObjectUuid={detectionObject.uuid}
                    prescriptionDurationYears={detectionObject.objectType.prescriptionDurationYears}
                    uuid={detectionSelected?.detectionData.uuid}
                    initialValues={
                        detectionSelected
                            ? {
                                  detectionControlStatus: detectionSelected.detectionData.detectionControlStatus,
                                  detectionValidationStatus: detectionSelected.detectionData.detectionValidationStatus,
                                  detectionPrescriptionStatus:
                                      detectionSelected.detectionData.detectionPrescriptionStatus,
                                  officialReportDate: detectionSelected.detectionData.officialReportDate
                                      ? new Date(detectionSelected.detectionData.officialReportDate)
                                      : null,
                              }
                            : EMPTY_FORM_VALUES
                    }
                    disabled={!detectionObject.userGroupRights.includes('WRITE')}
                    geometry={initialDetection.geometry}
                    tileSetUuid={tileSetSelected.uuid}
                />
            </div>
        </div>
    );
};

export default Component;

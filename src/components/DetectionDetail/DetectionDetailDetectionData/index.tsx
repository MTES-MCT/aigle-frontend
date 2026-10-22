import { detectionDataEndpoints, detectionEndpoints } from '@/api/endpoints';
import DetectionTilePreview from '@/components/DetectionDetail/DetectionTilePreview';
import { useDetectionTracking } from '@/components/DetectionDetail/tracking';
import Accordion from '@/components/dsfr/Accordion';
import Select from '@/components/dsfr/Select';
import Tooltip from '@/components/dsfr/Tooltip';
import Loader from '@/components/ui/Loader';
import {
    DetectionControlStatus,
    DetectionData,
    DetectionDetail,
    DetectionPrescriptionStatus,
    DetectionValidationStatus,
    DetectionValidationStatusChangeReason,
    DetectionWithTile,
    detectionControlStatuses,
    detectionValidationStatusesSelectable,
} from '@/models/detection';
import { DetectionObjectDetail } from '@/models/detection-object';
import { TileSet } from '@/models/tile-set';
import { useMap } from '@/store/slices/map';
import api, { ApiError } from '@/utils/api';
import { DETECTION_CONTROL_STATUSES_NAMES_MAP, DETECTION_VALIDATION_STATUSES_NAMES_MAP } from '@/utils/constants';
import { formatDateOnly } from '@/utils/format';
import { TRACKING_CATEGORIES, getErrorTrackingName } from '@/utils/tracking';
import { UseFormReturnType, useForm } from '@mantine/form';
import { UseMutationResult, useMutation } from '@tanstack/react-query';
import { bbox } from '@turf/turf';
import clsx from 'clsx';
import { format, parse } from 'date-fns';
import { Polygon } from 'geojson';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import classes from './index.module.scss';

interface FormValues {
    detectionControlStatus: DetectionControlStatus;
    detectionValidationStatus: DetectionValidationStatus;
    detectionPrescriptionStatus: DetectionPrescriptionStatus | null;
    officialReportDate: Date | null;
    legitimateDate: Date | null;
    detectionValidationStatusChangeReason: DetectionValidationStatusChangeReason | null;
    authorizationIds: string[] | null;
}

interface RequestData
    extends Omit<FormValues, 'officialReportDate' | 'legitimateDate' | 'detectionValidationStatusChangeReason'> {
    officialReportDate?: string | null;
    legitimateDate?: string | null;
}

const postForm = async (
    values: FormValues,
    geometry?: Polygon,
    tileSetUuid?: string,
    detectionObjectUuid?: string,
    uuid?: string,
) => {
    let resValue: DetectionData;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { detectionValidationStatusChangeReason, ...valuesToPost } = values;
    const values_: RequestData = {
        ...valuesToPost,
        officialReportDate: values.officialReportDate ? format(values.officialReportDate, 'yyyy-MM-dd') : null,
        legitimateDate: values.legitimateDate ? format(values.legitimateDate, 'yyyy-MM-dd') : null,
    };

    if (values.detectionControlStatus !== 'OFFICIAL_REPORT_DRAWN_UP') {
        delete values_.officialReportDate;
    }

    if (values.detectionValidationStatus !== 'LEGITIMATE') {
        delete values_.legitimateDate;
    }

    if (uuid) {
        resValue = await api<DetectionData>(detectionDataEndpoints.detail(uuid), {
            method: 'PATCH',
            body: values_,
        });
    } else {
        const body = {
            detectionObjectUuid,
            tileSetUuid,
            geometry,
            detectionData: values_,
        };
        const response = await api<DetectionDetail>(detectionEndpoints.create, { method: 'POST', body });
        resValue = response.detectionData;
    }

    return {
        ...resValue,
        // parsed as local midnight: new Date() reads a bare date as UTC
        officialReportDate: resValue.officialReportDate
            ? parse(resValue.officialReportDate, 'yyyy-MM-dd', new Date())
            : null,
        legitimateDate: resValue.legitimateDate ? parse(resValue.legitimateDate, 'yyyy-MM-dd', new Date()) : null,
    };
};

// the earliest date the fields take: a year being typed starts at 0002 and must not be saved
const MIN_DATE = '1980-02-01';

interface DateFieldProps {
    label: string;
    value: Date | null;
    error?: React.ReactNode;
    disabled?: boolean;
    onChange: (date: Date | null) => void;
}

/**
 * A DSFR date input. The text typed is kept locally: the form only takes a complete date from
 * MIN_DATE on (or an emptied field), the native picker reporting every keystroke of the year.
 */
const DateField: React.FC<DateFieldProps> = ({ label, value, error, disabled, onChange }: DateFieldProps) => {
    const id = `date-${useId()}`;
    const formatted = value ? format(value, 'yyyy-MM-dd') : '';
    const [text, setText] = useState(formatted);

    useEffect(() => setText(formatted), [formatted]);

    return (
        <div
            className={clsx('fr-input-group', error && 'fr-input-group--error', disabled && 'fr-input-group--disabled')}
        >
            <label className="fr-label" htmlFor={id}>
                {label}
                <span className="fr-hint-text">Optionnel</span>
            </label>
            <input
                className="fr-input"
                type="date"
                id={id}
                min={MIN_DATE}
                value={text}
                disabled={disabled}
                aria-describedby={error ? `${id}-messages` : undefined}
                onChange={(event) => {
                    const next = event.currentTarget.value;
                    setText(next);

                    if (!next) {
                        onChange(null);
                    } else if (next >= MIN_DATE) {
                        onChange(parse(next, 'yyyy-MM-dd', new Date()));
                    }
                }}
                onBlur={() => setText(formatted)}
            />
            <div className="fr-messages-group" id={`${id}-messages`} aria-live="polite">
                {error ? <p className="fr-message fr-message--error">{error}</p> : null}
            </div>
        </div>
    );
};

// A change the agent made, sent once the PATCH it triggers succeeds.
interface TrackedChange {
    action: string;
    name: string;
}

interface FormProps {
    detectionObjectUuid: string;
    prescriptionDurationYears: number | null;
    tileSetUuid?: string;
    tileSetYear: string;
    uuid?: string;
    geometry?: Polygon;
    initialValues: FormValues;
    disabled?: boolean;
}

const Form: React.FC<FormProps> = ({
    detectionObjectUuid,
    prescriptionDurationYears,
    tileSetUuid,
    tileSetYear,
    uuid,
    geometry,
    initialValues,
    disabled,
}) => {
    const [error, setError] = useState<ApiError>();
    const fieldsId = `detection-data-${useId()}`;
    const { eventEmitter } = useMap();
    const { trackEvent, trackEventOnce } = useDetectionTracking();
    // filled by the handlers, taken by the next save: the watchers below also save values the agent did not pick
    const pendingChangesRef = useRef<TrackedChange[]>([]);

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues,
    });

    useEffect(() => {
        form.setValues(initialValues);
    }, [
        initialValues.detectionControlStatus,
        initialValues.detectionValidationStatus,
        initialValues.detectionPrescriptionStatus,
        initialValues.officialReportDate,
        initialValues.legitimateDate,
    ]);

    const mutation: UseMutationResult<FormValues, ApiError, FormValues, TrackedChange[]> = useMutation({
        mutationFn: (values: FormValues) => postForm(values, geometry, tileSetUuid, detectionObjectUuid, uuid),
        onMutate: () => {
            const changes = pendingChangesRef.current;
            pendingChangesRef.current = [];
            return changes;
        },
        onSuccess: (_data, _values, changes) => {
            changes?.forEach(({ action, name }) => trackEvent(TRACKING_CATEGORIES.detection, action, name));

            // without a uuid, only the 'Créer l'objet' submit saves
            if (!uuid) {
                trackEvent(TRACKING_CATEGORIES.detection, 'Détection ajoutée', tileSetYear);
            }

            eventEmitter.emit('UPDATE_DETECTIONS');
            eventEmitter.emit('UPDATE_DETECTION_DETAIL');
        },
        onError: (error) => {
            trackEventOnce(
                TRACKING_CATEGORIES.detection,
                'Enregistrement échoué',
                `${uuid ? 'Statuts' : 'Création'} : ${getErrorTrackingName(error)}`,
            );
            console.error(error);
            setError(error);
            if (error.body) {
                // @ts-expect-error types do not match
                form.setErrors(error.body);
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
    form.watch('legitimateDate', submit);

    const handleSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    // only for a change of an existing detection: the watchers save it right away
    const stashChange = (action: string, from: string | null, to: string | null, name: string) => {
        if (uuid && to && from !== to) {
            pendingChangesRef.current.push({ action, name });
        }
    };

    const pending = mutation.status === 'pending';
    const sitadelLocked = form.getValues().detectionValidationStatusChangeReason === 'SITADEL';

    return (
        <form onSubmit={form.onSubmit(handleSubmit)} className={classes.form}>
            {!uuid ? (
                <div className={clsx('fr-alert fr-alert--info', classes.alert)}>
                    <h3 className="fr-alert__title">Ajout d&apos;un objet</h3>
                    <p>Cet objet n&apos;exsite pas actuellement. Vous êtes sur le point de le créer.</p>
                    <button
                        type="submit"
                        className={clsx('fr-btn fr-btn--sm', classes['alert-action'])}
                        disabled={disabled || pending}
                        aria-busy={pending}
                    >
                        Créer l&apos;objet
                    </button>
                </div>
            ) : null}
            {error ? (
                <div className={clsx('fr-alert fr-alert--error', classes.alert)}>
                    <h3 className="fr-alert__title">Une erreur est survenue</h3>
                    <p>Voir les indications ci-dessous pour plus d&apos;info</p>
                </div>
            ) : null}

            {sitadelLocked ? (
                <div className={clsx('fr-alert fr-alert--info', classes.alert)}>
                    <h3 className="fr-alert__title">Statut verrouillé</h3>
                    <p>
                        Cette détection a été validée par la base de données{' '}
                        <a
                            target="_blank"
                            rel="noopener noreferrer"
                            href="https://www.statistiques.developpement-durable.gouv.fr/traitement-des-donnees-relatives-aux-demandes-durbanisme-sitadel"
                        >
                            SITADEL
                        </a>{' '}
                        et ne peut pas être modifiée manuellement.
                    </p>
                    {form.getValues().authorizationIds ? (
                        <>
                            <p>Numéros d&apos;autorisations de la parcelle :</p>
                            <ul>
                                {form.getValues().authorizationIds?.map((authorizationId) => (
                                    <li key={authorizationId}>
                                        <b>{authorizationId}</b>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : null}
                </div>
            ) : null}

            <fieldset className="fr-segmented fr-segmented--sm" disabled={disabled || sitadelLocked || pending}>
                <legend className={clsx('fr-segmented__legend', classes['segmented-legend'])}>
                    Statut de validation
                    <Tooltip
                        label={
                            <>
                                Aucune sélection : l&apos;objet n&apos;a pas été vérifié par un utilisateur
                                <br />
                                Suspect : l&apos;objet est <b>bien présent</b> sur les images et est{' '}
                                <b>suspecté d&apos;être illégal</b>
                                <br />
                                Légitime : l&apos;objet est <b>bien présent</b> sur les images et <b>légal</b>
                                <br />
                                Invalidé : l&apos;objet est <b>absent</b> sur les images
                            </>
                        }
                    >
                        <button type="button" className="fr-btn--tooltip fr-btn">
                            Information sur les statuts de validation
                        </button>
                    </Tooltip>
                </legend>
                <div className="fr-segmented__elements">
                    {detectionValidationStatusesSelectable
                        .filter((status) => status !== 'DETECTED_NOT_VERIFIED')
                        .map((status) => (
                            <div className="fr-segmented__element" key={status}>
                                <input
                                    type="radio"
                                    id={`${fieldsId}-validation-${status}`}
                                    name={`${fieldsId}-validation`}
                                    value={status}
                                    checked={form.getValues().detectionValidationStatus === status}
                                    onChange={() => {
                                        const currentStatus = form.getValues().detectionValidationStatus;
                                        stashChange(
                                            'Statut de validation modifié',
                                            currentStatus,
                                            status,
                                            `${currentStatus} → ${status}`,
                                        );
                                        form.setFieldValue('detectionValidationStatus', status);
                                    }}
                                />
                                <label className="fr-label" htmlFor={`${fieldsId}-validation-${status}`}>
                                    {DETECTION_VALIDATION_STATUSES_NAMES_MAP[status]}
                                </label>
                            </div>
                        ))}
                </div>
            </fieldset>
            {form.getValues().detectionValidationStatus === 'LEGITIMATE' ? (
                <DateField
                    label="Date d'autorisation"
                    value={form.getValues().legitimateDate}
                    error={form.errors.legitimateDate}
                    disabled={disabled || pending || sitadelLocked}
                    onChange={(date) => form.setFieldValue('legitimateDate', date)}
                />
            ) : null}

            {prescriptionDurationYears ? (
                <div className="fr-checkbox-group">
                    <input
                        type="checkbox"
                        id={`${fieldsId}-prescription`}
                        disabled={disabled || pending}
                        checked={form.getValues().detectionPrescriptionStatus === 'PRESCRIBED'}
                        onChange={(event) => {
                            const prescriptionStatus = event.currentTarget.checked ? 'PRESCRIBED' : 'NOT_PRESCRIBED';
                            stashChange(
                                'Prescription modifiée',
                                form.getValues().detectionPrescriptionStatus,
                                prescriptionStatus,
                                prescriptionStatus,
                            );
                            form.setFieldValue('detectionPrescriptionStatus', prescriptionStatus);
                        }}
                    />
                    <label className="fr-label" htmlFor={`${fieldsId}-prescription`}>
                        Prescrit (durée : {prescriptionDurationYears} ans)
                    </label>
                </div>
            ) : null}

            <Select
                label="Statut du contrôle"
                options={detectionControlStatuses.map((status) => ({
                    value: status,
                    label: DETECTION_CONTROL_STATUSES_NAMES_MAP[status],
                }))}
                value={form.getValues().detectionControlStatus}
                error={form.errors.detectionControlStatus}
                disabled={disabled || pending}
                onChange={(value) => {
                    const controlStatus = value as DetectionControlStatus;
                    const currentStatus = form.getValues().detectionControlStatus;
                    stashChange(
                        'Statut de contrôle modifié',
                        currentStatus,
                        controlStatus,
                        `${currentStatus} → ${controlStatus}`,
                    );
                    form.setFieldValue('detectionControlStatus', controlStatus);
                }}
            />
            {form.getValues().detectionControlStatus === 'OFFICIAL_REPORT_DRAWN_UP' ? (
                <DateField
                    label="Date du PV"
                    value={form.getValues().officialReportDate}
                    error={form.errors.officialReportDate}
                    disabled={disabled || pending}
                    onChange={(date) => form.setFieldValue('officialReportDate', date)}
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
    legitimateDate: null,
    detectionValidationStatusChangeReason: null,
    authorizationIds: null,
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
    const [expanded, setExpanded] = useState(true);
    const { trackEvent } = useDetectionTracking();

    const previewBounds = useMemo(() => {
        const detection = detectionSelected || initialDetection;
        return bbox(detection.tile.geometry) as [number, number, number, number];
    }, [detectionObject.uuid, tileSetSelected.uuid, detectionSelected, initialDetection]);

    useEffect(() => {
        selectTileSet(tileSetSelected.uuid);
    }, [detectionObject.uuid]);

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
        <Accordion title="Editer ou rajouter une détection" expanded={expanded} onToggle={setExpanded}>
            <div className={classes.container}>
                <Select
                    label="Source d'image"
                    options={detectionObject.tileSets.map(({ tileSet }) => ({
                        value: tileSet.uuid,
                        label: `${tileSet.name} - ${formatDateOnly(tileSet.date)}`,
                    }))}
                    value={tileSetSelected.uuid}
                    onChange={(tileSetUuid) => {
                        const tileSetPreview = detectionObject.tileSets.find(
                            ({ tileSet }) => tileSet.uuid === tileSetUuid,
                        );

                        if (tileSetPreview && tileSetUuid !== tileSetSelected.uuid) {
                            trackEvent(
                                TRACKING_CATEGORIES.detection,
                                'Millésime sélectionné',
                                `Liste : ${formatDateOnly(tileSetPreview.tileSet.date, 'yyyy')}`,
                            );
                        }

                        selectTileSet(String(tileSetUuid));
                    }}
                />

                <div className={classes['detection-tile-preview-form-container']} aria-busy={detectionRefreshing}>
                    {detectionRefreshing ? (
                        <div className={classes['refreshing-overlay']}>
                            <Loader />
                        </div>
                    ) : null}

                    <div className={classes['detection-tile-preview-container']}>
                        <DetectionTilePreview
                            key={`${tileSetSelected.uuid}-${detectionObject.uuid}-${detectionSelected?.uuid}`}
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
                            reuseMaps={false}
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
                                      detectionValidationStatus:
                                          detectionSelected.detectionData.detectionValidationStatus,
                                      detectionPrescriptionStatus:
                                          detectionSelected.detectionData.detectionPrescriptionStatus,
                                      // parsed as local midnight: new Date() reads a bare date as UTC
                                      officialReportDate: detectionSelected.detectionData.officialReportDate
                                          ? parse(
                                                detectionSelected.detectionData.officialReportDate,
                                                'yyyy-MM-dd',
                                                new Date(),
                                            )
                                          : null,
                                      legitimateDate: detectionSelected.detectionData.legitimateDate
                                          ? parse(
                                                detectionSelected.detectionData.legitimateDate,
                                                'yyyy-MM-dd',
                                                new Date(),
                                            )
                                          : null,
                                      detectionValidationStatusChangeReason:
                                          detectionSelected.detectionData.detectionValidationStatusChangeReason,
                                      authorizationIds: detectionSelected.detectionData.authorizationIds,
                                  }
                                : EMPTY_FORM_VALUES
                        }
                        disabled={!detectionObject.userGroupRights.includes('WRITE')}
                        geometry={initialDetection.geometry}
                        tileSetUuid={tileSetSelected.uuid}
                        tileSetYear={formatDateOnly(tileSetSelected.date, 'yyyy')}
                    />
                </div>
            </div>
        </Accordion>
    );
};

export default Component;

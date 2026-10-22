import { detectionEndpoints } from '@/api/endpoints';
import Modal from '@/components/dsfr/Modal';
import {
    DetectionControlStatus,
    DetectionValidationStatus,
    detectionControlStatuses,
    detectionValidationStatusesSelectable,
} from '@/models/detection';
import { ObjectType } from '@/models/object-type';
import { useMap } from '@/store/slices/map';
import api, { ApiError } from '@/utils/api';
import { DETECTION_CONTROL_STATUSES_NAMES_MAP, DETECTION_VALIDATION_STATUSES_NAMES_MAP } from '@/utils/constants';
import { trackEvent, trackEventOnce } from '@/utils/matomo';
import { TRACKING_CATEGORIES, getErrorTrackingName } from '@/utils/tracking';
import { notifications } from '@mantine/notifications';
import { UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import React, { useId, useMemo, useState } from 'react';
import classes from './index.module.scss';

const NO_EDIT_TEXT = 'Ne pas éditer';
const MUTATION_KEY = [detectionEndpoints.multiple];

type TrackingSource = 'Carte' | 'Tableau';

interface FormValues {
    objectTypeUuid: string | null;
    detectionValidationStatus: DetectionValidationStatus | null;
    detectionControlStatus: DetectionControlStatus | null;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const INITIAL_VALUES: FormValues = {
    objectTypeUuid: null,
    detectionValidationStatus: null,
    detectionControlStatus: null,
};

const postForm = async (values: FormValues, detectionsUuids: string[]) => {
    const postValues: Record<string, string | string[]> = {
        uuids: detectionsUuids,
    };

    if (values.objectTypeUuid) {
        postValues.objectTypeUuid = values.objectTypeUuid;
    }

    if (values.detectionControlStatus) {
        postValues.detectionControlStatus = values.detectionControlStatus;
    }

    if (values.detectionValidationStatus) {
        postValues.detectionValidationStatus = values.detectionValidationStatus;
    }

    await api(detectionEndpoints.multiple, { method: 'POST', body: postValues });
};

// The API answers a field error as a list of messages under the field's name.
const getFieldErrors = (body: unknown): FormErrors => {
    if (!body || typeof body !== 'object') {
        return {};
    }

    return (Object.keys(INITIAL_VALUES) as (keyof FormValues)[]).reduce<FormErrors>((errors, field) => {
        const message = (body as Record<string, unknown>)[field];
        const text = Array.isArray(message) ? message.join(' ') : message;

        return typeof text === 'string' && text ? { ...errors, [field]: text } : errors;
    }, {});
};

const getDetectionsCountText = (count: number) => `${count} détection${count > 1 ? 's' : ''}`;

interface SelectFieldProps<T extends string> {
    label: string;
    value: T | null;
    options: { value: T; label: string }[];
    error?: string;
    onChange: (value: T | null) => void;
}

const SelectField = <T extends string>({ label, value, options, error, onChange }: SelectFieldProps<T>) => {
    const id = `edit-multiple-${useId()}`;

    return (
        <div className={clsx('fr-select-group', error && 'fr-select-group--error', classes.field)}>
            <label className="fr-label" htmlFor={id}>
                {label}
            </label>
            <select
                className="fr-select"
                id={id}
                value={value ?? ''}
                aria-describedby={error ? `${id}-error` : undefined}
                onChange={(event) => onChange((event.currentTarget.value as T) || null)}
            >
                <option value="">{NO_EDIT_TEXT}</option>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
            {error ? (
                <p id={`${id}-error`} className="fr-error-text">
                    {error}
                </p>
            ) : null}
        </div>
    );
};

interface FormProps {
    formId: string;
    objectTypes: ObjectType[];
    detectionsUuids: string[];
    hide: (dataUpdated?: boolean) => void;
    trackingSource?: TrackingSource;
    onPendingChange: (pending: boolean) => void;
    onDirtyChange: (dirty: boolean) => void;
}

const Form: React.FC<FormProps> = ({
    formId,
    objectTypes,
    detectionsUuids,
    hide,
    trackingSource,
    onPendingChange,
    onDirtyChange,
}) => {
    const { eventEmitter } = useMap();
    const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
    const [errors, setErrors] = useState<FormErrors>({});
    // in the modal: a notification would open under it, the modal being in the top layer
    const [submitError, setSubmitError] = useState<string | null>(null);
    const objectTypesMap: Record<string, ObjectType> = useMemo(() => {
        return (objectTypes || []).reduce(
            (prev, curr) => ({
                ...prev,
                [curr.uuid]: curr,
            }),
            {},
        );
    }, [objectTypes]);

    const mutation: UseMutationResult<void, ApiError, FormValues> = useMutation({
        mutationKey: MUTATION_KEY,
        mutationFn: (values: FormValues) => postForm(values, detectionsUuids),
        onMutate: () => {
            setSubmitError(null);
            onPendingChange(true);
        },
        onSettled: () => onPendingChange(false),
        onSuccess: (_data, values) => {
            // one event per field set: those left on 'Ne pas éditer' are not sent
            if (trackingSource) {
                [
                    values.detectionValidationStatus && `Validation : ${values.detectionValidationStatus}`,
                    values.detectionControlStatus && `Contrôle : ${values.detectionControlStatus}`,
                    values.objectTypeUuid && `Type : ${objectTypesMap[values.objectTypeUuid]?.name ?? 'Inconnu'}`,
                ]
                    .filter((name): name is string => !!name)
                    .forEach((name) =>
                        trackEvent(
                            TRACKING_CATEGORIES.bulkEdit,
                            'Modification enregistrée',
                            name,
                            detectionsUuids.length,
                        ),
                    );
            }

            eventEmitter.emit('UPDATE_DETECTIONS');
            notifications.show({
                title: 'Edition multiple',
                message: 'Les détections ont été modifiés avec succès',
            });
            hide(true);
        },
        onError: (error) => {
            if (trackingSource) {
                trackEventOnce(
                    TRACKING_CATEGORIES.bulkEdit,
                    'Enregistrement échoué',
                    getErrorTrackingName(error),
                    detectionsUuids.length,
                );
            }

            setErrors(getFieldErrors(error.body));

            // also for a network failure, which has no body
            setSubmitError(
                ((error.body as Record<string, string>)?.detail as string) ||
                    "Les détections n'ont pas été modifiées, veuillez réessayer.",
            );
        },
    });

    const setValue = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
        const next = { ...values, [field]: value };

        setValues(next);
        setErrors((previous) => {
            const nextErrors = { ...previous };
            delete nextErrors[field];
            return nextErrors;
        });
        onDirtyChange(Object.values(next).some((nextValue) => nextValue !== null));
    };

    return (
        <form
            id={formId}
            className={clsx('compact', classes.form)}
            onSubmit={(event) => {
                event.preventDefault();
                mutation.mutate(values);
            }}
        >
            <div className="fr-alert fr-alert--info fr-alert--sm">
                <p>Vous êtes sur le point d’éditer {getDetectionsCountText(detectionsUuids.length)}.</p>
            </div>

            {submitError ? (
                <div className="fr-alert fr-alert--error fr-alert--sm" role="alert">
                    <p>Une erreur est survenue lors de l’édition multiple : {submitError}</p>
                </div>
            ) : null}

            <SelectField
                label="Type d’objet"
                value={values.objectTypeUuid}
                options={objectTypes.map(({ uuid, name }) => ({ value: uuid, label: name }))}
                error={errors.objectTypeUuid}
                onChange={(value) => setValue('objectTypeUuid', value)}
            />
            <SelectField
                label="État de conformité"
                value={values.detectionValidationStatus}
                options={detectionValidationStatusesSelectable.map((status) => ({
                    value: status,
                    label: DETECTION_VALIDATION_STATUSES_NAMES_MAP[status],
                }))}
                error={errors.detectionValidationStatus}
                onChange={(value) => setValue('detectionValidationStatus', value)}
            />
            <SelectField
                label="Statut du contrôle"
                value={values.detectionControlStatus}
                options={detectionControlStatuses.map((status) => ({
                    value: status,
                    label: DETECTION_CONTROL_STATUSES_NAMES_MAP[status],
                }))}
                error={errors.detectionControlStatus}
                onChange={(value) => setValue('detectionControlStatus', value)}
            />
        </form>
    );
};

interface OpenedModalProps {
    hide: (dataUpdated?: boolean) => void;
    detectionsUuids: string[];
    trackingSource?: TrackingSource;
}

// mounted for each opening, so the form and its buttons always start blank
const OpenedModal: React.FC<OpenedModalProps> = ({ detectionsUuids, hide, trackingSource }) => {
    const { objectTypes } = useMap();
    const queryClient = useQueryClient();
    const formId = `edit-multiple-${useId()}`;
    const [pending, setPending] = useState(false);
    const [dirty, setDirty] = useState(false);

    // 'Annuler', « Fermer », Escape or a click outside: the parents' hide also runs after a save
    const cancel = () => {
        // closed while the save is in flight: that save still lands and sends its own outcome
        if (trackingSource && !queryClient.isMutating({ mutationKey: MUTATION_KEY })) {
            trackEvent(TRACKING_CATEGORIES.bulkEdit, 'Formulaire annulé', trackingSource, detectionsUuids.length);
        }

        hide();
    };

    return (
        <Modal
            opened
            gutters
            bodyClassName={classes.body}
            onClose={cancel}
            title={
                <>
                    <span className="fr-icon-arrow-right-line fr-icon--lg" aria-hidden="true" /> Édition multiple
                </>
            }
            footer={
                <div className={classes.actions}>
                    <button type="button" className="fr-btn fr-btn--secondary" onClick={cancel}>
                        Annuler
                    </button>
                    <button type="submit" form={formId} className="fr-btn" disabled={pending || !dirty}>
                        Editer {getDetectionsCountText(detectionsUuids.length)}
                    </button>
                </div>
            }
        >
            {objectTypes ? (
                <Form
                    formId={formId}
                    objectTypes={objectTypes}
                    detectionsUuids={detectionsUuids}
                    hide={hide}
                    trackingSource={trackingSource}
                    onPendingChange={setPending}
                    onDirtyChange={setDirty}
                />
            ) : (
                <p>Chargement...</p>
            )}
        </Modal>
    );
};

interface ComponentProps {
    isShowed: boolean;
    hide: (dataUpdated?: boolean) => void;
    detectionsUuids?: string[];
    // where the modal is opened from; no event is sent without it
    trackingSource?: TrackingSource;
}

const Component: React.FC<ComponentProps> = ({ isShowed, detectionsUuids, hide, trackingSource }) =>
    isShowed && detectionsUuids ? (
        <OpenedModal detectionsUuids={detectionsUuids} hide={hide} trackingSource={trackingSource} />
    ) : null;

export default Component;

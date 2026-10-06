import { detectionEndpoints } from '@/api/endpoints';
import InfoCard from '@/components/ui/InfoCard';
import Loader from '@/components/ui/Loader';
import SelectItem from '@/components/ui/SelectItem';
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
import { Button, Modal, Select } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconSelectAll } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import classes from './index.module.scss';

const NO_EDIT_TEXT = 'Ne pas éditer';
const MUTATION_KEY = [detectionEndpoints.multiple];

type TrackingSource = 'Carte' | 'Tableau';

type DetectionControlStatusNullable = DetectionControlStatus | null;
type DetectionValidationStatusNullable = DetectionValidationStatus | null;
type ObjectTypeUuidNullable = string | null;

interface FormValues {
    objectTypeUuid: ObjectTypeUuidNullable;
    detectionControlStatus: DetectionControlStatusNullable;
    detectionValidationStatus: DetectionValidationStatusNullable;
}

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

interface FormProps {
    objectTypes: ObjectType[];
    detectionsUuids: string[];
    hide: (dataUpdated?: boolean) => void;
    cancel: () => void;
    trackingSource?: TrackingSource;
}

const Form: React.FC<FormProps> = ({ objectTypes, detectionsUuids, hide, cancel, trackingSource }) => {
    const { eventEmitter } = useMap();
    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            objectTypeUuid: null as ObjectTypeUuidNullable,
            detectionControlStatus: null as DetectionControlStatusNullable,
            detectionValidationStatus: null as DetectionValidationStatusNullable,
        },
    });
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

            if (error.body) {
                // @ts-expect-error types do not match
                form.setErrors(error.body);
            }

            // also for a network failure, which has no body
            notifications.show({
                color: 'red',
                title: "Une erreur est survenue lors de l'édition multiple",
                message:
                    ((error.body as Record<string, string>)?.detail as string) ||
                    "Les détections n'ont pas été modifiées, veuillez réessayer.",
            });
        },
    });

    const handleSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    return (
        <form onSubmit={form.onSubmit(handleSubmit)} className={clsx('compact', classes.form)}>
            <InfoCard withCloseButton={false}>
                Vous êtes sur le point d&apos;éditer {detectionsUuids.length} détections
            </InfoCard>
            <Select
                label="Type d'objet"
                data={objectTypes.map((type) => ({
                    value: type.uuid,
                    label: type.name,
                }))}
                renderOption={(item) => <SelectItem item={item} color={objectTypesMap[item.option.value].color} />}
                clearable
                placeholder={NO_EDIT_TEXT}
                key={form.key('objectTypeUuid')}
                {...form.getInputProps('objectTypeUuid')}
            />

            <Select
                allowDeselect={false}
                mt="md"
                label="Statut du contrôle"
                data={detectionControlStatuses.map((status) => ({
                    value: status,
                    label: DETECTION_CONTROL_STATUSES_NAMES_MAP[status],
                }))}
                clearable
                placeholder={NO_EDIT_TEXT}
                key={form.key('detectionControlStatus')}
                {...form.getInputProps('detectionControlStatus')}
            />

            <Select
                allowDeselect={false}
                mt="md"
                label="Statut de validation"
                data={detectionValidationStatusesSelectable.map((status) => ({
                    value: status,
                    label: DETECTION_VALIDATION_STATUSES_NAMES_MAP[status],
                }))}
                clearable
                placeholder={NO_EDIT_TEXT}
                key={form.key('detectionValidationStatus')}
                {...form.getInputProps('detectionValidationStatus')}
            />

            <div className="form-actions">
                <Button type="button" variant="outline" onClick={cancel}>
                    Annuler
                </Button>

                <Button
                    type="submit"
                    leftSection={<IconSelectAll />}
                    disabled={mutation.status === 'pending' || !form.isDirty()}
                >
                    Editer les détections
                </Button>
            </div>
        </form>
    );
};

interface ComponentProps {
    isShowed: boolean;
    hide: (dataUpdated?: boolean) => void;
    detectionsUuids?: string[];
    // where the modal is opened from; no event is sent without it
    trackingSource?: TrackingSource;
}
const Component: React.FC<ComponentProps> = ({ isShowed, detectionsUuids, hide, trackingSource }) => {
    const { objectTypes, layers } = useMap();
    const queryClient = useQueryClient();

    if (!isShowed || !detectionsUuids) {
        return null;
    }

    if (!layers) {
        return <Loader />;
    }

    // 'Annuler', the X, Escape or a click outside: the parents' hide also runs after a save
    const cancel = () => {
        // closed while the save is in flight: that save still lands and sends its own outcome
        if (trackingSource && !queryClient.isMutating({ mutationKey: MUTATION_KEY })) {
            trackEvent(TRACKING_CATEGORIES.bulkEdit, 'Formulaire annulé', trackingSource, detectionsUuids.length);
        }

        hide();
    };

    return (
        <Modal opened={isShowed} onClose={cancel} title="Edition multiple">
            {objectTypes ? (
                <Form
                    objectTypes={objectTypes}
                    detectionsUuids={detectionsUuids}
                    hide={hide}
                    cancel={cancel}
                    trackingSource={trackingSource}
                />
            ) : (
                <Loader />
            )}
        </Modal>
    );
};

export default Component;

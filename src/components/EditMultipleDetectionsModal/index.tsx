import { DETECTION_MULTIPLE_POST_ENDPOINT } from '@/api-endpoints';
import InfoCard from '@/components/ui/InfoCard';
import Loader from '@/components/ui/Loader';
import SelectItem from '@/components/ui/SelectItem';
import {
    DetectionControlStatus,
    DetectionValidationStatus,
    detectionControlStatuses,
    detectionValidationStatuses,
} from '@/models/detection';
import { ObjectType } from '@/models/object-type';
import api from '@/utils/api';
import { DETECTION_CONTROL_STATUSES_NAMES_MAP, DETECTION_VALIDATION_STATUSES_NAMES_MAP } from '@/utils/constants';
import { useMap } from '@/utils/context/map-context';
import { Button, Modal, Select } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconSelectAll } from '@tabler/icons-react';
import { UseMutationResult, useMutation } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import clsx from 'clsx';
import React, { useMemo } from 'react';
import classes from './index.module.scss';

const NO_EDIT_TEXT = 'Ne pas éditer';

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

    await api.post(DETECTION_MULTIPLE_POST_ENDPOINT, postValues);
};

interface FormProps {
    objectTypes: ObjectType[];
    detectionsUuids: string[];
    hide: (dataUpdated?: boolean) => void;
}

const Form: React.FC<FormProps> = ({ objectTypes, detectionsUuids, hide }) => {
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

    const mutation: UseMutationResult<void, AxiosError, FormValues> = useMutation({
        mutationFn: (values: FormValues) => postForm(values, detectionsUuids),
        onSuccess: () => {
            eventEmitter.emit('UPDATE_DETECTIONS');
            notifications.show({
                title: 'Edition multiple',
                message: 'Les détections ont été modifiés avec succès',
            });
            hide(true);
        },
        onError: (error) => {
            if (error.response?.data) {
                // @ts-expect-error types do not match
                form.setErrors(error.response?.data);
                notifications.show({
                    color: 'red',
                    title: "Une erreur est survenue lors de l'édition multiple",
                    message: ((error.response?.data as Record<string, string>)?.detail as string) || '',
                });
            }
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
                data={detectionValidationStatuses.map((status) => ({
                    value: status,
                    label: DETECTION_VALIDATION_STATUSES_NAMES_MAP[status],
                }))}
                clearable
                placeholder={NO_EDIT_TEXT}
                key={form.key('detectionValidationStatus')}
                {...form.getInputProps('detectionValidationStatus')}
            />

            <div className="form-actions">
                <Button type="button" variant="outline" onClick={() => hide()}>
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
}
const Component: React.FC<ComponentProps> = ({ isShowed, detectionsUuids, hide }) => {
    const { objectTypes, layers } = useMap();

    if (!isShowed || !detectionsUuids) {
        return null;
    }

    if (!layers) {
        return <Loader />;
    }

    return (
        <Modal opened={isShowed} onClose={hide} title="Edition multiple">
            {objectTypes ? (
                <Form objectTypes={objectTypes} detectionsUuids={detectionsUuids} hide={hide} />
            ) : (
                <Loader />
            )}
        </Modal>
    );
};

export default Component;

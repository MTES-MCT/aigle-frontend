import { detectionObjectEndpoints } from '@/api/endpoints';
import SelectItem from '@/components/ui/SelectItem';
import { DetectionObjectDetail } from '@/models/detection-object';
import { ObjectType } from '@/models/object-type';
import { useMap } from '@/store/slices/map';
import api from '@/utils/api';
import { Button, Loader as MantineLoader, Select, Textarea } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconMessage } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import React, { useMemo, useRef, useState } from 'react';
import classes from './index.module.scss';

interface FormValues {
    objectTypeUuid: string;
    comment: string;
}

const postForm = async (detectionUuid: string, values: FormValues) => {
    await api.patch(detectionObjectEndpoints.detail(detectionUuid), values);
};

interface ComponentProps {
    detectionObject: DetectionObjectDetail;
}
const Component: React.FC<ComponentProps> = ({ detectionObject }) => {
    const { objectTypes, eventEmitter } = useMap();
    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            objectTypeUuid: detectionObject.objectType.uuid,
            comment: detectionObject.comment || '',
        },
    });
    const debounceRef = useRef<NodeJS.Timeout | null>(null);

    const [commentInputShowed, setCommentInputShowed] = useState(false);

    form.watch('objectTypeUuid', () => {
        const formValues = form.getValues();
        handleSubmit(formValues);
    });
    form.watch('comment', () => {
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
            const formValues = form.getValues();
            handleSubmit(formValues);
        }, 300);
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

    const queryClient = useQueryClient();

    const mutation: UseMutationResult<void, AxiosError, FormValues> = useMutation({
        mutationFn: (values: FormValues) => postForm(detectionObject.uuid, values),
        onSuccess: () => {
            queryClient.setQueryData(
                [detectionObjectEndpoints.detail(detectionObject.uuid)],
                (prev: DetectionObjectDetail) => {
                    const objectTypeUuid = form.getValues().objectTypeUuid;
                    const objectType = (objectTypes || []).find((ot) => ot.uuid === objectTypeUuid);

                    if (!objectType) {
                        return prev;
                    }

                    return {
                        ...prev,
                        objectType,
                    };
                },
            );
            eventEmitter.emit('UPDATE_DETECTIONS');
            eventEmitter.emit('UPDATE_DETECTION_DETAIL');
            notifications.show({
                title: 'Mise à jour de la détection',
                message: `L'objet #${detectionObject.id} a été mise à jour avec succès.`,
            });
        },
        onError: (error) => {
            if (error.response?.data) {
                // @ts-expect-error types do not match
                form.setErrors(error.response?.data);
                notifications.show({
                    color: 'red',
                    title: 'Erreur',
                    message: "Une erreur est survenue lors de la mise à jour de l'objet",
                });
            }
        },
    });

    const handleSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    return (
        <form className={classes.container} onSubmit={form.onSubmit(handleSubmit)}>
            {objectTypes ? (
                <Select
                    allowDeselect={false}
                    label="Type d'objet"
                    renderOption={(item) => <SelectItem item={item} color={objectTypesMap[item.option.value].color} />}
                    data={objectTypes.map((type) => ({
                        value: type.uuid,
                        label: type.name,
                    }))}
                    key={form.key('objectTypeUuid')}
                    disabled={mutation.status === 'pending' || !detectionObject.userGroupRights.includes('WRITE')}
                    rightSection={mutation.status === 'pending' ? <MantineLoader size="xs" /> : null}
                    {...form.getInputProps('objectTypeUuid')}
                />
            ) : undefined}

            {commentInputShowed ? (
                <Textarea
                    label="Commentaire"
                    placeholder="Mon commentaire"
                    mt="md"
                    autoFocus
                    {...form.getInputProps('comment')}
                    key={form.key('comment')}
                />
            ) : (
                <Button
                    variant="subtle"
                    mt="md"
                    size="compact-sm"
                    onClick={() => setCommentInputShowed(true)}
                    leftSection={<IconMessage size={16} />}
                >
                    Ajouter un commentaire
                </Button>
            )}
        </form>
    );
};

export default Component;

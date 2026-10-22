import { detectionObjectEndpoints } from '@/api/endpoints';
import { useDetectionTracking } from '@/components/DetectionDetail/tracking';
import Select from '@/components/dsfr/Select';
import { DetectionObjectDetail } from '@/models/detection-object';
import { ObjectType } from '@/models/object-type';
import { useMap } from '@/store/slices/map';
import api, { ApiError } from '@/utils/api';
import { TRACKING_CATEGORIES, getErrorTrackingName } from '@/utils/tracking';
import { UseFormReturnType, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { UseMutationResult, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import React, { useId, useMemo, useRef, useState } from 'react';
import classes from './index.module.scss';

interface FormValues {
    objectTypeUuid: string;
    comment: string;
}

const postForm = async (detectionUuid: string, values: FormValues) => {
    await api(detectionObjectEndpoints.detail(detectionUuid), { method: 'PATCH', body: values });
};

// The comment saves after every pause in the typing: it is counted once per object and page load.
const commentTrackedDetectionObjectUuids = new Set<string>();

interface ComponentProps {
    detectionObject: DetectionObjectDetail;
}
const Component: React.FC<ComponentProps> = ({ detectionObject }) => {
    const { objectTypes, eventEmitter } = useMap();
    const { trackEvent, trackEventOnce } = useDetectionTracking();
    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            objectTypeUuid: detectionObject.objectType.uuid,
            comment: detectionObject.comment || '',
        },
    });
    const debounceRef = useRef<NodeJS.Timeout | null>(null);
    // the type and the comment share one PATCH: what changed is told apart from the last saved values
    const lastSavedRef = useRef({
        objectTypeUuid: detectionObject.objectType.uuid,
        objectTypeName: detectionObject.objectType.name,
        comment: detectionObject.comment || '',
    });

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

    const mutation: UseMutationResult<void, ApiError, FormValues> = useMutation({
        mutationFn: (values: FormValues) => postForm(detectionObject.uuid, values),
        onSuccess: (_data, values) => {
            const lastSaved = lastSavedRef.current;
            const objectTypeName = objectTypesMap[values.objectTypeUuid]?.name ?? 'Inconnu';

            if (values.objectTypeUuid !== lastSaved.objectTypeUuid) {
                trackEvent(
                    TRACKING_CATEGORIES.detection,
                    'Type d’objet modifié',
                    `${lastSaved.objectTypeName} → ${objectTypeName}`,
                );
            }

            if (values.comment !== lastSaved.comment && !commentTrackedDetectionObjectUuids.has(detectionObject.uuid)) {
                commentTrackedDetectionObjectUuids.add(detectionObject.uuid);
                trackEvent(
                    TRACKING_CATEGORIES.detection,
                    'Commentaire enregistré',
                    lastSaved.comment ? 'Modifié' : 'Nouveau',
                );
            }

            lastSavedRef.current = {
                objectTypeUuid: values.objectTypeUuid,
                objectTypeName,
                comment: values.comment,
            };

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
        onError: (error, values) => {
            const field =
                values.objectTypeUuid !== lastSavedRef.current.objectTypeUuid ? 'Type d’objet' : 'Commentaire';
            trackEventOnce(
                TRACKING_CATEGORIES.detection,
                'Enregistrement échoué',
                `${field} : ${getErrorTrackingName(error)}`,
            );

            if (error.body) {
                // @ts-expect-error types do not match
                form.setErrors(error.body);
            }

            // also for a network failure, which has no body
            notifications.show({
                color: 'red',
                title: 'Erreur',
                message: "Une erreur est survenue lors de la mise à jour de l'objet",
            });
        },
    });

    const handleSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    const commentId = `detection-comment-${useId()}`;
    const objectTypeColor = objectTypesMap[form.getValues().objectTypeUuid]?.color;

    return (
        <form className={classes.container} onSubmit={form.onSubmit(handleSubmit)}>
            {objectTypes ? (
                <Select
                    label={
                        <span className={classes['object-type-label']}>
                            Type d&apos;objet
                            {objectTypeColor ? (
                                <span
                                    className={classes['object-type-swatch']}
                                    // white (« Autres ») would vanish on the panel, as in the filters
                                    style={{
                                        borderColor:
                                            objectTypeColor.toUpperCase() === '#FFFFFF' ? '#E3E3E3' : objectTypeColor,
                                    }}
                                    aria-hidden="true"
                                />
                            ) : null}
                        </span>
                    }
                    options={objectTypes.map((type) => ({
                        value: type.uuid,
                        label: type.name,
                    }))}
                    value={form.getValues().objectTypeUuid}
                    error={form.errors.objectTypeUuid}
                    disabled={mutation.status === 'pending' || !detectionObject.userGroupRights.includes('WRITE')}
                    onChange={(objectTypeUuid) => form.setFieldValue('objectTypeUuid', objectTypeUuid)}
                />
            ) : undefined}

            {commentInputShowed ? (
                <div className={clsx('fr-input-group', form.errors.comment && 'fr-input-group--error')}>
                    <label className="fr-label" htmlFor={commentId}>
                        Commentaire
                    </label>
                    <textarea
                        className="fr-input"
                        id={commentId}
                        rows={3}
                        placeholder="Mon commentaire"
                        autoFocus
                        value={form.getValues().comment}
                        aria-describedby={form.errors.comment ? `${commentId}-messages` : undefined}
                        onChange={(event) => form.setFieldValue('comment', event.currentTarget.value)}
                    />
                    <div className="fr-messages-group" id={`${commentId}-messages`} aria-live="polite">
                        {form.errors.comment ? (
                            <p className="fr-message fr-message--error">{form.errors.comment}</p>
                        ) : null}
                    </div>
                </div>
            ) : (
                <button
                    type="button"
                    className={clsx(
                        'fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left fr-icon-chat-3-line',
                        classes['comment-button'],
                    )}
                    onClick={() => setCommentInputShowed(true)}
                >
                    Ajouter un commentaire
                </button>
            )}
        </form>
    );
};

export default Component;

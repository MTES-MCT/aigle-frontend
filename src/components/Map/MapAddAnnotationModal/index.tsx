import { detectionEndpoints, tileSetEndpoints } from '@/api/endpoints';
import Modal from '@/components/dsfr/Modal';
import { ObjectType } from '@/models/object-type';
import { TileSet } from '@/models/tile-set';
import { useMap } from '@/store/slices/map';
import api, { ApiError } from '@/utils/api';
import { formatDateOnly } from '@/utils/format';
import { getAddressFromPolygon } from '@/utils/geojson';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES, getErrorTrackingName, isNetworkError } from '@/utils/tracking';
import { notifications } from '@mantine/notifications';
import { UseMutationResult, useMutation, useQuery } from '@tanstack/react-query';
import { area, centroid } from '@turf/turf';
import clsx from 'clsx';
import { Feature, Point, Polygon } from 'geojson';
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import classes from './index.module.scss';

// the API's limit for a detection object comment
const COMMENT_MAX_LENGTH = 255;

interface FormValues {
    objectTypeUuid: string;
    comment: string;
}

type FormErrors = Partial<Record<keyof FormValues, string>>;

const fetchTileSet = (centroid: Feature<Point>) =>
    api<TileSet>(tileSetEndpoints.lastFromCoordinates, {
        params: {
            lat: centroid.geometry.coordinates[1],
            lng: centroid.geometry.coordinates[0],
        },
    });
const postForm = async (values: FormValues, tileSetUuid: string, polygon: Polygon, address: string | null) => {
    const comment = values.comment.trim();

    await api(detectionEndpoints.create, {
        method: 'POST',
        body: {
            detectionObject: {
                objectTypeUuid: values.objectTypeUuid,
                address,
                ...(comment ? { comment } : {}),
            },
            tileSetUuid,
            geometry: polygon,
        },
    });
};

// The API answers a field error as a list of messages, those of the object nested under `detectionObject`.
const getFieldErrors = (body: unknown): FormErrors => {
    const fields = (body as { detectionObject?: Record<string, unknown> } | null)?.detectionObject;

    if (!fields || typeof fields !== 'object') {
        return {};
    }

    return (['objectTypeUuid', 'comment'] as const).reduce<FormErrors>((errors, field) => {
        const message = fields[field];
        const text = Array.isArray(message) ? message.join(' ') : message;

        return typeof text === 'string' && text ? { ...errors, [field]: text } : errors;
    }, {});
};

interface OpenedModalProps {
    objectTypes: ObjectType[];
    polygon: Polygon;
    hide: () => void;
    onCancel: () => void;
    tracked: boolean;
}

// mounted for each drawn rectangle, so the form always starts blank
const OpenedModal: React.FC<OpenedModalProps> = ({ objectTypes, polygon, hide, onCancel, tracked }) => {
    const { eventEmitter } = useMap();
    const fieldsId = `add-object-${useId()}`;
    const formId = `${fieldsId}-form`;
    const polygonCentroid = useMemo(() => centroid(polygon), [polygon]);
    const [values, setValues] = useState<FormValues>({ objectTypeUuid: objectTypes[0].uuid, comment: '' });
    const [errors, setErrors] = useState<FormErrors>({});
    // in the modal: a notification would open under it, the modal being in the top layer
    const [submitError, setSubmitError] = useState<string | null>(null);
    const [address, setAddress] = useState<string | null | undefined>();
    useEffect(() => {
        const getAddress = async () => {
            const address = await getAddressFromPolygon(polygon);
            setAddress(address);
        };

        getAddress();
    }, [polygon]);

    const {
        isLoading: tileSetIsLoading,
        isError: tileSetIsError,
        data: tileSet,
    } = useQuery({
        queryKey: [tileSetEndpoints.lastFromCoordinates, polygonCentroid],
        queryFn: () => fetchTileSet(polygonCentroid),
        enabled: !!polygonCentroid,
    });

    // The form is mounted once per drawn rectangle, and so is this report of the no-imagery alert below.
    const noImageryTrackedRef = useRef(false);
    useEffect(() => {
        if (!tracked || noImageryTrackedRef.current || tileSet || tileSetIsLoading) {
            return;
        }

        noImageryTrackedRef.current = true;
        trackEvent(
            TRACKING_CATEGORIES.mapTools,
            'Ajout échoué',
            tileSetIsError ? 'Fond de carte : erreur' : 'Aucun fond de carte',
        );
    }, [tileSet, tileSetIsLoading, tileSetIsError]);

    const mutation: UseMutationResult<void, Error, FormValues> = useMutation({
        mutationFn: (values: FormValues) => postForm(values, tileSet?.uuid || '', polygon, address || null),
        onMutate: () => setSubmitError(null),
        onSuccess: (_, values) => {
            if (tracked) {
                trackEvent(
                    TRACKING_CATEGORIES.mapTools,
                    'Objet ajouté',
                    objectTypes.find(({ uuid }) => uuid === values.objectTypeUuid)?.name ?? 'Inconnu',
                );
            }
            eventEmitter.emit('UPDATE_DETECTIONS');
            notifications.show({
                title: "Ajout d'un objet",
                message: `L'objet a été créée avec succès`,
            });
            hide();
        },
        onError: (error) => {
            if (tracked) {
                trackEvent(TRACKING_CATEGORIES.mapTools, 'Ajout échoué', `Envoi : ${getErrorTrackingName(error)}`);
            }

            if (error instanceof ApiError && error.body) {
                setErrors(getFieldErrors(error.body));
                setSubmitError(((error.body as Record<string, string>)?.detail as string) || null);
                return;
            }

            // no answer, or one without a body: without this the submit fails silently
            setSubmitError(
                isNetworkError(error)
                    ? 'Vérifiez votre connexion internet puis réessayez'
                    : "L'objet n'a pas pu être ajouté, veuillez réessayer",
            );
        },
    });

    const setValue = <K extends keyof FormValues>(field: K, value: FormValues[K]) => {
        setValues((previous) => ({ ...previous, [field]: value }));
        setErrors((previous) => {
            const next = { ...previous };
            delete next[field];
            return next;
        });
    };

    const noTileSet = !tileSet && !tileSetIsLoading;

    return (
        <Modal
            opened
            gutters
            bodyClassName={classes.body}
            onClose={onCancel}
            title={
                <>
                    <span className="fr-icon-arrow-right-line fr-icon--lg" aria-hidden="true" /> Ajouter un objet
                </>
            }
            footer={
                noTileSet ? undefined : (
                    <div className={classes.actions}>
                        <button type="button" className="fr-btn fr-btn--secondary" onClick={onCancel}>
                            Annuler
                        </button>
                        <button
                            type="submit"
                            form={formId}
                            className="fr-btn"
                            disabled={tileSetIsLoading || mutation.status === 'pending'}
                        >
                            Ajouter cet objet
                        </button>
                    </div>
                )
            }
        >
            {noTileSet ? (
                <div className="fr-alert fr-alert--error">
                    <h2 className="fr-alert__title">Erreur lors de l&apos;ajout de la détection</h2>
                    <p>Aucun fond de carte associé à la géométrie dessiné n&apos;a été trouvé</p>
                    <p>Vos droits sont insuffisants pour ajouter une détection dans cette zone ?</p>
                    <p>Si le problème persiste, contactez les administrateurs</p>
                </div>
            ) : (
                <form
                    id={formId}
                    className={clsx('compact', classes.form)}
                    onSubmit={(event) => {
                        event.preventDefault();
                        mutation.mutate(values);
                    }}
                >
                    <div className="fr-alert fr-alert--info fr-alert--sm">
                        <p>
                            Fond de carte associé :{' '}
                            <b>
                                {!tileSetIsLoading && tileSet
                                    ? `${tileSet.name} (${formatDateOnly(tileSet.date, 'yyyy')})`
                                    : 'Chargement...'}
                            </b>
                            <br />
                            Adresse : <b>{address === undefined ? 'Chargement...' : address || 'Inconnue'}</b>
                            <br />
                            Surface : <b>{area(polygon).toFixed(2)} m²</b>
                        </p>
                    </div>

                    {submitError || mutation.status === 'error' ? (
                        <div className="fr-alert fr-alert--error fr-alert--sm" role="alert">
                            <p>
                                Une erreur est survenue lors de la création de la détection
                                {submitError ? ` : ${submitError}` : ''}
                            </p>
                        </div>
                    ) : null}

                    <div
                        className={clsx(
                            'fr-select-group',
                            errors.objectTypeUuid && 'fr-select-group--error',
                            classes.field,
                        )}
                    >
                        <label className="fr-label" htmlFor={`${fieldsId}-object-type`}>
                            Type d’objet
                        </label>
                        <select
                            className="fr-select"
                            id={`${fieldsId}-object-type`}
                            value={values.objectTypeUuid}
                            aria-describedby={errors.objectTypeUuid ? `${fieldsId}-object-type-error` : undefined}
                            onChange={(event) => setValue('objectTypeUuid', event.currentTarget.value)}
                        >
                            {objectTypes.map(({ uuid, name }) => (
                                <option key={uuid} value={uuid}>
                                    {name}
                                </option>
                            ))}
                        </select>
                        {errors.objectTypeUuid ? (
                            <p id={`${fieldsId}-object-type-error`} className="fr-error-text">
                                {errors.objectTypeUuid}
                            </p>
                        ) : null}
                    </div>

                    <div className={clsx('fr-input-group', errors.comment && 'fr-input-group--error', classes.field)}>
                        <label className="fr-label" htmlFor={`${fieldsId}-comment`}>
                            Commentaire
                        </label>
                        <textarea
                            className={clsx('fr-input', errors.comment && 'fr-input--error')}
                            id={`${fieldsId}-comment`}
                            rows={3}
                            maxLength={COMMENT_MAX_LENGTH}
                            value={values.comment}
                            aria-describedby={errors.comment ? `${fieldsId}-comment-error` : undefined}
                            onChange={(event) => setValue('comment', event.currentTarget.value)}
                        />
                        {errors.comment ? (
                            <p id={`${fieldsId}-comment-error`} className="fr-error-text">
                                {errors.comment}
                            </p>
                        ) : null}
                    </div>
                </form>
            )}
        </Modal>
    );
};

interface ComponentProps {
    isShowed: boolean;
    // after a successful submit
    hide: () => void;
    // 'Annuler', « Fermer », Escape or a click outside
    onCancel: () => void;
    polygon?: Polygon;
    tracked?: boolean;
}
const Component: React.FC<ComponentProps> = ({ isShowed, polygon, hide, onCancel, tracked = false }) => {
    const { objectTypes } = useMap();

    if (!isShowed || !polygon || !objectTypes) {
        return null;
    }

    return (
        <OpenedModal objectTypes={objectTypes} polygon={polygon} hide={hide} onCancel={onCancel} tracked={tracked} />
    );
};

export default Component;

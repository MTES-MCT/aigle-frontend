import { detectionEndpoints, tileSetEndpoints } from '@/api/endpoints';
import ErrorCard from '@/components/ui/ErrorCard';
import InfoCard from '@/components/ui/InfoCard';
import Loader from '@/components/ui/Loader';
import SelectItem from '@/components/ui/SelectItem';
import { ObjectType } from '@/models/object-type';
import { TileSet } from '@/models/tile-set';
import { useMap } from '@/store/slices/map';
import api, { ApiError } from '@/utils/api';
import { formatDateOnly } from '@/utils/format';
import { getAddressFromPolygon } from '@/utils/geojson';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES, getErrorTrackingName, isNetworkError } from '@/utils/tracking';
import { Button, Modal, Select } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconShape } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQuery } from '@tanstack/react-query';
import { area, centroid } from '@turf/turf';
import clsx from 'clsx';
import { Feature, Point, Polygon } from 'geojson';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import classes from './index.module.scss';

interface FormValues {
    objectTypeUuid: string;
}

const fetchTileSet = (centroid: Feature<Point>) =>
    api<TileSet>(tileSetEndpoints.lastFromCoordinates, {
        params: {
            lat: centroid.geometry.coordinates[1],
            lng: centroid.geometry.coordinates[0],
        },
    });
const postForm = async (values: FormValues, tileSetUuid: string, polygon: Polygon, address: string | null) => {
    await api(detectionEndpoints.create, {
        method: 'POST',
        body: {
            detectionObject: {
                objectTypeUuid: values.objectTypeUuid,
                address,
            },
            tileSetUuid,
            geometry: polygon,
        },
    });
};

interface FormProps {
    objectTypes: ObjectType[];
    polygon: Polygon;
    hide: () => void;
    onCancel: () => void;
    tracked: boolean;
}

const Form: React.FC<FormProps> = ({ objectTypes, polygon, hide, onCancel, tracked }) => {
    const { eventEmitter } = useMap();
    const polygonCentroid = useMemo(() => centroid(polygon), [polygon]);
    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            objectTypeUuid: objectTypes[0].uuid,
        },
    });
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

    // The form is mounted once per drawn rectangle, and so is this report of the no-imagery card below.
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
                form.setErrors(error.body);
                notifications.show({
                    color: 'red',
                    title: 'Une erreur est survenue lors de la création de la détection',
                    message: ((error.body as Record<string, string>)?.detail as string) || '',
                });
                return;
            }

            // no answer, or one without a body: without this the submit fails silently
            notifications.show({
                color: 'red',
                title: 'Une erreur est survenue lors de la création de la détection',
                message: isNetworkError(error)
                    ? 'Vérifiez votre connexion internet puis réessayez'
                    : "L'objet n'a pas pu être ajouté, veuillez réessayer",
            });
        },
    });

    const handleSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    const objectTypesMap: Record<string, ObjectType> = useMemo(() => {
        return (objectTypes || []).reduce(
            (prev, curr) => ({
                ...prev,
                [curr.uuid]: curr,
            }),
            {},
        );
    }, [objectTypes]);

    if (!tileSet && !tileSetIsLoading) {
        return (
            <ErrorCard title="Erreur lors de l'ajout de la détection">
                <p>Aucun fond de carte associé à la géométrie dessiné n&apos;a été trouvé</p>
                <p>Vos droits sont insuffisants pour ajouter une détection dans cette zone ?</p>
                <p>Si le problème persiste, contactez les administrateurs</p>
            </ErrorCard>
        );
    }

    return (
        <form onSubmit={form.onSubmit(handleSubmit)} className={clsx('compact', classes.form)}>
            <InfoCard title="Informations sur l'objet" withCloseButton={false}>
                <p>
                    Fond de carte associé :{' '}
                    <b>
                        {!tileSetIsLoading && tileSet
                            ? `${tileSet.name} (${formatDateOnly(tileSet.date, 'yyyy')})`
                            : 'Chargement...'}
                    </b>
                </p>
                <p>
                    Addresse : <b>{address === undefined ? 'Chargement...' : address || 'Inconnue'}</b>
                </p>
                <p>
                    Surface : <b>{area(polygon).toFixed(2)} m²</b>
                </p>
            </InfoCard>
            <Select
                allowDeselect={false}
                label="Type d'objet"
                renderOption={(item) => <SelectItem item={item} color={objectTypesMap[item.option.value].color} />}
                data={objectTypes.map((type) => ({
                    value: type.uuid,
                    label: type.name,
                }))}
                key={form.key('objectTypeUuid')}
                {...form.getInputProps('objectTypeUuid')}
            />

            <div className="form-actions">
                <Button type="button" variant="outline" onClick={onCancel}>
                    Annuler
                </Button>

                <Button
                    type="submit"
                    leftSection={<IconShape />}
                    disabled={tileSetIsLoading || mutation.status === 'pending'}
                >
                    Ajouter l&apos;objet
                </Button>
            </div>
        </form>
    );
};

interface ComponentProps {
    isShowed: boolean;
    // after a successful submit
    hide: () => void;
    // 'Annuler', the close button, Escape or a click outside
    onCancel: () => void;
    polygon?: Polygon;
    tracked?: boolean;
}
const Component: React.FC<ComponentProps> = ({ isShowed, polygon, hide, onCancel, tracked = false }) => {
    const { objectTypes } = useMap();

    if (!isShowed || !polygon) {
        return null;
    }

    return (
        <Modal opened={isShowed} onClose={onCancel} title="Ajouter un objet">
            {objectTypes ? (
                <Form objectTypes={objectTypes} polygon={polygon} hide={hide} onCancel={onCancel} tracked={tracked} />
            ) : (
                <Loader />
            )}
        </Modal>
    );
};

export default Component;

import { detectionEndpoints, tileSetEndpoints } from '@/api/endpoints';
import ErrorCard from '@/components/ui/ErrorCard';
import InfoCard from '@/components/ui/InfoCard';
import Loader from '@/components/ui/Loader';
import SelectItem from '@/components/ui/SelectItem';
import { ObjectType } from '@/models/object-type';
import { TileSet } from '@/models/tile-set';
import { useMap } from '@/store/slices/map';
import api from '@/utils/api';
import { getAddressFromPolygon } from '@/utils/geojson';
import { Button, Modal, Select } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconShape } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQuery } from '@tanstack/react-query';
import { area, centroid } from '@turf/turf';
import { AxiosError } from 'axios';
import clsx from 'clsx';
import { format } from 'date-fns';
import { Feature, Point, Polygon } from 'geojson';
import React, { useEffect, useMemo, useState } from 'react';
import classes from './index.module.scss';

interface FormValues {
    objectTypeUuid: string;
}

const fetchTileSet = async (centroid: Feature<Point>) => {
    const res = await api.get<TileSet>(tileSetEndpoints.lastFromCoordinates, {
        params: {
            lat: centroid.geometry.coordinates[1],
            lng: centroid.geometry.coordinates[0],
        },
    });
    return res.data;
};
const postForm = async (values: FormValues, tileSetUuid: string, polygon: Polygon, address: string | null) => {
    await api.post(`${detectionEndpoints.create}`, {
        detectionObject: {
            objectTypeUuid: values.objectTypeUuid,
            address,
        },
        tileSetUuid,
        geometry: polygon,
    });
};

interface FormProps {
    objectTypes: ObjectType[];
    polygon: Polygon;
    hide: () => void;
}

const Form: React.FC<FormProps> = ({ objectTypes, polygon, hide }) => {
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

    const { isLoading: tileSetIsLoading, data: tileSet } = useQuery({
        queryKey: [tileSetEndpoints.lastFromCoordinates, polygonCentroid],
        queryFn: () => fetchTileSet(polygonCentroid),
        enabled: !!polygonCentroid,
    });

    const mutation: UseMutationResult<void, AxiosError, FormValues> = useMutation({
        mutationFn: (values: FormValues) => postForm(values, tileSet?.uuid || '', polygon, address || null),
        onSuccess: () => {
            eventEmitter.emit('UPDATE_DETECTIONS');
            notifications.show({
                title: "Ajout d'un objet",
                message: `L'objet a été créée avec succès`,
            });
            hide();
        },
        onError: (error) => {
            if (error.response?.data) {
                // @ts-expect-error types do not match
                form.setErrors(error.response?.data);
                notifications.show({
                    color: 'red',
                    title: 'Une erreur est survenue lors de la création de la détection',
                    message: ((error.response?.data as Record<string, string>)?.detail as string) || '',
                });
            }
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
                <p>Auncun fond de carte associé à la géométrie dessiné n&apos;a été trouvé</p>
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
                            ? `${tileSet.name} (${format(tileSet.date, 'yyyy')})`
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
                <Button type="button" variant="outline" onClick={hide}>
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
    hide: () => void;
    polygon?: Polygon;
}
const Component: React.FC<ComponentProps> = ({ isShowed, polygon, hide }) => {
    const { objectTypes } = useMap();

    if (!isShowed || !polygon) {
        return null;
    }

    return (
        <Modal opened={isShowed} onClose={hide} title="Ajouter un objet">
            {objectTypes ? <Form objectTypes={objectTypes} polygon={polygon} hide={hide} /> : <Loader />}
        </Modal>
    );
};

export default Component;

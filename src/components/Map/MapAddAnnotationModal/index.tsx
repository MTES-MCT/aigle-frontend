import { DETECTION_POST_ENDPOINT } from '@/api-endpoints';
import InfoCard from '@/components/InfoCard';
import Loader from '@/components/ui/Loader';
import SelectItem from '@/components/ui/SelectItem';
import { MapTileSetLayer } from '@/models/map-layer';
import { ObjectType } from '@/models/object-type';
import api from '@/utils/api';
import { DEFAULT_DATE_FORMAT } from '@/utils/constants';
import { useMap } from '@/utils/context/map-context';
import { getAddressFromPolygon } from '@/utils/geojson';
import { Button, Modal, Select } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconShape } from '@tabler/icons-react';
import { UseMutationResult, useMutation } from '@tanstack/react-query';
import { area, booleanWithin, centroid } from '@turf/turf';
import { AxiosError } from 'axios';
import clsx from 'clsx';
import { format } from 'date-fns';
import { Polygon } from 'geojson';
import React, { useEffect, useMemo, useState } from 'react';
import classes from './index.module.scss';

interface FormValues {
    objectTypeUuid: string;
}

const postForm = async (values: FormValues, tileSetUuid: string, polygon: Polygon, address: string | null) => {
    await api.post(`${DETECTION_POST_ENDPOINT}`, {
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
    layers: MapTileSetLayer[];
    polygon: Polygon;
    hide: () => void;
}

const Form: React.FC<FormProps> = ({ objectTypes, layers, polygon, hide }) => {
    const { eventEmitter } = useMap();
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

    const tileSet = useMemo(() => {
        const polygonCenter = centroid(polygon);
        // get the first displayed layer that contains the annotation
        const layer = layers
            .filter((layer) => ['BACKGROUND', 'PARTIAL'].includes(layer.tileSet.tileSetType) && layer.displayed)
            .find((layer) => !layer.tileSet.geometry || booleanWithin(polygonCenter, layer.tileSet.geometry));

        if (!layer) {
            notifications.show({
                color: 'red',
                title: "Erreur lors de l'ajout de l'objet",
                message: "Assurez-vous de dessiner l'objet sur une couche visible",
            });
            hide();
            return null;
        }

        return layer.tileSet;
    }, [layers, polygon]);

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

    return (
        <form onSubmit={form.onSubmit(handleSubmit)} className={clsx('compact', classes.form)}>
            <InfoCard title="Informations sur l'objet" withCloseButton={false}>
                <p>
                    Fond de carte associé :{' '}
                    <b>
                        {tileSet ? `${tileSet.name} - ${format(tileSet.date, DEFAULT_DATE_FORMAT)}` : 'Chargement...'}
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

                <Button type="submit" leftSection={<IconShape />} disabled={mutation.status === 'pending'}>
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
    const { objectTypes, layers } = useMap();

    if (!isShowed || !polygon) {
        return null;
    }

    if (!layers) {
        return <Loader />;
    }

    return (
        <Modal opened={isShowed} onClose={hide} title="Ajouter un objet">
            {objectTypes ? (
                <Form objectTypes={objectTypes} layers={layers} polygon={polygon} hide={hide} />
            ) : (
                <Loader />
            )}
        </Modal>
    );
};

export default Component;

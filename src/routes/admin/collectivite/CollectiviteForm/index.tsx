import React, { useState } from 'react';

import { getGeoDetailEndpoint } from '@/api-endpoints';
import Map from '@/components/Map';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import { CollectivityType, GeoCollectivity, GeoCollectivityDetail, collectivityTypes } from '@/models/geo/_common';
import { MapTileSetLayer } from '@/models/map-layer';
import api from '@/utils/api';
import { COLLECTIVITY_TYPES_NAMES_MAP, TILES_URL_FALLBACK } from '@/utils/constants';
import { Button, Card, TextInput } from '@mantine/core';
import { UseFormReturnType, isNotEmpty, useForm } from '@mantine/form';
import { IconWorldPlus } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { formatISO } from 'date-fns';
import { Geometry } from 'geojson';
import { Link, useNavigate, useParams } from 'react-router-dom';

import classes from './index.module.scss';

const COLLECTIVITY_TYPE_CODE_NAME_MAP: {
    [collectivityType in CollectivityType]: string;
} = {
    region: 'Code ISO',
    department: 'Code INSEE',
    commune: 'Code INSEE',
} as const;

interface MapPreviewProps {
    name: string;
    geometry: Geometry;
}

const MapPreview: React.FC<MapPreviewProps> = ({ name, geometry }) => {
    const fakeDate = formatISO(new Date());
    const layers: MapTileSetLayer[] = [
        {
            displayed: true,
            tileSet: {
                createdAt: fakeDate,
                updatedAt: fakeDate,
                uuid: 'fake-uuid',
                date: fakeDate,
                name: name,
                url: TILES_URL_FALLBACK,
                tileSetStatus: 'VISIBLE',
                tileSetScheme: 'xyz',
                tileSetType: 'BACKGROUND',
                geometry,
            },
        },
    ];

    return (
        <Card withBorder className={classes['map-preview-container']}>
            <h2>Aperçu des limites</h2>
            <div className={classes['map-preview-content']}>
                <Map
                    displayDetections={false}
                    layers={layers}
                    displayLayersGeometry={true}
                    boundLayers={false}
                    fitBoundsFirstLayer={true}
                />
            </div>
        </Card>
    );
};

interface FormValues {
    name: string;
    code: string;
}

const postForm = async (values: FormValues, collectivityType: CollectivityType, uuid: string) => {
    const values_ = {
        name: values.name,
    };
    const response = await api.patch(getGeoDetailEndpoint(collectivityType, uuid), values_);
    return response.data;
};

interface FormProps {
    uuid: string;
    initialValues: FormValues;
    collectivityType: CollectivityType;
    geometry: Geometry;
    backUrl: string;
}

const Form: React.FC<FormProps> = ({ uuid, initialValues, collectivityType, geometry, backUrl }) => {
    const [error, setError] = useState<AxiosError>();
    const [mapPreviewShowed, setMapPreviewShowed] = useState(false);
    const navigate = useNavigate();

    const form: UseFormReturnType<FormValues> = useForm({
        mode: 'uncontrolled',
        initialValues,
        validate: {
            name: isNotEmpty("Le nom d'affichage de la collectivité est requis"),
        },
    });

    const mutation: UseMutationResult<GeoCollectivity, AxiosError, FormValues> = useMutation({
        mutationFn: (values: FormValues) => postForm(values, collectivityType, uuid),
        onSuccess: () => {
            navigate(backUrl);
        },
        onError: (error) => {
            setError(error);
            if (error.response?.data) {
                // @ts-expect-error types do not match
                form.setErrors(error.response?.data);
            }
        },
    });

    const handleSubmit = (values: FormValues) => {
        mutation.mutate(values);
    };

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <h1>Modifier {COLLECTIVITY_TYPES_NAMES_MAP[collectivityType]}</h1>
            {error ? (
                <ErrorCard>
                    <p>Voir les indications ci-dessous pour plus d&apos;info</p>
                </ErrorCard>
            ) : null}
            <TextInput
                mt="md"
                withAsterisk
                label="Nom de la collectivité"
                placeholder="Ma collectivité"
                key={form.key('name')}
                {...form.getInputProps('name')}
            />
            <TextInput
                mt="md"
                withAsterisk
                label={COLLECTIVITY_TYPE_CODE_NAME_MAP[collectivityType]}
                placeholder="12345"
                disabled
                key={form.key('code')}
                {...form.getInputProps('code')}
            />

            {mapPreviewShowed ? (
                <MapPreview name={form.getValues().name} geometry={geometry} />
            ) : (
                <Button variant="light" fullWidth mt="md" onClick={() => setMapPreviewShowed(true)}>
                    Voir l&apos;apperçu (carte)
                </Button>
            )}

            <div className="form-actions">
                <Button
                    disabled={mutation.status === 'pending'}
                    type="button"
                    variant="outline"
                    component={Link}
                    to={backUrl}
                >
                    Annuler
                </Button>

                <Button disabled={mutation.status === 'pending'} type="submit" leftSection={<IconWorldPlus />}>
                    Modifier {COLLECTIVITY_TYPES_NAMES_MAP[collectivityType]}
                </Button>
            </div>
        </form>
    );
};

interface ComponentInnerProps {
    collectivityType: CollectivityType;
    uuid: string;
    backUrl: string;
}

const ComponentInner: React.FC<ComponentInnerProps> = ({ collectivityType, uuid, backUrl }) => {
    const fetchData = async () => {
        const res = await api.get<GeoCollectivityDetail>(getGeoDetailEndpoint(collectivityType, uuid));

        return res.data;
    };

    const {
        isLoading,
        error,
        data: initialValues,
    } = useQuery({
        queryKey: [getGeoDetailEndpoint(collectivityType, String(uuid))],
        queryFn: () => fetchData(),
    });

    if (isLoading || !initialValues) {
        return <Loader />;
    }

    if (error) {
        return <ErrorCard>{error.message}</ErrorCard>;
    }

    return (
        <Form
            uuid={uuid}
            initialValues={initialValues}
            collectivityType={collectivityType}
            backUrl={backUrl}
            geometry={initialValues.geometry}
        />
    );
};

const Component: React.FC = () => {
    const { collectivityType, uuid } = useParams();
    const navigate = useNavigate();

    // @ts-expect-error types do not match
    if (!collectivityType || !collectivityTypes.includes(collectivityType) || !uuid) {
        navigate('/admin/collectivites');
        return;
    }

    const backUrl = `/admin/collectivites?collectivityType=${collectivityType}`;

    return (
        <LayoutAdminForm backText="Liste des collectivités" backUrl={backUrl}>
            <ComponentInner collectivityType={collectivityType as CollectivityType} uuid={uuid} backUrl={backUrl} />
        </LayoutAdminForm>
    );
};

export default Component;

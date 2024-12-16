import React, { useEffect, useState } from 'react';

import { TILE_SET_POST_ENDPOINT, getTileSetDetailEndpoint } from '@/api-endpoints';
import InfoCard from '@/components/InfoCard';
import Map from '@/components/Map';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import GeoCollectivitiesMultiSelects from '@/components/admin/form-fields/GeoCollectivitiesMultiSelects';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import { MapTileSetLayer } from '@/models/map-layer';
import {
    TileSet,
    TileSetDetailWithGeometry,
    TileSetScheme,
    TileSetStatus,
    TileSetType,
    tileSetSchemes,
    tileSetStatuses,
    tileSetTypes,
} from '@/models/tile-set';
import api from '@/utils/api';
import { TILE_SET_STATUSES_NAMES_MAP, TILE_SET_TYPES_NAMES_MAP } from '@/utils/constants';
import { useMap } from '@/utils/context/map-context';
import { GeoValues, geoZoneToGeoOption } from '@/utils/geojson';
import { Button, Card, Checkbox, NumberInput, Select, TextInput } from '@mantine/core';
import { DateInput } from '@mantine/dates';
import { UseFormReturnType, isNotEmpty, useForm } from '@mantine/form';
import { IconMapPlus } from '@tabler/icons-react';
import { UseMutationResult, useMutation, useQuery } from '@tanstack/react-query';
import { AxiosError, AxiosResponse } from 'axios';
import { formatISO, parse } from 'date-fns';
import { Geometry } from 'geojson';
import { Link, useNavigate, useParams } from 'react-router-dom';
import classes from './index.module.scss';

const BACK_URL = '/admin/tile-sets';

interface MapPreviewProps {
    url?: string;
    type: TileSetType;
    scheme: TileSetScheme;
    name: string;
    monochrome: boolean;
    geometry?: Geometry;
    uuid?: string;
}

const MapPreview: React.FC<MapPreviewProps> = ({ url, scheme, name, type, monochrome, geometry, uuid }) => {
    const fakeDate = formatISO(new Date());
    const layers: MapTileSetLayer[] = [
        {
            displayed: true,
            tileSet: {
                createdAt: fakeDate,
                updatedAt: fakeDate,
                uuid: uuid || 'fake-uuid',
                minZoom: null,
                maxZoom: null,
                date: fakeDate,
                name: name,
                monochrome,
                url: url || '',
                tileSetStatus: 'VISIBLE',
                tileSetScheme: scheme,
                tileSetType: type,
                geometry,
            },
        },
    ];

    return (
        <Card withBorder className={classes['map-preview-container']}>
            <h2>Aperçu du fond de carte</h2>
            <InfoCard title="Paramètres de l'aperçu">
                <p>
                    Le carré autour de la zone de limite définie la zone dans laquelle les tuiles seront chargées pour
                    l&apos;affichage de la carte
                </p>
                {uuid ? (
                    <p>Les détections associées à ce fond de carte seront affichées</p>
                ) : (
                    <p>Enregistrez ce fond de carte et retournez sur cette page pour voir les détections associées</p>
                )}
            </InfoCard>
            <div>
                {url ? (
                    <div className={classes['map-preview-content']}>
                        <Map
                            displayTileSetControls={false}
                            displayDrawControl={false}
                            displayDetections={true}
                            layers={layers}
                            displayLayersGeometry={true}
                            boundLayers={false}
                            fitBoundsFirstLayer={true}
                            skipProcessDetections={true}
                            displayLayersSelection={false}
                        />
                    </div>
                ) : (
                    <p>L&apos;aperçu du fond de carte apparaîtra ici quand un url valide sera spécifié</p>
                )}
            </div>
        </Card>
    );
};
interface FormValues {
    name: string;
    url: string;
    tileSetStatus: TileSetStatus;
    tileSetScheme: TileSetScheme;
    tileSetType: TileSetType;
    monochrome: boolean;
    minZoom: number | null;
    maxZoom: number | null;
    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
    date?: Date;
}

const postForm = async (values: FormValues, uuid?: string) => {
    let response: AxiosResponse<TileSet>;

    if (uuid) {
        response = await api.patch(getTileSetDetailEndpoint(uuid), values);
    } else {
        response = await api.post(TILE_SET_POST_ENDPOINT, values);
    }

    return response.data;
};

interface FormProps {
    uuid?: string;
    initialValues: FormValues;
    initialGeoSelectedValues?: GeoValues;
    geometry?: Geometry;
}

const Form: React.FC<FormProps> = ({ uuid, initialValues, initialGeoSelectedValues, geometry }) => {
    const [error, setError] = useState<AxiosError>();
    const navigate = useNavigate();
    const [mapPreviewProps, setMapPreviewProps] = useState<MapPreviewProps>({
        uuid,
        url: initialValues.url,
        scheme: initialValues.tileSetScheme,
        name: initialValues.name,
        type: initialValues.tileSetType,
        monochrome: initialValues.monochrome,
    });

    const form: UseFormReturnType<FormValues> = useForm({
        initialValues,
        validate: {
            name: isNotEmpty('Le nom du type est requis'),
            url: (value) => {
                try {
                    new URL(value);

                    if (
                        (!value.includes('{x}') || !value.includes('{y}') || !value.includes('{z}')) &&
                        !value.includes('{bbox-epsg-3857}')
                    ) {
                        return "L'url doit contenir {x}, {y} et {z} si c'est un raster xyz OU {bbox-epsg-3857} pour un WMS";
                    }

                    return null;
                } catch {
                    return "Le format de l'url est invalide";
                }
            },
            tileSetStatus: isNotEmpty('Le statut du fond de carte est requis'),
            tileSetScheme: isNotEmpty('Le scheme du fond de carte est requis'),
            tileSetType: isNotEmpty('Le type du fond de carte est requis'),
            maxZoom: (value) => {
                if (value === null || value === undefined) {
                    return null;
                }

                if (value <= 0) {
                    return 'Le niveau zoom max doit être positif';
                }

                const minZoom = form.getValues().minZoom;

                if (minZoom && value <= minZoom) {
                    return 'Le niveau de zoom max doit être supérieur au niveau de zoom min';
                }

                return null;
            },
            minZoom: (value) => {
                if (value === null || value === undefined) {
                    return null;
                }

                if (value <= 0) {
                    return 'Le niveau zoom min doit être positif';
                }

                const maxZoom = form.getValues().maxZoom;

                if (maxZoom && value >= maxZoom) {
                    return 'Le niveau de zoom min doit être inférieu au niveau de zoom max';
                }

                return null;
            },
        },
        validateInputOnChange: ['url'],
    });
    form.watch('url', ({ value }) =>
        setMapPreviewProps((prev) => ({
            ...prev,
            url: form.isValid('url') ? value : undefined,
        })),
    );
    form.watch('name', ({ value }) =>
        setMapPreviewProps((prev) => ({
            ...prev,
            name: value,
        })),
    );
    form.watch('tileSetScheme', ({ value }) =>
        setMapPreviewProps((prev) => ({
            ...prev,
            scheme: value,
        })),
    );
    form.watch('tileSetType', ({ value }) =>
        setMapPreviewProps((prev) => ({
            ...prev,
            type: value,
        })),
    );
    form.watch('monochrome', ({ value }) =>
        setMapPreviewProps((prev) => ({
            ...prev,
            monochrome: value,
        })),
    );

    const mutation: UseMutationResult<TileSet, AxiosError, FormValues> = useMutation({
        mutationFn: (values: FormValues) => postForm(values, uuid),
        onSuccess: () => {
            navigate(BACK_URL);
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

    const label = uuid ? 'Modifier un fond de carte' : 'Ajouter un fond de carte';

    return (
        <form onSubmit={form.onSubmit(handleSubmit)}>
            <h1>{label}</h1>
            {error ? (
                <ErrorCard>
                    <p>Voir les indications ci-dessous pour plus d&apos;info</p>
                </ErrorCard>
            ) : null}
            <TextInput
                mt="md"
                withAsterisk
                label="Nom du fond de carte"
                placeholder="Mon fond de carte"
                key={form.key('name')}
                {...form.getInputProps('name')}
            />
            <TextInput
                mt="md"
                withAsterisk
                label="URL du fond de carte"
                placeholder="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                description="Doit contenir {x}, {y} et {z} pour les coordonnées des tuiles"
                type="url"
                key={form.key('url')}
                {...form.getInputProps('url')}
            />
            <Select
                allowDeselect={false}
                label="Scheme"
                withAsterisk
                mt="md"
                mb="md"
                data={tileSetSchemes.map((scheme) => ({
                    value: scheme,
                    label: scheme,
                }))}
                key={form.key('tileSetScheme')}
                {...form.getInputProps('tileSetScheme')}
            />
            <Select
                allowDeselect={false}
                label="Type"
                withAsterisk
                mt="md"
                mb="md"
                data={tileSetTypes.map((type) => ({
                    value: type,
                    label: TILE_SET_TYPES_NAMES_MAP[type],
                }))}
                key={form.key('tileSetType')}
                {...form.getInputProps('tileSetType')}
            />
            <DateInput
                mt="md"
                withAsterisk
                label="Date du fond de carte"
                dateParser={(value: string) => parse(value, 'dd/MM/yyyy', new Date())}
                valueFormat="DD/MM/YYYY"
                placeholder="26/02/2023"
                description="La date est utilisée pour l'ordre d'affichage sur la carte"
                key={form.key('date')}
                {...form.getInputProps('date')}
            />
            <Select
                allowDeselect={false}
                label="Status"
                withAsterisk
                mt="md"
                data={tileSetStatuses.map((status) => ({
                    value: status,
                    label: TILE_SET_STATUSES_NAMES_MAP[status],
                }))}
                key={form.key('tileSetStatus')}
                {...form.getInputProps('tileSetStatus')}
            />
            <Checkbox
                checked={form.values.monochrome}
                mt="md"
                label="Monochrome"
                key={form.key('monochrome')}
                {...form.getInputProps('monochrome')}
            />
            <NumberInput
                mt="md"
                label="Zoom minimum d'affichage"
                placeholder="15"
                min={0}
                key={form.key('minZoom')}
                {...form.getInputProps('minZoom')}
            />
            <NumberInput
                mt="md"
                label="Zoom maximum d'affichage"
                placeholder="19"
                min={0}
                key={form.key('maxZoom')}
                {...form.getInputProps('maxZoom')}
            />

            <GeoCollectivitiesMultiSelects form={form} initialGeoSelectedValues={initialGeoSelectedValues} />

            <MapPreview {...mapPreviewProps} geometry={geometry} key={mapPreviewProps.scheme} />

            <div className="form-actions">
                <Button
                    disabled={mutation.status === 'pending'}
                    type="button"
                    variant="outline"
                    component={Link}
                    to={BACK_URL}
                >
                    Annuler
                </Button>

                <Button disabled={mutation.status === 'pending'} type="submit" leftSection={<IconMapPlus />}>
                    {label}
                </Button>
            </div>
        </form>
    );
};

const EMPTY_FORM_VALUES: FormValues = {
    name: '',
    url: '',
    tileSetStatus: 'VISIBLE',
    tileSetScheme: 'xyz',
    tileSetType: 'BACKGROUND',
    monochrome: false,
    minZoom: null,
    maxZoom: null,
    date: undefined,
    communesUuids: [],
    departmentsUuids: [],
    regionsUuids: [],
};

const ComponentInner: React.FC = () => {
    const { uuid } = useParams();
    const { updateObjectsFilter } = useMap();

    useEffect(() => {
        updateObjectsFilter({
            objectTypesUuids: [],
            detectionValidationStatuses: [],
            detectionControlStatuses: [],
            score: 0,
            prescripted: null,
            customZonesUuids: [],
            interfaceDrawn: 'ALL'
        });
    }, []);

    const fetchData = async () => {
        if (!uuid) {
            return;
        }

        const res = await api.get<TileSetDetailWithGeometry>(getTileSetDetailEndpoint(uuid));
        const initialValues: FormValues = {
            ...res.data,
            date: new Date(res.data.date),
            communesUuids: res.data.communes.map((commune) => commune.uuid),
            departmentsUuids: res.data.departments.map((department) => department.uuid),
            regionsUuids: res.data.regions.map((region) => region.uuid),
        };
        const initialGeoSelectedValues: GeoValues = {
            region: res.data.regions.map((region) => geoZoneToGeoOption(region)),
            department: res.data.departments.map((department) => geoZoneToGeoOption(department)),
            commune: res.data.communes.map((commune) => geoZoneToGeoOption(commune)),
        };

        return { initialValues, initialGeoSelectedValues, geometry: res.data.geometry };
    };

    const { isLoading, error, data } = useQuery({
        queryKey: [getTileSetDetailEndpoint(String(uuid))],
        enabled: !!uuid,
        queryFn: () => fetchData(),
    });

    if (isLoading) {
        return <Loader />;
    }

    if (error) {
        return <ErrorCard>{error.message}</ErrorCard>;
    }

    return (
        <Form
            uuid={uuid}
            initialValues={data?.initialValues || EMPTY_FORM_VALUES}
            initialGeoSelectedValues={data?.initialGeoSelectedValues}
            geometry={data?.geometry}
        />
    );
};

const Component: React.FC = () => {
    return (
        <LayoutAdminForm backText="Liste des fonds de carte" backUrl={BACK_URL}>
            <ComponentInner />
        </LayoutAdminForm>
    );
};

export default Component;

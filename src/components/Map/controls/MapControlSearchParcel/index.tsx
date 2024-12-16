import React, { useState } from 'react';

import {
    PARCEL_LIST_ENDPOINT,
    PARCEL_SUGGEST_NUM_PARCEL_ENDPOINT,
    PARCEL_SUGGEST_SECTION_ENDPOINT,
    getGeoListEndpoint,
} from '@/api-endpoints';
import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import { Paginated } from '@/models/data';
import { GeoCommune } from '@/models/geo/geo-commune';
import { Parcel } from '@/models/parcel';
import { SelectOption } from '@/models/ui/select-option';
import api from '@/utils/api';
import { geoZoneToGeoOption } from '@/utils/geojson';
import { useMap } from '@/utils/context/map-context';
import { Autocomplete, Button, Loader as MantineLoader } from '@mantine/core';
import { UseFormReturnType, isNotEmpty, useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconMapSearch, IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { centroid, getCoord } from '@turf/turf';
import classes from './index.module.scss';

const SEARCH_LIMIT = 10;

const searchCommune = async (q: string): Promise<SelectOption[]> => {
    const res = await api.get<Paginated<GeoCommune>>(getGeoListEndpoint('commune'), {
        params: {
            q,
            limit: SEARCH_LIMIT,
            offset: 0,
        },
    });

    return res.data.results.map((com) => geoZoneToGeoOption(com));
};

const searchParcel = async (q: string, searchType: 'SECTION' | 'NUM_PARCEL', values: FormValues): Promise<string[]> => {
    let url: string;

    const params: Record<string, string | string[]> = {
        q,
    };
    if (values.commune?.value) {
        params.communeUuids = [values.commune?.value];
    }

    if (searchType === 'SECTION') {
        url = PARCEL_SUGGEST_SECTION_ENDPOINT;

        if (values.numParcel) {
            params.numParcelQ = values.numParcel;
        }
    } else {
        url = PARCEL_SUGGEST_NUM_PARCEL_ENDPOINT;

        if (values.section) {
            params.sectionQ = values.section;
        }
    }

    const res = await api.get<string[]>(url, {
        params,
    });

    return res.data;
};

const fetchParcel = async (values: FormValues): Promise<Parcel | null> => {
    const res = await api.get<Paginated<Parcel>>(PARCEL_LIST_ENDPOINT, {
        params: {
            communeUuids: [values.commune?.value],
            section: values.section,
            numParcel: values.numParcel,
            limit: 1,
            offset: 0,
        },
    });

    if (!res.data.results.length) {
        return null;
    }

    return res.data.results[0];
};

const CONTROL_LABEL = 'Rechercher une parcelle';

interface FormValues {
    commune: SelectOption | null;
    section: string;
    numParcel: string;
}

interface ComponentInnerProps {
    setIsShowed: (state: boolean) => void;
}

const ComponentInner: React.FC<ComponentInnerProps> = ({ setIsShowed }) => {
    const { eventEmitter } = useMap();
    const form: UseFormReturnType<FormValues> = useForm({
        initialValues: {
            commune: null,
            section: '',
            numParcel: '',
        },
        validate: {
            commune: isNotEmpty('La commune est requise'),
            section: isNotEmpty('La section est requise'),
            numParcel: isNotEmpty('La parcelle est requise'),
        },
    });

    const [searchCommuneValue, setSearchCommuneValue] = useState('');
    const [debouncedSearchCommuneValue] = useDebouncedValue(searchCommuneValue, 250);

    const [searchParcelSectionValue, setSearchParcelSectionValue] = useState('');
    const [debouncedSearchParcelSectionValue] = useDebouncedValue(searchParcelSectionValue, 250);

    const [searchParcelNumParcelValue, setSearchParcelNumParcelValue] = useState('');
    const [debouncedSearchParcelNumParcelValue] = useDebouncedValue(searchParcelNumParcelValue, 250);

    const { data: communesOptions, isLoading: communesLoading } = useQuery<SelectOption[]>({
        queryKey: ['communes', debouncedSearchCommuneValue],
        enabled: !!debouncedSearchCommuneValue,
        queryFn: () => searchCommune(debouncedSearchCommuneValue),
    });

    const { data: sections, isLoading: sectionsLoading } = useQuery<string[]>({
        queryKey: ['parcelSections', debouncedSearchParcelSectionValue],
        enabled: !!debouncedSearchParcelSectionValue,
        queryFn: () => searchParcel(debouncedSearchParcelSectionValue, 'SECTION', form.getValues()),
    });

    const { data: parcelles, isLoading: parcellesLoading } = useQuery<string[]>({
        queryKey: ['parcelNumParcels', debouncedSearchParcelNumParcelValue],
        enabled: !!debouncedSearchParcelNumParcelValue,
        queryFn: () => searchParcel(debouncedSearchParcelNumParcelValue, 'NUM_PARCEL', form.getValues()),
    });

    const { isLoading: searchLoading, refetch: search } = useQuery<Parcel | null>({
        queryKey: ['parcel', ...Object.values(form.getValues())],
        enabled: false,
        queryFn: () => fetchParcel(form.getValues()),
    });

    const handleSubmit = async () => {
        const { data: parcel } = await search();

        if (!parcel) {
            notifications.show({
                color: 'red',
                title: 'Parcelle introuvable',
                message: 'Les critères de recherche ne correspondent pas à une parcelle',
            });
            return;
        }

        eventEmitter.emit('JUMP_TO', getCoord(centroid(parcel.geometry)));
        eventEmitter.emit('DISPLAY_PARCEL', parcel.geometry);
        form.setValues({
            section: '',
            numParcel: '',
        });
        setSearchParcelSectionValue('');
        setSearchParcelNumParcelValue('');
        setIsShowed(false);
    };

    return (
        <form onSubmit={form.onSubmit(handleSubmit)} className={classes.form}>
            <h2>{CONTROL_LABEL}</h2>
            <Autocomplete
                mt="md"
                label="Commune"
                error={form.errors.commune}
                placeholder="Rechercher une commune"
                data={communesOptions}
                onOptionSubmit={(value) => {
                    const option = (communesOptions || []).find((option) => option.value === value);

                    if (!option) {
                        return;
                    }

                    form.setFieldValue('commune', option);
                }}
                rightSection={communesLoading ? <MantineLoader size="xs" /> : null}
                withAsterisk
                value={searchCommuneValue}
                onChange={setSearchCommuneValue}
                filter={({ options }) => options}
            />
            <Autocomplete
                mt="md"
                label="Section"
                error={form.errors.section}
                placeholder="Rechercher une section (B, CD,...)"
                data={sections}
                onOptionSubmit={(value) => {
                    const option = (sections || []).find((option) => option === value);

                    if (!option) {
                        return;
                    }

                    form.setFieldValue('section', option);
                }}
                rightSection={sectionsLoading ? <MantineLoader size="xs" /> : null}
                withAsterisk
                value={searchParcelSectionValue}
                onChange={setSearchParcelSectionValue}
                filter={({ options }) => options}
            />
            <Autocomplete
                mt="md"
                label="Parcelle"
                error={form.errors.numParcel}
                placeholder="Rechercher une parcelle (54, 236,...)"
                data={parcelles}
                onOptionSubmit={(value) => {
                    const option = (parcelles || []).find((option) => option === value);

                    if (!option) {
                        return;
                    }

                    form.setFieldValue('numParcel', option);
                }}
                rightSection={parcellesLoading ? <MantineLoader size="xs" /> : null}
                withAsterisk
                value={searchParcelNumParcelValue}
                onChange={setSearchParcelNumParcelValue}
                filter={({ options }) => options}
            />

            <div className="form-actions">
                <Button type="button" variant="outline" onClick={() => setIsShowed(false)}>
                    Annuler
                </Button>

                <Button type="submit" leftSection={<IconSearch />} disabled={searchLoading}>
                    {CONTROL_LABEL}
                </Button>
            </div>
        </form>
    );
};

interface ComponentProps {
    isShowed: boolean;
    setIsShowed: (state: boolean) => void;
}

const Component: React.FC<ComponentProps> = ({ isShowed, setIsShowed }) => {
    return (
        <MapControlCustom
            label={CONTROL_LABEL}
            controlInner={<IconMapSearch color="#777777" />}
            contentClassName={classes.content}
            containerClassName={classes.container}
            isShowed={isShowed}
            setIsShowed={setIsShowed}
        >
            <ComponentInner setIsShowed={setIsShowed} />
        </MapControlCustom>
    );
};

export default Component;

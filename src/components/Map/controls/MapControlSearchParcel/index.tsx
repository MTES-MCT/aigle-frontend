import React, { useState } from 'react';

import { getGeoListEndpoint, parcelEndpoints } from '@/api/endpoints';
import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import SignalementPDFData from '@/components/signalement-pdf/SignalementPDFData';
import { Paginated } from '@/models/data';
import { GeoCommune } from '@/models/geo/geo-commune';
import { Parcel } from '@/models/parcel';
import { SelectOption } from '@/models/ui/select-option';
import { useMap } from '@/store/slices/map';
import api from '@/utils/api';
import { geoZoneToGeoOption } from '@/utils/geojson';
import { Autocomplete, Button, Loader as MantineLoader } from '@mantine/core';
import { UseFormReturnType, isNotEmpty, useForm } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconDownload, IconMapSearch, IconSearch } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { centroid, getCoord } from '@turf/turf';
import classes from './index.module.scss';

const SEARCH_LIMIT = 10;

const searchCommune = async (q: string, signal: AbortSignal): Promise<SelectOption[]> => {
    const res = await api.get<Paginated<GeoCommune>>(getGeoListEndpoint('commune'), {
        signal,
        params: {
            q,
            limit: SEARCH_LIMIT,
            offset: 0,
        },
    });

    return res.data.results.map((com) => geoZoneToGeoOption(com));
};

const searchParcel = async (
    q: string,
    searchType: 'SECTION' | 'NUM_PARCEL',
    values: FormValues,
    signal: AbortSignal,
): Promise<string[]> => {
    let url: string;

    const params: Record<string, string | string[]> = {
        [searchType === 'SECTION' ? 'sectionQ' : 'numParcelQ']: q,
    };
    if (values.commune?.value) {
        params.communesUuids = [values.commune?.value];
    }

    if (searchType === 'SECTION') {
        url = parcelEndpoints.suggestSection;

        if (values.numParcel) {
            params.numParcelQ = values.numParcel;
        }
    } else {
        url = parcelEndpoints.suggestNumParcel;

        if (values.section) {
            params.sectionQ = values.section;
        }
    }

    const res = await api.get<string[]>(url, {
        signal,
        params,
    });

    return res.data;
};

const fetchParcel = async (values: FormValues): Promise<Parcel | null> => {
    const res = await api.get<Paginated<Parcel>>(parcelEndpoints.list, {
        params: {
            communesUuids: [values.commune?.value],
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

    const [parcelUuid, setParcelUuid] = useState<string | null>(null);
    const [signalementPdfLoading, setSignalementPdfLoading] = useState(false);

    const { data: communesOptions, isLoading: communesLoading } = useQuery<SelectOption[]>({
        queryKey: ['communes', debouncedSearchCommuneValue],
        enabled: !!searchCommuneValue && !!debouncedSearchCommuneValue,
        queryFn: ({ signal }) => searchCommune(debouncedSearchCommuneValue, signal),
    });

    const { data: sections, isLoading: sectionsLoading } = useQuery<string[]>({
        queryKey: ['parcelSections', debouncedSearchParcelSectionValue],
        enabled: !!searchCommuneValue && !!debouncedSearchParcelSectionValue,
        queryFn: ({ signal }) => searchParcel(debouncedSearchParcelSectionValue, 'SECTION', form.getValues(), signal),
    });

    const { data: parcelles, isLoading: parcellesLoading } = useQuery<string[]>({
        queryKey: ['parcelNumParcels', debouncedSearchParcelNumParcelValue],
        enabled: !!searchParcelNumParcelValue && !!debouncedSearchParcelNumParcelValue,
        queryFn: ({ signal }) =>
            searchParcel(debouncedSearchParcelNumParcelValue, 'NUM_PARCEL', form.getValues(), signal),
    });

    const { isLoading: searchLoading, refetch: search } = useQuery<Parcel | null>({
        queryKey: ['parcel', ...Object.values(form.getValues())],
        enabled: false,
        queryFn: () => fetchParcel(form.getValues()),
    });

    const loadParcel = async () => {
        const { data: parcel } = await search();

        if (!parcel) {
            notifications.show({
                color: 'red',
                title: 'Parcelle introuvable',
                message: 'Les critères de recherche ne correspondent pas à une parcelle',
            });
            return;
        }

        setParcelUuid(parcel.uuid);
        return parcel;
    };

    const handleSubmit = async () => {
        const parcel = await loadParcel();

        if (!parcel) {
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

                <Button
                    type="submit"
                    leftSection={searchLoading ? <MantineLoader size="xs" /> : <IconSearch />}
                    disabled={searchLoading || !form.isValid()}
                >
                    {CONTROL_LABEL}
                </Button>
            </div>

            <Button
                mt="md"
                variant="transparent"
                disabled={signalementPdfLoading || searchLoading || !form.isValid()}
                fullWidth
                onClick={async () => {
                    const parcel = await loadParcel();

                    if (!parcel) {
                        return;
                    }

                    notifications.show({
                        title: 'Génération de la fiche de signalement en cours',
                        message: 'Le téléchargement se lancera dans quelques instants',
                    });
                    setSignalementPdfLoading(true);
                }}
                leftSection={signalementPdfLoading ? <MantineLoader size="xs" /> : <IconDownload size={24} />}
            >
                Fiche de signalement
            </Button>
            {signalementPdfLoading ? (
                <SignalementPDFData
                    previewParams={[
                        {
                            parcelUuid: String(parcelUuid),
                        },
                    ]}
                    onGenerationFinished={(error?: string) => {
                        if (error) {
                            notifications.show({
                                title: 'Erreur lors de la génération de la fiche de signalement',
                                message: error,
                                color: 'red',
                            });
                        }

                        setSignalementPdfLoading(false);
                    }}
                />
            ) : null}
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

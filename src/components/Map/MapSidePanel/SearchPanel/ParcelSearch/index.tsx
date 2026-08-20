import React, { useState } from 'react';

import { getGeoListEndpoint, parcelEndpoints } from '@/api/endpoints';
import Autocomplete, { AutocompleteOption } from '@/components/dsfr/Autocomplete';
import SignalementPDFData from '@/components/signalement-pdf/SignalementPDFData';
import { Paginated } from '@/models/data';
import { GeoCommune } from '@/models/geo/geo-commune';
import { Parcel } from '@/models/parcel';
import { useMap } from '@/store/slices/map';
import api from '@/utils/api';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import { centroid, getCoord } from '@turf/turf';

const SEARCH_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 250;

type ParcelSearchType = 'SECTION' | 'NUM_PARCEL';

interface FormValues {
    commune: AutocompleteOption | null;
    section: string;
    numParcel: string;
}

const EMPTY_FORM: FormValues = { commune: null, section: '', numParcel: '' };

const searchCommune = async (q: string, signal: AbortSignal): Promise<AutocompleteOption[]> => {
    const res = await api<Paginated<GeoCommune>>(getGeoListEndpoint('commune'), {
        signal,
        params: { q, limit: SEARCH_LIMIT, offset: 0 },
    });

    return res.results.map((commune) => ({
        value: commune.uuid,
        label: commune.name,
        description: commune.code,
    }));
};

// Section and parcel suggestions narrow each other: picking a section limits the parcel
// numbers offered, and the other way round.
const searchParcelPart = async (
    q: string,
    searchType: ParcelSearchType,
    values: FormValues,
    signal: AbortSignal,
): Promise<string[]> => {
    const params: Record<string, string | string[]> = {
        [searchType === 'SECTION' ? 'sectionQ' : 'numParcelQ']: q,
    };

    if (values.commune?.value) {
        params.communesUuids = [values.commune.value];
    }

    if (searchType === 'SECTION') {
        if (values.numParcel) {
            params.numParcelQ = values.numParcel;
        }

        return api<string[]>(parcelEndpoints.suggestSection, { signal, params });
    }

    if (values.section) {
        params.sectionQ = values.section;
    }

    return api<string[]>(parcelEndpoints.suggestNumParcel, { signal, params });
};

const fetchParcel = async (values: FormValues): Promise<Parcel | null> => {
    const res = await api<Paginated<Parcel>>(parcelEndpoints.list, {
        params: {
            communesUuids: [values.commune?.value],
            section: values.section,
            numParcel: values.numParcel,
            limit: 1,
            offset: 0,
        },
    });

    return res.results[0] || null;
};

const toOptions = (items?: string[]): AutocompleteOption[] =>
    (items || []).map((item) => ({ value: item, label: item }));

interface ComponentProps {
    onSearched: () => void;
}

const Component: React.FC<ComponentProps> = ({ onSearched }: ComponentProps) => {
    const { eventEmitter } = useMap();
    const [values, setValues] = useState<FormValues>(EMPTY_FORM);
    const [communeSearch, setCommuneSearch] = useState('');
    const [parcelUuid, setParcelUuid] = useState<string | null>(null);
    const [signalementPdfLoading, setSignalementPdfLoading] = useState(false);

    const [debouncedCommuneSearch] = useDebouncedValue(communeSearch, SEARCH_DEBOUNCE_MS);
    const [debouncedSection] = useDebouncedValue(values.section, SEARCH_DEBOUNCE_MS);
    const [debouncedNumParcel] = useDebouncedValue(values.numParcel, SEARCH_DEBOUNCE_MS);

    const { data: communeOptions, isFetching: communesLoading } = useQuery<AutocompleteOption[]>({
        queryKey: ['communes', debouncedCommuneSearch],
        enabled: !!debouncedCommuneSearch,
        queryFn: ({ signal }) => searchCommune(debouncedCommuneSearch, signal),
    });

    const { data: sections, isFetching: sectionsLoading } = useQuery<string[]>({
        queryKey: ['parcelSections', debouncedSection, values.commune?.value, values.numParcel],
        enabled: !!debouncedSection,
        queryFn: ({ signal }) => searchParcelPart(debouncedSection, 'SECTION', values, signal),
    });

    const { data: numParcels, isFetching: numParcelsLoading } = useQuery<string[]>({
        queryKey: ['parcelNumParcels', debouncedNumParcel, values.commune?.value, values.section],
        enabled: !!debouncedNumParcel,
        queryFn: ({ signal }) => searchParcelPart(debouncedNumParcel, 'NUM_PARCEL', values, signal),
    });

    const { isFetching: searchLoading, refetch: runSearch } = useQuery<Parcel | null>({
        queryKey: ['parcel', values.commune?.value, values.section, values.numParcel],
        enabled: false,
        queryFn: () => fetchParcel(values),
    });

    const isComplete = !!values.commune && !!values.section && !!values.numParcel;

    const loadParcel = async () => {
        const { data: parcel } = await runSearch();

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

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const parcel = await loadParcel();

        if (!parcel) {
            return;
        }

        eventEmitter.emit('JUMP_TO', getCoord(centroid(parcel.geometry)));
        eventEmitter.emit('DISPLAY_PARCEL', parcel.geometry);
        setValues((prev) => ({ ...prev, section: '', numParcel: '' }));
        onSearched();
    };

    return (
        <form onSubmit={handleSubmit}>
            <Autocomplete
                label="Commune"
                value={communeSearch}
                options={communeOptions || []}
                loading={communesLoading}
                placeholder="Rechercher une commune"
                emptyText="Aucune commune trouvée"
                onChange={(value) => {
                    setCommuneSearch(value);
                    // free text is not a commune: the search needs a resolved uuid
                    setValues((prev) => ({ ...prev, commune: null }));
                }}
                onSelect={(option) => {
                    setCommuneSearch(option.label);
                    setValues((prev) => ({ ...prev, commune: option }));
                }}
            />
            <Autocomplete
                label="Section"
                hint="Ex. B ou XY"
                value={values.section}
                options={toOptions(sections)}
                loading={sectionsLoading}
                disabled={!values.commune}
                onChange={(section) => setValues((prev) => ({ ...prev, section }))}
                onSelect={(option) => setValues((prev) => ({ ...prev, section: option.value }))}
            />
            <Autocomplete
                label="Parcelle"
                hint="Ex. 54, 236"
                value={values.numParcel}
                options={toOptions(numParcels)}
                loading={numParcelsLoading}
                disabled={!values.commune}
                onChange={(numParcel) => setValues((prev) => ({ ...prev, numParcel }))}
                onSelect={(option) => setValues((prev) => ({ ...prev, numParcel: option.value }))}
            />

            <ul className="fr-btns-group fr-btns-group--inline fr-btns-group--right fr-btns-group--inline-reverse">
                <li>
                    <button type="submit" className="fr-btn" disabled={!isComplete || searchLoading}>
                        Rechercher
                    </button>
                </li>
                <li>
                    <button
                        type="button"
                        className="fr-btn fr-btn--secondary"
                        onClick={() => {
                            setValues(EMPTY_FORM);
                            setCommuneSearch('');
                        }}
                    >
                        Effacer
                    </button>
                </li>
            </ul>

            {/* a lone fr-btn is `width: fit-content`; only a group makes it span the panel */}
            <ul className="fr-btns-group fr-btns-group--icon-left">
                <li>
                    <button
                        type="button"
                        className="fr-btn fr-btn--tertiary-no-outline fr-icon-download-line fr-btn--icon-left"
                        disabled={!isComplete || searchLoading || signalementPdfLoading}
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
                    >
                        Fiche de signalement
                    </button>
                </li>
            </ul>

            {signalementPdfLoading ? (
                <SignalementPDFData
                    previewParams={[{ parcelUuid: String(parcelUuid) }]}
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

export default Component;

import React, { useEffect, useRef, useState } from 'react';

import { getGeoListEndpoint, parcelEndpoints } from '@/api/endpoints';
import Autocomplete, { AutocompleteOption } from '@/components/dsfr/Autocomplete';
import {
    trackSignalementCancelled,
    trackSignalementDownloaded,
    trackSignalementFailed,
    trackSignalementStarted,
} from '@/components/Map/utils/tracking';
import SignalementPDFData, { SignalementFailureReason } from '@/components/signalement-pdf/SignalementPDFData';
import { Paginated } from '@/models/data';
import { GeoCommune } from '@/models/geo/geo-commune';
import { Parcel } from '@/models/parcel';
import { useAuth } from '@/store/slices/auth';
import { useMap } from '@/store/slices/map';
import { useParcelSearch } from '@/store/slices/parcel-search';
import api from '@/utils/api';
import { trackEvent } from '@/utils/matomo';
import { TRACKING_CATEGORIES } from '@/utils/tracking';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import { centroid, getCoord } from '@turf/turf';

const SEARCH_LIMIT = 10;
const SEARCH_DEBOUNCE_MS = 250;

type ParcelSearchType = 'SECTION' | 'NUM_PARCEL';

type ParcelLookupFailure = 'Introuvable' | 'Erreur';

// 'Obsolète': the form changed during the lookup, its answer no longer applies
type ParcelLookupOutcome = Parcel | ParcelLookupFailure | 'Obsolète';

const LOOKUP_FAILURE_MESSAGES: Record<ParcelLookupFailure, string> = {
    Introuvable: 'Parcelle introuvable : les critères de recherche ne correspondent pas à une parcelle',
    Erreur: "Une erreur est survenue : la parcelle n'a pas pu être recherchée, veuillez réessayer",
};

type Field = 'commune' | 'section' | 'numParcel';

interface FieldState {
    search: string;
    // only a picked suggestion is a value: typing in the field cancels it
    option: AutocompleteOption | null;
}

type FormState = Record<Field, FieldState>;

const EMPTY_FIELD: FieldState = { search: '', option: null };

const getInitialForm = (commune: AutocompleteOption | null): FormState => ({
    commune: commune ? { search: commune.label, option: commune } : EMPTY_FIELD,
    section: EMPTY_FIELD,
    numParcel: EMPTY_FIELD,
});

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
    form: FormState,
    signal: AbortSignal,
): Promise<string[]> => {
    const params: Record<string, string | string[]> = {
        [searchType === 'SECTION' ? 'sectionQ' : 'numParcelQ']: q,
    };

    if (form.commune.option) {
        params.communesUuids = [form.commune.option.value];
    }

    if (searchType === 'SECTION') {
        if (form.numParcel.option) {
            params.numParcel = form.numParcel.option.value;
        }

        return api<string[]>(parcelEndpoints.suggestSection, { signal, params });
    }

    if (form.section.option) {
        params.section = form.section.option.value;
    }

    return api<string[]>(parcelEndpoints.suggestNumParcel, { signal, params });
};

const fetchParcel = async (form: FormState): Promise<Parcel | null> => {
    const res = await api<Paginated<Parcel>>(parcelEndpoints.list, {
        params: {
            communesUuids: [form.commune.option?.value],
            section: form.section.option?.value,
            numParcel: form.numParcel.option?.value,
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
    tracked: boolean;
}

const Component: React.FC<ComponentProps> = ({ onSearched, tracked }: ComponentProps) => {
    const { eventEmitter } = useMap();
    const { userMe } = useAuth();
    const { rememberCommune, getRememberedCommune } = useParcelSearch();
    const [form, setForm] = useState<FormState>(() => getInitialForm(getRememberedCommune(userMe?.uuid)));
    const [lookupFailure, setLookupFailure] = useState<ParcelLookupFailure | null>(null);
    const [parcelUuid, setParcelUuid] = useState<string | null>(null);
    const [signalementPdfLoading, setSignalementPdfLoading] = useState(false);
    // set on the click, cleared by the first outcome: one outcome per generation
    const signalementStartedAtRef = useRef<number | null>(null);
    const trackedRef = useRef(tracked);
    trackedRef.current = tracked;
    // bumped by every form change: a lookup compares it with its own to know if it still applies
    const lookupIdRef = useRef(0);
    const mountedRef = useRef(false);

    // leaving the map unmounts the form, and the generation in progress with it
    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;

            const startedAt = signalementStartedAtRef.current;
            signalementStartedAtRef.current = null;

            if (startedAt !== null && trackedRef.current) {
                trackSignalementCancelled('Recherche parcelle', startedAt);
            }
        };
    }, []);

    const [debouncedCommuneSearch] = useDebouncedValue(form.commune.search, SEARCH_DEBOUNCE_MS);
    const [debouncedSection] = useDebouncedValue(form.section.search, SEARCH_DEBOUNCE_MS);
    const [debouncedNumParcel] = useDebouncedValue(form.numParcel.search, SEARCH_DEBOUNCE_MS);

    const { data: communeOptions, isFetching: communesLoading } = useQuery<AutocompleteOption[]>({
        queryKey: ['communes', debouncedCommuneSearch],
        enabled: !!debouncedCommuneSearch,
        queryFn: ({ signal }) => searchCommune(debouncedCommuneSearch, signal),
    });

    const { data: sections, isFetching: sectionsLoading } = useQuery<string[]>({
        queryKey: ['parcelSections', debouncedSection, form.commune.option?.value, form.numParcel.option?.value],
        enabled: !!form.commune.option && !!debouncedSection,
        queryFn: ({ signal }) => searchParcelPart(debouncedSection, 'SECTION', form, signal),
    });

    const { data: numParcels, isFetching: numParcelsLoading } = useQuery<string[]>({
        queryKey: ['parcelNumParcels', debouncedNumParcel, form.commune.option?.value, form.section.option?.value],
        enabled: !!form.commune.option && !!debouncedNumParcel,
        queryFn: ({ signal }) => searchParcelPart(debouncedNumParcel, 'NUM_PARCEL', form, signal),
    });

    const { isFetching: searchLoading, refetch: runSearch } = useQuery<Parcel | null>({
        queryKey: ['parcel', form.commune.option?.value, form.section.option?.value, form.numParcel.option?.value],
        enabled: false,
        // one attempt, offline included: the inline error shows as soon as the lookup fails
        retry: false,
        networkMode: 'always',
        queryFn: () => fetchParcel(form),
    });

    const isComplete = !!form.commune.option && !!form.section.option && !!form.numParcel.option;

    // until the debounce settles, no suggestion means "not searched yet", not "nothing found"
    const isSearching = (field: Field, debouncedSearch: string, fetching: boolean) =>
        fetching || form[field].search !== debouncedSearch;

    const setField = (field: Field, state: FieldState) => {
        lookupIdRef.current += 1;
        setLookupFailure(null);
        setForm((prev) =>
            // section and parcel are picked within a commune: they go when it changes
            field === 'commune' && state.option?.value !== prev.commune.option?.value
                ? { commune: state, section: EMPTY_FIELD, numParcel: EMPTY_FIELD }
                : { ...prev, [field]: state },
        );
    };

    const loadParcel = async (): Promise<ParcelLookupOutcome> => {
        const lookupId = ++lookupIdRef.current;
        setLookupFailure(null);

        // refetch() resolves with the result of the query key current at that time, not the fetched one
        const { data: parcel, isError } = await runSearch();

        if (lookupId !== lookupIdRef.current) {
            return 'Obsolète';
        }

        // checked first: a failed refetch keeps the data of the previous search
        if (isError) {
            setLookupFailure('Erreur');
            return 'Erreur';
        }

        if (!parcel) {
            setLookupFailure('Introuvable');
            return 'Introuvable';
        }

        setParcelUuid(parcel.uuid);

        return parcel;
    };

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        const parcel = await loadParcel();

        if (parcel === 'Obsolète') {
            return;
        }

        if (tracked) {
            trackEvent(TRACKING_CATEGORIES.map, 'Parcelle recherchée', typeof parcel === 'string' ? parcel : 'Trouvée');
        }

        if (typeof parcel === 'string') {
            return;
        }

        eventEmitter.emit('JUMP_TO', getCoord(centroid(parcel.geometry)));
        eventEmitter.emit('DISPLAY_PARCEL', parcel.geometry);
        setForm((prev) => ({ ...prev, section: EMPTY_FIELD, numParcel: EMPTY_FIELD }));
        onSearched();
    };

    return (
        <form onSubmit={handleSubmit}>
            <Autocomplete
                label="Commune"
                value={form.commune.search}
                options={communeOptions || []}
                loading={isSearching('commune', debouncedCommuneSearch, communesLoading)}
                placeholder="Rechercher une commune"
                emptyText="Aucune commune trouvée"
                onChange={(search) => setField('commune', { search, option: null })}
                onSelect={(option) => {
                    setField('commune', { search: option.label, option });

                    if (userMe) {
                        rememberCommune({ userUuid: userMe.uuid, commune: option });
                    }
                }}
            />
            <Autocomplete
                label="Section"
                hint="Ex. B ou XY"
                value={form.section.search}
                options={toOptions(sections)}
                loading={isSearching('section', debouncedSection, sectionsLoading)}
                disabled={!form.commune.option}
                emptyText="Introuvable"
                onChange={(search) => setField('section', { search, option: null })}
                onSelect={(option) => setField('section', { search: option.label, option })}
            />
            <Autocomplete
                label="Parcelle"
                hint="Ex. 54, 236"
                value={form.numParcel.search}
                options={toOptions(numParcels)}
                loading={isSearching('numParcel', debouncedNumParcel, numParcelsLoading)}
                disabled={!form.commune.option}
                emptyText="Introuvable"
                onChange={(search) => setField('numParcel', { search, option: null })}
                onSelect={(option) => setField('numParcel', { search: option.label, option })}
            />

            {lookupFailure ? (
                <div className="fr-alert fr-alert--error fr-alert--sm fr-mb-2w" role="alert">
                    <p>{LOOKUP_FAILURE_MESSAGES[lookupFailure]}</p>
                </div>
            ) : null}

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
                            lookupIdRef.current += 1;
                            setForm(getInitialForm(null));
                            setLookupFailure(null);
                            rememberCommune(undefined);
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

                            // nothing tracked yet: an unmounted form has no generation to start
                            if (parcel === 'Obsolète' || !mountedRef.current) {
                                return;
                            }

                            if (typeof parcel === 'string') {
                                if (tracked) {
                                    trackSignalementFailed(
                                        'Recherche parcelle',
                                        parcel === 'Erreur' ? 'Récupération' : 'Parcelle introuvable',
                                    );
                                }
                                return;
                            }

                            notifications.show({
                                title: 'Génération de la fiche de signalement en cours',
                                message: 'Le téléchargement se lancera dans quelques instants',
                            });
                            if (tracked) {
                                trackSignalementStarted('Recherche parcelle', 1);
                            }
                            signalementStartedAtRef.current = Date.now();
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
                    onGenerationFinished={(error?: string, failureReason?: SignalementFailureReason) => {
                        const startedAt = signalementStartedAtRef.current;
                        if (startedAt === null) {
                            return;
                        }
                        signalementStartedAtRef.current = null;

                        if (error) {
                            notifications.show({
                                title: 'Erreur lors de la génération de la fiche de signalement',
                                message: error,
                                color: 'red',
                            });
                        }

                        if (tracked) {
                            if (error) {
                                trackSignalementFailed('Recherche parcelle', failureReason);
                            } else {
                                trackSignalementDownloaded('Recherche parcelle', startedAt);
                            }
                        }

                        setSignalementPdfLoading(false);
                    }}
                />
            ) : null}
        </form>
    );
};

export default Component;

import { getGeoListEndpoint } from '@/api/endpoints';
import MultiAutocomplete from '@/components/dsfr/MultiAutocomplete';
import { Paginated } from '@/models/data';
import { CollectivityType, GeoCollectivity, collectivityTypes } from '@/models/geo/_common';
import { GeoCommune } from '@/models/geo/geo-commune';
import { GeoDepartment } from '@/models/geo/geo-department';
import { GeoEpci } from '@/models/geo/geo-epci';
import { GeoRegion } from '@/models/geo/geo-region';
import { SelectOption } from '@/models/ui/select-option';
import { useAuth } from '@/store/slices/auth';
import api from '@/utils/api';
import { GeoValues, geoZoneToGeoOption } from '@/utils/geojson';
import { UseFormReturnType } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import classes from './index.module.scss';

const GEO_COLLECTIVITIES_LIMIT = 10;

interface GeoCollectivitiesFormValues {
    regionsUuids: string[];
    departmentsUuids: string[];
    epcisUuids: string[];
    communesUuids: string[];
}

const FIELD_CONFIG: {
    [key in CollectivityType]: { label: string; placeholder: string; formKey: keyof GeoCollectivitiesFormValues };
} = {
    region: { label: 'Regions', placeholder: 'Rechercher une région', formKey: 'regionsUuids' },
    department: { label: 'Départements', placeholder: 'Rechercher un département', formKey: 'departmentsUuids' },
    epci: { label: 'EPCI', placeholder: 'Rechercher un EPCI', formKey: 'epcisUuids' },
    commune: { label: 'Communes', placeholder: 'Rechercher une commune', formKey: 'communesUuids' },
};

// Example shown in the raw-paste textarea — the code differs per level (SIREN vs INSEE).
const RAW_PLACEHOLDER: { [key in CollectivityType]: string } = {
    region: 'Codes séparés par des virgules, ex : 76,84',
    department: 'Codes séparés par des virgules, ex : 34,30',
    epci: 'Codes SIREN séparés par des virgules, ex : 243400017',
    commune: 'Codes séparés par des virgules, ex : 34172,34032',
};

const parseCodes = (raw: string): string[] =>
    Array.from(
        new Set(
            raw
                .split(',')
                .map((code) => code.trim())
                .filter(Boolean),
        ),
    );

const fetchGeoCollectivities = async <T extends GeoCollectivity>(
    collectivityType: CollectivityType,
    q: string,
    signal: AbortSignal,
): Promise<T[]> => {
    const endpoint = getGeoListEndpoint(collectivityType);
    const res = await api<Paginated<T>>(endpoint, {
        params: {
            q,
            limit: GEO_COLLECTIVITIES_LIMIT,
            offset: 0,
        },
        signal,
    });
    return res.results;
};

interface ComponentProps<T extends GeoCollectivitiesFormValues> {
    form: UseFormReturnType<T>;
    initialGeoSelectedValues?: GeoValues;
    className?: string;
    onChange?: (geoSelectedValues: GeoValues) => void;
    displayedCollectivityTypes?: Set<CollectivityType>;
    // Per collectivity type: when set, the field is disabled and the string is shown on hover.
    disabledCollectivityTypes?: Partial<Record<CollectivityType, string>>;
}

const Component = <T extends GeoCollectivitiesFormValues>({
    form,
    initialGeoSelectedValues,
    className,
    onChange,
    displayedCollectivityTypes = new Set(['region', 'department', 'epci', 'commune']),
    disabledCollectivityTypes = {},
}: ComponentProps<T>) => {
    const { userMe } = useAuth();
    // pasting raw INSEE/SIREN codes is a bulk-admin shortcut, not something regular users need
    const canPasteCodes = !!userMe?.userRole && ['ADMIN', 'SUPER_ADMIN'].includes(userMe.userRole);
    const [geoInputValues, setGeoInputValues] = useState<{
        [key in CollectivityType]: string;
    }>({
        region: '',
        department: '',
        epci: '',
        commune: '',
    });
    const [debouncedGeoInputValues] = useDebouncedValue(geoInputValues, 250);

    const { data: regions, isFetching: regionsIsLoading } = useQuery<GeoRegion[]>({
        queryKey: ['regions', debouncedGeoInputValues.region],
        enabled: !!debouncedGeoInputValues.region,
        queryFn: ({ signal }) => fetchGeoCollectivities<GeoRegion>('region', debouncedGeoInputValues.region, signal),
    });
    const { data: departments, isFetching: departmentsIsLoading } = useQuery<GeoDepartment[]>({
        queryKey: ['departments', debouncedGeoInputValues.department],
        enabled: !!debouncedGeoInputValues.department,
        queryFn: ({ signal }) =>
            fetchGeoCollectivities<GeoDepartment>('department', debouncedGeoInputValues.department, signal),
    });
    const { data: epcis, isFetching: epcisIsLoading } = useQuery<GeoEpci[]>({
        queryKey: ['epcis', debouncedGeoInputValues.epci],
        enabled: !!debouncedGeoInputValues.epci,
        queryFn: ({ signal }) => fetchGeoCollectivities<GeoEpci>('epci', debouncedGeoInputValues.epci, signal),
    });
    const { data: communes, isFetching: communesIsLoading } = useQuery<GeoCommune[]>({
        queryKey: ['communes', debouncedGeoInputValues.commune],
        enabled: !!debouncedGeoInputValues.commune,
        queryFn: ({ signal }) => fetchGeoCollectivities<GeoCommune>('commune', debouncedGeoInputValues.commune, signal),
    });

    const [geoSelectedValues, setGeoSelectedValues] = useState<GeoValues>(
        initialGeoSelectedValues || {
            region: [],
            department: [],
            epci: [],
            commune: [],
        },
    );

    // Raw mode: edit the selection as a comma-separated list of codes, per collectivity type.
    const [rawModes, setRawModes] = useState<Record<CollectivityType, boolean>>({
        region: false,
        department: false,
        epci: false,
        commune: false,
    });
    const [rawInputs, setRawInputs] = useState<Record<CollectivityType, string>>({
        region: '',
        department: '',
        epci: '',
        commune: '',
    });
    const [rawLoading, setRawLoading] = useState<Record<CollectivityType, boolean>>({
        region: false,
        department: false,
        epci: false,
        commune: false,
    });

    const geoResultsByType: { [key in CollectivityType]: GeoCollectivity[] | undefined } = {
        region: regions,
        department: departments,
        epci: epcis,
        commune: communes,
    };
    const isLoadingByType: Record<CollectivityType, boolean> = {
        region: regionsIsLoading,
        department: departmentsIsLoading,
        epci: epcisIsLoading,
        commune: communesIsLoading,
    };

    const geoOptionsByType = useMemo(
        () => ({
            region: (regions || []).map(geoZoneToGeoOption),
            department: (departments || []).map(geoZoneToGeoOption),
            epci: (epcis || []).map(geoZoneToGeoOption),
            commune: (communes || []).map(geoZoneToGeoOption),
        }),
        [regions, departments, epcis, communes],
    );

    const setSelected = (collectivityType: CollectivityType, options: SelectOption[]) => {
        const uuids = options.map((option) => option.value);
        // setFieldValue sets exactly this one field (no merge with siblings); the cast steps past
        // the generic form typing (T extends GeoCollectivitiesFormValues, so these hold string[]).
        (form.setFieldValue as (path: string, value: string[]) => void)(FIELD_CONFIG[collectivityType].formKey, uuids);
        setGeoSelectedValues((prev) => {
            const newValues = { ...prev, [collectivityType]: options };
            onChange?.(newValues);
            return newValues;
        });
    };

    const geoOnOptionSubmit = (uuid: string, collectivityType: CollectivityType, geoItems?: GeoCollectivity[]) => {
        const option = geoItems?.find((geo) => geo.uuid === uuid);

        if (!option) {
            return;
        }

        setSelected(collectivityType, [...geoSelectedValues[collectivityType], geoZoneToGeoOption(option)]);
    };

    const geoOnRemove = (uuid: string, collectivityType: CollectivityType) => {
        setSelected(
            collectivityType,
            geoSelectedValues[collectivityType].filter((geo) => geo.value !== uuid),
        );
    };

    // Resolve the current selection's uuids back to their codes (labels don't reliably carry
    // the code — e.g. items loaded from an existing record), then show them as raw text.
    const enterRawMode = async (collectivityType: CollectivityType) => {
        const uuids = geoSelectedValues[collectivityType].map((option) => option.value);
        if (uuids.length === 0) {
            setRawInputs((prev) => ({ ...prev, [collectivityType]: '' }));
            setRawModes((prev) => ({ ...prev, [collectivityType]: true }));
            return;
        }

        setRawLoading((prev) => ({ ...prev, [collectivityType]: true }));
        try {
            const res = await api<Paginated<GeoCollectivity>>(getGeoListEndpoint(collectivityType), {
                params: { uuids: uuids.join(','), limit: uuids.length },
            });
            const codeByUuid = new Map(res.results.map((geo) => [geo.uuid, geo.code]));
            const codes = uuids.map((uuid) => codeByUuid.get(uuid)).filter((code): code is string => !!code);
            setRawInputs((prev) => ({ ...prev, [collectivityType]: codes.join(',') }));
            setRawModes((prev) => ({ ...prev, [collectivityType]: true }));
        } catch {
            // Stay in normal mode so no selection is lost.
            notifications.show({
                color: 'red',
                title: 'Erreur',
                message: 'Impossible de charger les codes, veuillez réessayer.',
            });
        } finally {
            setRawLoading((prev) => ({ ...prev, [collectivityType]: false }));
        }
    };

    // Resolve the typed codes against the backend, keep the matches, toast the rejected ones.
    const applyRawMode = async (collectivityType: CollectivityType) => {
        const codes = parseCodes(rawInputs[collectivityType]);
        if (codes.length === 0) {
            setSelected(collectivityType, []);
            setRawModes((prev) => ({ ...prev, [collectivityType]: false }));
            return;
        }

        setRawLoading((prev) => ({ ...prev, [collectivityType]: true }));
        try {
            const res = await api<Paginated<GeoCollectivity>>(getGeoListEndpoint(collectivityType), {
                params: { codes: codes.join(','), limit: codes.length },
            });
            const byCode = new Map(res.results.map((geo) => [geo.code, geo]));
            const matched: SelectOption[] = [];
            const rejected: string[] = [];
            codes.forEach((code) => {
                const geo = byCode.get(code);
                if (geo) {
                    matched.push(geoZoneToGeoOption(geo));
                } else {
                    rejected.push(code);
                }
            });

            setSelected(collectivityType, matched);
            setRawModes((prev) => ({ ...prev, [collectivityType]: false }));

            const label = FIELD_CONFIG[collectivityType].label.toLowerCase();
            if (rejected.length) {
                notifications.show({
                    color: 'orange',
                    title: 'Certains codes ont été ignorés',
                    message: `${matched.length} ${label} importé(es), codes non reconnus : ${rejected.join(', ')}`,
                });
            } else {
                notifications.show({
                    color: 'green',
                    title: 'Codes importés',
                    message: `${matched.length} ${label} importé(es)`,
                });
            }
        } catch {
            // Stay in raw mode so the input is preserved and the user can retry.
            notifications.show({
                color: 'red',
                title: 'Erreur',
                message: 'Impossible de résoudre les codes, veuillez réessayer.',
            });
        } finally {
            setRawLoading((prev) => ({ ...prev, [collectivityType]: false }));
        }
    };

    const renderField = (collectivityType: CollectivityType) => {
        if (!displayedCollectivityTypes.has(collectivityType)) {
            return null;
        }

        const config = FIELD_CONFIG[collectivityType];
        const disabledReason = disabledCollectivityTypes[collectivityType];
        const isRaw = rawModes[collectivityType];
        const rawFieldId = `geo-collectivities-raw-${collectivityType}`;

        return (
            <div className={classes.field} key={collectivityType} title={disabledReason}>
                {isRaw ? (
                    <div className="fr-input-group">
                        <label className="fr-label" htmlFor={rawFieldId}>
                            {config.label}
                        </label>
                        <textarea
                            id={rawFieldId}
                            className="fr-input"
                            rows={2}
                            placeholder={RAW_PLACEHOLDER[collectivityType]}
                            disabled={!!disabledReason}
                            value={rawInputs[collectivityType]}
                            onChange={(event) =>
                                setRawInputs((prev) => ({
                                    ...prev,
                                    [collectivityType]: event.currentTarget.value,
                                }))
                            }
                        />
                    </div>
                ) : (
                    <MultiAutocomplete
                        label={config.label}
                        placeholder={config.placeholder}
                        disabled={!!disabledReason}
                        search={geoInputValues[collectivityType]}
                        options={geoOptionsByType[collectivityType]}
                        selected={geoSelectedValues[collectivityType]}
                        loading={isLoadingByType[collectivityType]}
                        emptyText="Aucun résultat"
                        onSearchChange={(value) =>
                            setGeoInputValues((prev) => ({ ...prev, [collectivityType]: value }))
                        }
                        onSelect={({ value }) =>
                            geoOnOptionSubmit(value, collectivityType, geoResultsByType[collectivityType])
                        }
                        onRemove={(value) => geoOnRemove(value, collectivityType)}
                    />
                )}

                {canPasteCodes ? (
                    <button
                        type="button"
                        className={
                            isRaw
                                ? 'fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-check-line fr-btn--icon-left'
                                : 'fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-code-s-slash-line fr-btn--icon-left'
                        }
                        disabled={!!disabledReason || rawLoading[collectivityType]}
                        onClick={() => (isRaw ? applyRawMode(collectivityType) : enterRawMode(collectivityType))}
                    >
                        {isRaw ? 'Appliquer les codes' : 'Coller des codes'}
                    </button>
                ) : null}
            </div>
        );
    };

    return <div className={className}>{collectivityTypes.map(renderField)}</div>;
};

export default Component;

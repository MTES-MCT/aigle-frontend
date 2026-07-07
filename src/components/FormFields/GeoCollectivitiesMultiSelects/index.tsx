import { getGeoListEndpoint } from '@/api/endpoints';
import { Paginated } from '@/models/data';
import { CollectivityType, GeoCollectivity, collectivityTypes } from '@/models/geo/_common';
import { GeoCommune } from '@/models/geo/geo-commune';
import { GeoDepartment } from '@/models/geo/geo-department';
import { GeoRegion } from '@/models/geo/geo-region';
import { SelectOption } from '@/models/ui/select-option';
import api from '@/utils/api';
import { GeoValues, geoZoneToGeoOption } from '@/utils/geojson';
import { ActionIcon, Box, Group, Loader as MantineLoader, MultiSelect, Text, Textarea, Tooltip } from '@mantine/core';
import { UseFormReturnType } from '@mantine/form';
import { useDebouncedValue } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { IconCode, IconListDetails } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

const GEO_COLLECTIVITIES_LIMIT = 10;

interface GeoCollectivitiesFormValues {
    regionsUuids: string[];
    departmentsUuids: string[];
    communesUuids: string[];
}

const FIELD_CONFIG: {
    [key in CollectivityType]: { label: string; placeholder: string; formKey: keyof GeoCollectivitiesFormValues };
} = {
    region: { label: 'Regions', placeholder: 'Rechercher une région', formKey: 'regionsUuids' },
    department: { label: 'Départements', placeholder: 'Rechercher un département', formKey: 'departmentsUuids' },
    commune: { label: 'Communes', placeholder: 'Rechercher une commune', formKey: 'communesUuids' },
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

const getGeoSelectedUuids = (
    geoSelectedValues: GeoValues,
): {
    [key in CollectivityType]: string[];
} => {
    return {
        region: geoSelectedValues.region.map((geo) => geo.value),
        department: geoSelectedValues.department.map((geo) => geo.value),
        commune: geoSelectedValues.commune.map((geo) => geo.value),
    };
};

const getGeoMultiSelectValues = (
    geoResults: {
        [key in CollectivityType]: GeoCollectivity[];
    },
    geoSelectedValues: GeoValues,
): {
    [key in CollectivityType]: SelectOption[];
} => {
    const geoSelectedUuids = getGeoSelectedUuids(geoSelectedValues);

    const res: {
        [key in CollectivityType]: SelectOption[];
    } = {
        region: [],
        department: [],
        commune: [],
    };

    collectivityTypes.forEach((collectivityType) => {
        res[collectivityType] = [
            ...geoSelectedValues[collectivityType],
            ...(geoResults[collectivityType] || [])
                .filter((geo) => !geoSelectedUuids[collectivityType].includes(geo.uuid))
                .map((geo) => geoZoneToGeoOption(geo)),
        ];
    });

    return res;
};

interface ComponentProps<T extends GeoCollectivitiesFormValues> {
    form: UseFormReturnType<T>;
    initialGeoSelectedValues?: GeoValues;
    className?: string;
    onChange?: (geoSelectedValues: GeoValues) => void;
    displayedCollectivityTypes?: Set<CollectivityType>;
    // Per collectivity type: when set, the field is disabled and the string is shown as a hover tooltip.
    disabledCollectivityTypes?: Partial<Record<CollectivityType, string>>;
}

const Component = <T extends GeoCollectivitiesFormValues>({
    form,
    initialGeoSelectedValues,
    className,
    onChange,
    displayedCollectivityTypes = new Set(['region', 'department', 'commune']),
    disabledCollectivityTypes = {},
}: ComponentProps<T>) => {
    const [geoInputValues, setGeoInputValues] = useState<{
        [key in CollectivityType]: string;
    }>({
        region: '',
        department: '',
        commune: '',
    });
    const [debouncedGeoInputValues] = useDebouncedValue(geoInputValues, 250);

    const { data: regions, isLoading: regionsIsLoading } = useQuery<GeoRegion[]>({
        queryKey: ['regions', debouncedGeoInputValues.region],
        enabled: !!debouncedGeoInputValues.region,
        queryFn: ({ signal }) => fetchGeoCollectivities<GeoRegion>('region', debouncedGeoInputValues.region, signal),
    });
    const { data: departments, isLoading: departmentsIsLoading } = useQuery<GeoDepartment[]>({
        queryKey: ['departments', debouncedGeoInputValues.department],
        enabled: !!debouncedGeoInputValues.department,
        queryFn: ({ signal }) =>
            fetchGeoCollectivities<GeoDepartment>('department', debouncedGeoInputValues.department, signal),
    });
    const { data: communes, isLoading: communesIsLoading } = useQuery<GeoCommune[]>({
        queryKey: ['communes', debouncedGeoInputValues.commune],
        enabled: !!debouncedGeoInputValues.commune,
        queryFn: ({ signal }) => fetchGeoCollectivities<GeoCommune>('commune', debouncedGeoInputValues.commune, signal),
    });

    const [geoSelectedValues, setGeoSelectedValues] = useState<GeoValues>(
        initialGeoSelectedValues || {
            region: [],
            department: [],
            commune: [],
        },
    );

    // Raw mode: edit the selection as a comma-separated list of codes, per collectivity type.
    const [rawModes, setRawModes] = useState<Record<CollectivityType, boolean>>({
        region: false,
        department: false,
        commune: false,
    });
    const [rawInputs, setRawInputs] = useState<Record<CollectivityType, string>>({
        region: '',
        department: '',
        commune: '',
    });
    const [rawLoading, setRawLoading] = useState<Record<CollectivityType, boolean>>({
        region: false,
        department: false,
        commune: false,
    });

    const geoResultsByType: { [key in CollectivityType]: GeoCollectivity[] | undefined } = {
        region: regions,
        department: departments,
        commune: communes,
    };
    const isLoadingByType: Record<CollectivityType, boolean> = {
        region: regionsIsLoading,
        department: departmentsIsLoading,
        commune: communesIsLoading,
    };

    const geoMultiSelectValues = useMemo(
        () =>
            getGeoMultiSelectValues(
                {
                    region: regions || [],
                    department: departments || [],
                    commune: communes || [],
                },
                geoSelectedValues,
            ),
        [regions, departments, communes, geoSelectedValues],
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

        setGeoSelectedValues((prev) => {
            const newValues = {
                ...prev,
                [collectivityType]: [...prev[collectivityType], geoZoneToGeoOption(option)],
            };
            onChange?.(newValues);
            return newValues;
        });
    };

    const geoOnRemove = (uuid: string, collectivityType: CollectivityType) => {
        setGeoSelectedValues((prev) => {
            const newValues = {
                ...prev,
                [collectivityType]: prev[collectivityType].filter((geo) => geo.value !== uuid),
            };
            onChange?.(newValues);
            return newValues;
        });
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

        return (
            <Box mt="md" key={collectivityType}>
                <Group justify="space-between" align="center" gap="xs" mb={4}>
                    <Text size="sm" fw={500}>
                        {config.label}
                    </Text>
                    <Tooltip label={isRaw ? 'Revenir au mode normal' : 'Mode brut : copier/coller des codes'} withArrow>
                        <ActionIcon
                            variant="subtle"
                            color="gray"
                            aria-label="Basculer le mode brut"
                            loading={rawLoading[collectivityType]}
                            disabled={!!disabledReason}
                            onClick={() => (isRaw ? applyRawMode(collectivityType) : enterRawMode(collectivityType))}
                        >
                            {isRaw ? <IconListDetails size={16} /> : <IconCode size={16} />}
                        </ActionIcon>
                    </Tooltip>
                </Group>

                {isRaw ? (
                    <Textarea
                        placeholder="Codes séparés par des virgules, ex : 33100,33200"
                        autosize
                        minRows={2}
                        disabled={!!disabledReason}
                        value={rawInputs[collectivityType]}
                        onChange={(event) =>
                            setRawInputs((prev) => ({
                                ...prev,
                                [collectivityType]: event.currentTarget.value,
                            }))
                        }
                    />
                ) : (
                    <Tooltip label={disabledReason ?? ''} disabled={!disabledReason} multiline w={280} withArrow>
                        <MultiSelect
                            placeholder={config.placeholder}
                            searchable
                            disabled={!!disabledReason}
                            data={geoMultiSelectValues[collectivityType]}
                            onSearchChange={(value) => {
                                setGeoInputValues((prev) => ({
                                    ...prev,
                                    [collectivityType]: value,
                                }));
                            }}
                            rightSection={isLoadingByType[collectivityType] ? <MantineLoader size="xs" /> : null}
                            hidePickedOptions={true}
                            key={form.key(config.formKey)}
                            {...form.getInputProps(config.formKey)}
                            onOptionSubmit={(uuid) =>
                                geoOnOptionSubmit(uuid, collectivityType, geoResultsByType[collectivityType])
                            }
                            onRemove={(uuid) => geoOnRemove(uuid, collectivityType)}
                            filter={({ options }) => options}
                        />
                    </Tooltip>
                )}
            </Box>
        );
    };

    return <div className={className}>{collectivityTypes.map(renderField)}</div>;
};

export default Component;

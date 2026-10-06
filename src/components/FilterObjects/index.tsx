import React, { useEffect, useMemo, useRef } from 'react';

import { getZoneLayerTrackingName } from '@/components/Map/utils/tracking';
import SelectItem from '@/components/ui/SelectItem';
import { detectionControlStatuses, detectionValidationStatusesSelectable } from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import { MapGeoCustomZoneLayer } from '@/models/map-layer';
import { ObjectType, ObjectTypeMinimal } from '@/models/object-type';
import { useMap } from '@/store/slices/map';
import {
    DETECTION_CONTROL_STATUSES_NAMES_MAP,
    DETECTION_VALIDATION_STATUSES_COLORS_MAP,
    DETECTION_VALIDATION_STATUSES_NAMES_MAP,
    OTHER_OBJECT_TYPE,
} from '@/utils/constants';
import { trackEvent } from '@/utils/matomo';
import {
    CUSTOM_PRESET_ID,
    CUSTOM_PRESET_LABEL,
    getMatchingPresetId,
    OBJECTS_FILTER_PRESETS,
} from '@/utils/objects-filter-presets';
import {
    ActionIcon,
    Badge,
    Button,
    Checkbox,
    Group,
    MultiSelect,
    Select,
    Slider,
    Stack,
    Text,
    Tooltip,
} from '@mantine/core';
import { useForm, UseFormReturnType } from '@mantine/form';
import { notifications } from '@mantine/notifications';
import { IconChecks, IconX } from '@tabler/icons-react';
import clsx from 'clsx';
import classes from './index.module.scss';

const CONTROL_LABEL = 'Filtrer les objets';

interface FormValues {
    objectTypesUuids: ObjectsFilter['objectTypesUuids'];
    detectionValidationStatuses: ObjectsFilter['detectionValidationStatuses'];
    detectionControlStatuses: ObjectsFilter['detectionControlStatuses'];
    score: ObjectsFilter['score'];
    prescripted: ObjectsFilter['prescripted'];
    interfaceDrawn: ObjectsFilter['interfaceDrawn'];
    customZonesUuids: ObjectsFilter['customZonesUuids'];
}

const formatScore = (score: number) => Math.round(score * 100);

// Each keyboard step and each click on the slider ends a change: only the value the agent settles on is sent.
const SCORE_TRACKING_DELAY_MS = 1000;

const getPrescriptedTrackingName = (prescripted: ObjectsFilter['prescripted']) => {
    if (prescripted === null) {
        return 'ALL';
    }

    return prescripted ? 'PRESCRIBED' : 'NOT_PRESCRIBED';
};

type TrackedListField = 'objectTypesUuids' | 'detectionValidationStatuses' | 'detectionControlStatuses';

interface ComponentProps {
    objectTypes: ObjectType[];
    objectsFilter: ObjectsFilter;
    mapGeoCustomZoneLayers: MapGeoCustomZoneLayer[];
    otherObjectTypesUuids: Set<string>;
    updateObjectsFilter: (objectsFilter: ObjectsFilter) => void;
    // Matomo category of the filter events: none are sent without it.
    trackingCategory?: string;
    // Called on every change the agent makes, never on a restored or programmatic one.
    onUserChange?: () => void;
}

const Component: React.FC<ComponentProps> = ({
    objectTypes,
    otherObjectTypesUuids,
    objectsFilter,
    mapGeoCustomZoneLayers,
    updateObjectsFilter,
    trackingCategory,
    onUserChange,
}) => {
    const { eventEmitter, settings } = useMap();
    const scoreTrackingRef = useRef<{ timer: ReturnType<typeof setTimeout>; from: number } | null>(null);
    const {
        objectTypesUuids,
        detectionValidationStatuses: detectionValidationStatusesFilter,
        detectionControlStatuses: detectionControlStatusesFilter,
        score,
        prescripted,
        interfaceDrawn,
        customZonesUuids,
    } = objectsFilter;

    const form: UseFormReturnType<FormValues> = useForm({
        mode: 'uncontrolled',
        initialValues: {
            objectTypesUuids,
            detectionValidationStatuses: detectionValidationStatusesFilter,
            detectionControlStatuses: detectionControlStatusesFilter,
            score,
            prescripted,
            customZonesUuids: customZonesUuids,
            interfaceDrawn,
        },
    });
    form.watch('objectTypesUuids', ({ value }) => {
        updateObjectsFilter({
            ...form.getValues(),
            objectTypesUuids: value,
        });
    });
    form.watch('detectionValidationStatuses', ({ value }) => {
        updateObjectsFilter({
            ...form.getValues(),
            detectionValidationStatuses: value,
        });
    });
    form.watch('detectionControlStatuses', ({ value }) => {
        updateObjectsFilter({
            ...form.getValues(),
            detectionControlStatuses: value,
        });
    });
    form.watch('score', ({ value }) => {
        updateObjectsFilter({
            ...form.getValues(),
            score: value,
        });
    });
    form.watch('prescripted', ({ value }) => {
        updateObjectsFilter({
            ...form.getValues(),
            prescripted: value,
        });
    });
    form.watch('customZonesUuids', ({ value }) => {
        updateObjectsFilter({
            ...form.getValues(),
            customZonesUuids: value,
        });
    });
    form.watch('interfaceDrawn', ({ value }) => {
        updateObjectsFilter({
            ...form.getValues(),
            interfaceDrawn: value,
        });
    });
    useEffect(() => {
        const updateFilters = (newFilters: ObjectsFilter) => {
            form.setValues(newFilters);
        };

        if (!eventEmitter) {
            return;
        }

        eventEmitter.on('OBJECTS_FILTER_UPDATED', (newFilters: ObjectsFilter) => updateFilters(newFilters));

        return () => {
            eventEmitter.off('OBJECTS_FILTER_UPDATED', updateFilters);
        };
    }, []);

    const objectTypesMap: Record<string, ObjectTypeMinimal> = useMemo(() => {
        return (
            objectTypes?.reduce(
                (prev, curr) => ({
                    ...prev,
                    [curr.uuid]: curr,
                }),
                {
                    [OTHER_OBJECT_TYPE.uuid]: OTHER_OBJECT_TYPE,
                },
            ) || {}
        );
    }, [objectTypes]);

    const objectTypesToDisplay: ObjectTypeMinimal[] = useMemo(() => {
        if (otherObjectTypesUuids.size == 0) {
            return objectTypes;
        }

        const objectTypesToDisplay_: ObjectTypeMinimal[] = objectTypes.filter(
            (ot) => !otherObjectTypesUuids.has(ot.uuid),
        );
        objectTypesToDisplay_.push(OTHER_OBJECT_TYPE);
        return objectTypesToDisplay_;
    }, [objectTypes, otherObjectTypesUuids]);

    const presetSelectData = useMemo(
        () => [
            ...OBJECTS_FILTER_PRESETS.map(({ id, label }) => ({ value: id, label })),
            { value: CUSTOM_PRESET_ID, label: CUSTOM_PRESET_LABEL, disabled: true },
        ],
        [],
    );
    const selectedPresetId = useMemo(() => getMatchingPresetId(objectsFilter) ?? CUSTOM_PRESET_ID, [objectsFilter]);

    useEffect(
        () => () => {
            if (scoreTrackingRef.current) {
                clearTimeout(scoreTrackingRef.current.timer);
            }
        },
        [],
    );

    const trackFilterEvent = (action: string, name: string) => {
        if (trackingCategory) {
            trackEvent(trackingCategory, action, name);
        }
    };

    const getObjectTypeTrackingName = (uuid: string) => objectTypesMap[uuid]?.name ?? 'Inconnu';

    // One event per value ticked or unticked: 'Validation : +SUSPECT', 'Contrôle : -CONTROLLED_FIELD'.
    const trackListChanges = (
        dimension: string,
        previous: string[],
        next: string[],
        getLabel: (value: string) => string = (value) => value,
    ) => {
        next.filter((value) => !previous.includes(value)).forEach((value) =>
            trackFilterEvent('Filtre modifié', `${dimension} : +${getLabel(value)}`),
        );
        previous
            .filter((value) => !next.includes(value))
            .forEach((value) => trackFilterEvent('Filtre modifié', `${dimension} : -${getLabel(value)}`));
    };

    // Diffs the agent's own change before the form takes it. Presets, url restores and 'Rendre visible' go
    // through setValues instead, so they are never counted.
    const getTrackedListInputProps = (
        field: TrackedListField,
        dimension: string,
        getLabel?: (value: string) => string,
    ) => {
        const inputProps = form.getInputProps(field);

        return {
            ...inputProps,
            onChange: (value: string[]) => {
                trackListChanges(dimension, form.getValues()[field], value, getLabel);
                onUserChange?.();
                inputProps.onChange(value);
            },
        };
    };

    const changePrescripted = (prescripted: ObjectsFilter['prescripted']) => {
        if (form.getValues().prescripted !== prescripted) {
            trackFilterEvent('Filtre modifié', `Prescription : =${getPrescriptedTrackingName(prescripted)}`);
            onUserChange?.();
        }
        form.setFieldValue('prescripted', prescripted);
    };

    const changeScore = (score: number) => {
        const previousScore = form.getValues().score;
        if (score !== previousScore) {
            onUserChange?.();
        }
        form.setFieldValue('score', score);

        if (!trackingCategory) {
            return;
        }

        const pending = scoreTrackingRef.current;
        const from = pending ? pending.from : previousScore;
        if (pending) {
            clearTimeout(pending.timer);
        }

        scoreTrackingRef.current = {
            from,
            timer: setTimeout(() => {
                scoreTrackingRef.current = null;
                if (formatScore(score) !== formatScore(from)) {
                    trackEvent(trackingCategory, 'Score modifié', String(formatScore(score)));
                }
            }, SCORE_TRACKING_DELAY_MS),
        };
    };

    const applyPreset = (presetId: string | null) => {
        const preset = OBJECTS_FILTER_PRESETS.find(({ id }) => id === presetId);
        if (!preset) {
            return;
        }
        trackFilterEvent('Filtre rapide appliqué', preset.id);
        onUserChange?.();
        form.setValues(preset.filter);
        updateObjectsFilter({ ...objectsFilter, ...preset.filter });
    };

    return (
        <form className={classes.form}>
            <h2>{CONTROL_LABEL}</h2>

            <Group gap="md" mb="md" align="center" wrap="nowrap">
                <Text className="input-label">Filtres rapides</Text>
                <Select
                    data={presetSelectData}
                    value={selectedPresetId}
                    onChange={applyPreset}
                    allowDeselect={false}
                    flex={1}
                    maw={300}
                    styles={{ input: { caretColor: 'transparent', cursor: 'pointer' } }}
                />
            </Group>

            <div className={classes['filters-container']}>
                <div className={classes['filters-section']}>
                    <Text mt="md" className="input-label">
                        Score
                    </Text>
                    <div className={classes['score-slider-value-container']}>
                        <Slider
                            className={classes['score-slider']}
                            label={formatScore}
                            min={0}
                            max={1}
                            step={0.05}
                            key={form.key('score')}
                            {...form.getInputProps('score')}
                            onChange={undefined}
                            onChangeEnd={changeScore}
                            aria-label="Changer le seuil du score"
                        />
                        {formatScore(form.getValues().score)}
                    </div>

                    <Text mt="md" className="input-label">
                        Objets prescrits
                    </Text>
                    <Button.Group className={classes['multiselect-buttons-container']}>
                        <Button
                            fullWidth
                            size="xs"
                            variant={form.getValues().prescripted === null ? 'filled' : 'outline'}
                            type="button"
                            onClick={() => changePrescripted(null)}
                        >
                            Prescrits et non-prescrits
                        </Button>
                        <Button
                            fullWidth
                            size="xs"
                            variant={form.getValues().prescripted === true ? 'filled' : 'outline'}
                            type="button"
                            onClick={() => changePrescripted(true)}
                        >
                            Prescrits
                        </Button>
                        <Button
                            fullWidth
                            size="xs"
                            variant={form.getValues().prescripted === false ? 'filled' : 'outline'}
                            type="button"
                            onClick={() => changePrescripted(false)}
                        >
                            Non-prescrits
                        </Button>
                    </Button.Group>

                    <div className={classes['object-types-select-container']}>
                        <MultiSelect
                            className={clsx('multiselect-pills-hidden', classes['object-types-select'])}
                            mt="md"
                            label="Types d'objets"
                            placeholder="Caravane, piscine,..."
                            searchable
                            data={(objectTypesToDisplay || []).map(({ name, uuid }) => ({
                                value: uuid,
                                label: name,
                            }))}
                            renderOption={(item) => (
                                <SelectItem item={item} color={objectTypesMap[item.option.value].color} />
                            )}
                            key={form.key('objectTypesUuids')}
                            {...getTrackedListInputProps('objectTypesUuids', 'Type d’objet', getObjectTypeTrackingName)}
                        />

                        <Tooltip
                            label={
                                form.getValues().objectTypesUuids.length ? 'Déselectionner tout' : 'Sélectionner tout'
                            }
                        >
                            <ActionIcon
                                size="lg"
                                ml="xs"
                                className={classes['object-types-selectall-button']}
                                onClick={() => {
                                    const objectTypesUuidsSelected = form.getValues().objectTypesUuids;
                                    trackFilterEvent(
                                        'Filtre modifié',
                                        `Type d’objet : ${objectTypesUuidsSelected.length ? '-' : '+'}TOUS`,
                                    );
                                    onUserChange?.();
                                    form.setFieldValue(
                                        'objectTypesUuids',
                                        objectTypesUuidsSelected.length ? [] : objectTypes.map(({ uuid }) => uuid),
                                    );
                                }}
                            >
                                <IconChecks />
                            </ActionIcon>
                        </Tooltip>
                    </div>

                    {form.getValues().objectTypesUuids.length ? (
                        <Group gap="xs" mt="sm">
                            {form
                                .getValues()
                                .objectTypesUuids.filter((uuid) => objectTypesMap[uuid])
                                .map((uuid) => (
                                    <Badge
                                        autoContrast
                                        rightSection={
                                            <ActionIcon
                                                variant="transparent"
                                                size={16}
                                                onClick={() => {
                                                    trackFilterEvent(
                                                        'Filtre modifié',
                                                        `Type d’objet : -${getObjectTypeTrackingName(uuid)}`,
                                                    );
                                                    onUserChange?.();
                                                    form.setFieldValue('objectTypesUuids', (prev) =>
                                                        prev.filter((typeUuid) => typeUuid !== uuid),
                                                    );
                                                }}
                                                aria-label={`Retirer ${objectTypesMap[uuid].name} des filtres`}
                                            >
                                                <IconX size={16} color="white" />
                                            </ActionIcon>
                                        }
                                        radius={100}
                                        key={uuid}
                                        color={objectTypesMap[uuid].color}
                                    >
                                        {objectTypesMap[uuid].name}
                                    </Badge>
                                ))}
                        </Group>
                    ) : (
                        <p className={classes['empty-filter-text']}>Aucun filtre sur les types n&apos;est appliqué</p>
                    )}
                </div>

                <div className={clsx(classes['statuses-filters-container'], classes['filters-section'])}>
                    <div>
                        <Checkbox.Group
                            mt="xl"
                            label="Statuts de validation"
                            key={form.key('detectionValidationStatuses')}
                            {...getTrackedListInputProps('detectionValidationStatuses', 'Validation')}
                        >
                            <Stack gap="xs" mt="sm">
                                {detectionValidationStatusesSelectable.map((status) => (
                                    <Checkbox
                                        key={status}
                                        value={status}
                                        label={DETECTION_VALIDATION_STATUSES_NAMES_MAP[status]}
                                        color={DETECTION_VALIDATION_STATUSES_COLORS_MAP[status]}
                                    />
                                ))}
                            </Stack>
                        </Checkbox.Group>

                        {form.getValues().detectionValidationStatuses.length === 0 ? (
                            <div className={classes['empty-filter-text']}>
                                <p>Aucun filtre sur les statuts</p>
                                <p>de validation n&apos;est appliqué</p>
                            </div>
                        ) : null}
                    </div>

                    <div>
                        <Checkbox.Group
                            mt="xl"
                            label="Statuts de contrôle"
                            key={form.key('detectionControlStatuses')}
                            {...getTrackedListInputProps('detectionControlStatuses', 'Contrôle')}
                        >
                            <Stack gap="xs" mt="sm">
                                {detectionControlStatuses.map((status) => (
                                    <Checkbox
                                        key={status}
                                        value={status}
                                        label={DETECTION_CONTROL_STATUSES_NAMES_MAP[status]}
                                    />
                                ))}
                            </Stack>
                        </Checkbox.Group>

                        {form.getValues().detectionControlStatuses.length === 0 ? (
                            <div className={classes['empty-filter-text']}>
                                <p>Aucun filtre sur les statuts</p>
                                <p>de contrôle n&apos;est appliqué</p>
                            </div>
                        ) : null}
                    </div>

                    <div>
                        <Text mt="xl" className="input-label">
                            Zones à enjeux
                        </Text>
                        <Stack gap="xs" mt="sm">
                            {mapGeoCustomZoneLayers.map(({ name, color, customZoneUuids: customZoneUuids_ }) => (
                                <Checkbox
                                    key={customZoneUuids_.join(',')}
                                    value={customZoneUuids_}
                                    checked={customZoneUuids_.some((uuid) => customZonesUuids.includes(uuid))}
                                    label={name}
                                    color={color}
                                    onChange={(event) => {
                                        const zoneTrackingName = getZoneLayerTrackingName(
                                            { name, customZoneUuids: customZoneUuids_ },
                                            settings,
                                        );

                                        if (event.currentTarget.checked) {
                                            trackFilterEvent('Filtre modifié', `Zone à enjeux : +${zoneTrackingName}`);
                                            onUserChange?.();
                                            form.setFieldValue(
                                                'customZonesUuids',
                                                Array.from(new Set([...customZonesUuids, ...customZoneUuids_])),
                                            );
                                        } else {
                                            const next = customZonesUuids.filter(
                                                (uuid) => !customZoneUuids_.includes(uuid),
                                            );
                                            if (next.length === 0) {
                                                // At least one zone à enjeux must stay selected — detections
                                                // outside every custom zone (zones urbaines) must not be shown.
                                                // Re-set the same value (new ref) to snap the checkbox back on.
                                                form.setFieldValue('customZonesUuids', [...customZonesUuids]);
                                                notifications.show({
                                                    color: 'red',
                                                    title: 'Zone à enjeux',
                                                    message: 'Au moins une zone à enjeux doit rester sélectionnée',
                                                });
                                                trackFilterEvent('Filtre refusé', 'Dernière zone à enjeux');
                                                return;
                                            }
                                            trackFilterEvent('Filtre modifié', `Zone à enjeux : -${zoneTrackingName}`);
                                            onUserChange?.();
                                            form.setFieldValue('customZonesUuids', next);
                                        }
                                    }}
                                />
                            ))}
                        </Stack>

                        {form.getValues().customZonesUuids.length === 0 ? (
                            <div className={classes['empty-filter-text']}>
                                <p>Aucune zone à enjeux n&apos;est sélectionnée</p>
                                <p>aucun objet ne peut être affiché</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </form>
    );
};

export default Component;

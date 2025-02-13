import React, { useMemo } from 'react';

import SelectItem from '@/components/ui/SelectItem';
import { detectionControlStatuses, detectionValidationStatuses } from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { ObjectType, ObjectTypeMinimal } from '@/models/object-type';
import {
    DETECTION_CONTROL_STATUSES_NAMES_MAP,
    DETECTION_VALIDATION_STATUSES_COLORS_MAP,
    DETECTION_VALIDATION_STATUSES_NAMES_MAP,
    OTHER_OBJECT_TYPE,
} from '@/utils/constants';
import { ActionIcon, Badge, Button, Checkbox, Group, MultiSelect, Slider, Stack, Text, Tooltip } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
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

interface ComponentProps {
    objectTypes: ObjectType[];
    objectsFilter: ObjectsFilter;
    geoCustomZones: GeoCustomZone[];
    otherObjectTypesUuids: Set<string>;
    updateObjectsFilter: (objectsFilter: ObjectsFilter) => void;
}

const Component: React.FC<ComponentProps> = ({
    objectTypes,
    otherObjectTypesUuids,
    objectsFilter,
    geoCustomZones,
    updateObjectsFilter,
}) => {
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

    console.log(objectTypesToDisplay);

    return (
        <form className={classes.form}>
            <h2>{CONTROL_LABEL}</h2>

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
                            onChangeEnd={(value) => form.setFieldValue('score', value)}
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
                            onClick={() => form.setFieldValue('prescripted', null)}
                        >
                            Prescrits et non-prescrits
                        </Button>
                        <Button
                            fullWidth
                            size="xs"
                            variant={form.getValues().prescripted === true ? 'filled' : 'outline'}
                            type="button"
                            onClick={() => form.setFieldValue('prescripted', true)}
                        >
                            Prescrits
                        </Button>
                        <Button
                            fullWidth
                            size="xs"
                            variant={form.getValues().prescripted === false ? 'filled' : 'outline'}
                            type="button"
                            onClick={() => form.setFieldValue('prescripted', false)}
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
                            {...form.getInputProps('objectTypesUuids')}
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
                            {form.getValues().objectTypesUuids.map((uuid) => (
                                <Badge
                                    autoContrast
                                    rightSection={
                                        <ActionIcon
                                            variant="transparent"
                                            size={16}
                                            onClick={() => {
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
                            {...form.getInputProps('detectionValidationStatuses')}
                        >
                            <Stack gap="xs" mt="sm">
                                {detectionValidationStatuses.map((status) => (
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
                            {...form.getInputProps('detectionControlStatuses')}
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
                        <Checkbox.Group
                            mt="xl"
                            label="Zones à enjeux"
                            key={form.key('customZonesUuids')}
                            {...form.getInputProps('customZonesUuids')}
                        >
                            <Stack gap="xs" mt="sm">
                                {geoCustomZones.map((zone) => (
                                    <Checkbox key={zone.uuid} value={zone.uuid} label={zone.name} color={zone.color} />
                                ))}
                            </Stack>
                        </Checkbox.Group>

                        {form.getValues().customZonesUuids.length === 0 ? (
                            <div className={classes['empty-filter-text']}>
                                <p>Aucune zone à enjeux n&apos;est sélectionnée</p>
                                <p>tous les objets sont affichés</p>
                            </div>
                        ) : null}
                    </div>
                </div>
            </div>
        </form>
    );
};

export default Component;

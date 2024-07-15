import React, { useMemo } from 'react';

import MapControlCustom from '@/components/Map/controls/MapControlCustom';
import SelectItem from '@/components/ui/SelectItem';
import { detectionControlStatuses, detectionValidationStatuses } from '@/models/detection';
import { DetectionFilter } from '@/models/detection-filter';
import { ObjectType } from '@/models/object-type';
import {
    DETECTION_CONTROL_STATUSES_NAMES_MAP,
    DETECTION_VALIDATION_STATUSES_COLORS_MAP,
    DETECTION_VALIDATION_STATUSES_NAMES_MAP,
} from '@/utils/constants';
import { useMap } from '@/utils/map-context';
import { ActionIcon, Badge, Button, Checkbox, Group, MultiSelect, Slider, Stack, Text } from '@mantine/core';
import { UseFormReturnType, useForm } from '@mantine/form';
import { IconFilter, IconX } from '@tabler/icons-react';
import classes from './index.module.scss';

const CONTROL_LABEL = 'Filtrer les objets';

interface FormValues {
    objectTypesUuids: DetectionFilter['objectTypesUuids'];
    detectionValidationStatuses: DetectionFilter['detectionValidationStatuses'];
    detectionControlStatuses: DetectionFilter['detectionControlStatuses'];
    score: DetectionFilter['score'];
    prescripted: DetectionFilter['prescripted'];
}

const formatScore = (score: number) => Math.round(score * 100);

interface ComponentInnerProps {
    objectTypes: ObjectType[];
    objectTypesUuidsSelected: DetectionFilter['objectTypesUuids'];
    detectionValidationStatusesSelected: DetectionFilter['detectionValidationStatuses'];
    detectionControlStatusesSelected: DetectionFilter['detectionControlStatuses'];
    score: DetectionFilter['score'];
    prescripted: DetectionFilter['prescripted'];
}

const ComponentInner: React.FC<ComponentInnerProps> = ({
    objectTypes,
    objectTypesUuidsSelected,
    detectionValidationStatusesSelected,
    detectionControlStatusesSelected,
    score,
    prescripted,
}) => {
    const { updateDetectionFilter } = useMap();
    const form: UseFormReturnType<FormValues> = useForm({
        mode: 'uncontrolled',
        initialValues: {
            objectTypesUuids: objectTypesUuidsSelected,
            detectionValidationStatuses: detectionValidationStatusesSelected,
            detectionControlStatuses: detectionControlStatusesSelected,
            score,
            prescripted,
        },
    });
    form.watch('objectTypesUuids', ({ value }) => {
        updateDetectionFilter({
            detectionValidationStatuses: form.getValues().detectionValidationStatuses,
            objectTypesUuids: value,
            detectionControlStatuses: form.getValues().detectionControlStatuses,
            score: form.getValues().score,
            prescripted: form.getValues().prescripted,
        });
    });
    form.watch('detectionValidationStatuses', ({ value }) => {
        updateDetectionFilter({
            detectionValidationStatuses: value,
            objectTypesUuids: form.getValues().objectTypesUuids,
            detectionControlStatuses: form.getValues().detectionControlStatuses,
            score: form.getValues().score,
            prescripted: form.getValues().prescripted,
        });
    });
    form.watch('detectionControlStatuses', ({ value }) => {
        updateDetectionFilter({
            detectionValidationStatuses: form.getValues().detectionValidationStatuses,
            objectTypesUuids: form.getValues().objectTypesUuids,
            detectionControlStatuses: value,
            score: form.getValues().score,
            prescripted: form.getValues().prescripted,
        });
    });
    form.watch('score', ({ value }) => {
        updateDetectionFilter({
            detectionValidationStatuses: form.getValues().detectionValidationStatuses,
            objectTypesUuids: form.getValues().objectTypesUuids,
            detectionControlStatuses: form.getValues().detectionControlStatuses,
            score: value,
            prescripted: form.getValues().prescripted,
        });
    });
    form.watch('prescripted', ({ value }) => {
        updateDetectionFilter({
            detectionValidationStatuses: form.getValues().detectionValidationStatuses,
            objectTypesUuids: form.getValues().objectTypesUuids,
            detectionControlStatuses: form.getValues().detectionControlStatuses,
            score: form.getValues().score,
            prescripted: value,
        });
    });

    const objectTypesMap: Record<string, ObjectType> = useMemo(() => {
        return (
            objectTypes?.reduce(
                (prev, curr) => ({
                    ...prev,
                    [curr.uuid]: curr,
                }),
                {},
            ) || {}
        );
    }, [objectTypes]);

    return (
        <form className={classes.form}>
            <h2>{CONTROL_LABEL}</h2>

            <Text mt="md" className="input-label">
                Score
            </Text>
            <div className={classes['score-slider-value-container']}>
                <Slider
                    className={classes['score-slider']}
                    label={formatScore}
                    min={0.3}
                    max={1}
                    step={0.05}
                    key={form.key('score')}
                    {...form.getInputProps('score')}
                    onChange={undefined}
                    onChangeEnd={(value) => form.setFieldValue('score', value)}
                />
                {formatScore(form.getValues().score)}
            </div>

            <Text mt="md" className="input-label">
                Prescription
            </Text>
            <Button.Group className={classes['prescription-selection-container']}>
                <Button
                    fullWidth
                    variant={form.getValues().prescripted === null ? 'filled' : 'outline'}
                    type="button"
                    onClick={() => form.setFieldValue('prescripted', null)}
                >
                    Tous les objets
                </Button>
                <Button
                    fullWidth
                    variant={form.getValues().prescripted === true ? 'filled' : 'outline'}
                    type="button"
                    onClick={() => form.setFieldValue('prescripted', true)}
                >
                    Prescrits
                </Button>
                <Button
                    fullWidth
                    variant={form.getValues().prescripted === false ? 'filled' : 'outline'}
                    type="button"
                    onClick={() => form.setFieldValue('prescripted', false)}
                >
                    Non-prescrits
                </Button>
            </Button.Group>

            <MultiSelect
                className="multiselect-pills-hidden"
                mt="md"
                label="Types d'objets"
                placeholder="Caravane, piscine,..."
                searchable
                data={(objectTypes || []).map(({ name, uuid }) => ({
                    value: uuid,
                    label: name,
                }))}
                renderOption={(item) => <SelectItem item={item} color={objectTypesMap[item.option.value].color} />}
                key={form.key('objectTypesUuids')}
                {...form.getInputProps('objectTypesUuids')}
            />
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

            <div className={classes['statuses-filters-container']}>
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
                        <p className={classes['empty-filter-text']}>
                            Aucun filtre sur les statuts de validation n&apos;est appliqué
                        </p>
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
                        <p className={classes['empty-filter-text']}>
                            Aucun filtre sur les statuts de contrôle n&apos;est appliqué
                        </p>
                    ) : null}
                </div>
            </div>
        </form>
    );
};

interface ComponentProps {
    isShowed: boolean;
    setIsShowed: (state: boolean) => void;
}

const Component: React.FC<ComponentProps> = ({ isShowed, setIsShowed }) => {
    const { objectTypes, detectionFilter } = useMap();

    if (!objectTypes || !detectionFilter) {
        return null;
    }

    return (
        <MapControlCustom
            label={CONTROL_LABEL}
            controlInner={<IconFilter color="#777777" />}
            contentClassName={classes.content}
            containerClassName={classes.container}
            isShowed={isShowed}
            setIsShowed={setIsShowed}
        >
            <ComponentInner
                objectTypes={objectTypes}
                objectTypesUuidsSelected={detectionFilter.objectTypesUuids}
                detectionValidationStatusesSelected={detectionFilter.detectionValidationStatuses}
                detectionControlStatusesSelected={detectionFilter.detectionControlStatuses}
                score={detectionFilter.score}
                prescripted={detectionFilter.prescripted}
            />
        </MapControlCustom>
    );
};

export default Component;

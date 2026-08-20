import React, { useMemo } from 'react';

import Accordion from '@/components/dsfr/Accordion';
import Checkbox from '@/components/dsfr/Checkbox';
import Range from '@/components/dsfr/Range';
import { useExpandedSections } from '@/hooks/useExpandedSections';
import {
    detectionControlStatuses,
    DetectionValidationStatus,
    detectionValidationStatusesSelectable,
} from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import { MapGeoCustomZoneLayer } from '@/models/map-layer';
import { ObjectType, ObjectTypeMinimal } from '@/models/object-type';
import {
    DETECTION_CONTROL_STATUSES_NAMES_MAP,
    DETECTION_VALIDATION_STATUSES_NAMES_MAP,
    OTHER_OBJECT_TYPE,
} from '@/utils/constants';
import {
    CUSTOM_PRESET_ID,
    CUSTOM_PRESET_LABEL,
    getMatchingPresetId,
    OBJECTS_FILTER_PRESETS,
} from '@/utils/objects-filter-presets';
import { notifications } from '@mantine/notifications';
import clsx from 'clsx';
import classes from './index.module.scss';

type Section = 'OBJECT_TYPES' | 'PRESCRIPTION' | 'VALIDATION' | 'CONTROL' | 'CUSTOM_ZONES' | 'SCORE';

const ALL_SECTIONS: readonly Section[] = [
    'OBJECT_TYPES',
    'PRESCRIPTION',
    'VALIDATION',
    'CONTROL',
    'CUSTOM_ZONES',
    'SCORE',
] as const;

const formatScore = (score: number) => String(Math.round(score));

/**
 * The square trails the name and mirrors how the map draws the thing: detections are drawn as
 * an outline, zones as a filled area. The name is truncated rather than wrapped — wrapping
 * pushes the square out of line with the checkbox — and it has to be its own element because
 * the DSFR checkbox label is a flex row, which drops the whitespace around a bare text node.
 */
const LabelWithColor: React.FC<{ name: string; color?: string; outlined?: boolean }> = ({ name, color, outlined }) => (
    <span className={classes.label} title={name}>
        <span className={classes['label-name']}>{name}</span>
        {color ? (
            <span
                className={clsx(classes['color-square'], outlined && classes['color-square-outlined'])}
                style={outlined ? { borderColor: color } : { backgroundColor: color }}
                aria-hidden="true"
            />
        ) : null}
    </span>
);

interface ComponentProps {
    objectTypes: ObjectType[];
    objectsFilter: ObjectsFilter;
    mapGeoCustomZoneLayers: MapGeoCustomZoneLayer[];
    otherObjectTypesUuids: Set<string>;
    updateObjectsFilter: (objectsFilter: ObjectsFilter) => void;
}

const Component: React.FC<ComponentProps> = ({
    objectTypes,
    otherObjectTypesUuids,
    objectsFilter,
    mapGeoCustomZoneLayers,
    updateObjectsFilter,
}: ComponentProps) => {
    const { isExpanded, toggleSection } = useExpandedSections(ALL_SECTIONS);

    const update = (patch: Partial<ObjectsFilter>) => updateObjectsFilter({ ...objectsFilter, ...patch });

    const objectTypesToDisplay: ObjectTypeMinimal[] = useMemo(() => {
        if (otherObjectTypesUuids.size === 0) {
            return objectTypes;
        }

        return [...objectTypes.filter((ot) => !otherObjectTypesUuids.has(ot.uuid)), OTHER_OBJECT_TYPE];
    }, [objectTypes, otherObjectTypesUuids]);

    const selectedPresetId = useMemo(() => getMatchingPresetId(objectsFilter) ?? CUSTOM_PRESET_ID, [objectsFilter]);

    const applyPreset = (presetId: string) => {
        const preset = OBJECTS_FILTER_PRESETS.find(({ id }) => id === presetId);

        if (preset) {
            update(preset.filter);
        }
    };

    const toggleInArray = <T,>(values: T[], value: T, checked: boolean): T[] =>
        checked ? [...values, value] : values.filter((item) => item !== value);

    /**
     * ILLEGAL has no checkbox any more but several presets still set it, so a toggle must not
     * silently drop it. The exception is unticking the last visible status: leaving ILLEGAL
     * behind would show an unfiltered-looking panel that is still filtering.
     */
    const toggleValidationStatus = (status: DetectionValidationStatus, checked: boolean) => {
        const next = toggleInArray(objectsFilter.detectionValidationStatuses, status, checked);
        const anySelectableLeft = next.some((value) => detectionValidationStatusesSelectable.includes(value));

        update({ detectionValidationStatuses: anySelectableLeft ? next : [] });
    };

    // Two checkboxes stand in for a tri-state: both ticked means no filter. Unticking one
    // always leaves the other ticked, so a click never lands on "nothing selected" (which
    // would show nothing) nor bounces the box the user just clicked back on.
    const setPrescripted = (target: boolean, checked: boolean) => update({ prescripted: checked ? null : !target });

    const isPrescriptedChecked = (target: boolean) =>
        objectsFilter.prescripted === null || objectsFilter.prescripted === target;

    return (
        <div className={classes.container}>
            <div className={`fr-select-group ${classes.preset}`}>
                <label className="fr-label" htmlFor="objects-filter-preset">
                    Filtres rapides
                </label>
                <select
                    className="fr-select"
                    id="objects-filter-preset"
                    value={selectedPresetId}
                    onChange={(event) => applyPreset(event.currentTarget.value)}
                >
                    {OBJECTS_FILTER_PRESETS.map(({ id, label }) => (
                        <option key={id} value={id}>
                            {label}
                        </option>
                    ))}
                    <option value={CUSTOM_PRESET_ID} disabled>
                        {CUSTOM_PRESET_LABEL}
                    </option>
                </select>
            </div>

            <div className="fr-accordions-group">
                <Accordion
                    title="Types d'objets"
                    expanded={isExpanded('OBJECT_TYPES')}
                    onToggle={(expanded) => toggleSection('OBJECT_TYPES', expanded)}
                >
                    <button
                        type="button"
                        className={clsx(
                            'fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-checkbox-circle-line fr-btn--icon-left',
                            classes['select-all'],
                        )}
                        onClick={() =>
                            update({
                                objectTypesUuids: objectsFilter.objectTypesUuids.length
                                    ? []
                                    : objectTypes.map(({ uuid }) => uuid),
                            })
                        }
                    >
                        {objectsFilter.objectTypesUuids.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                    {objectTypesToDisplay.map(({ uuid, name, color }) => (
                        <Checkbox
                            key={uuid}
                            checked={objectsFilter.objectTypesUuids.includes(uuid)}
                            label={<LabelWithColor outlined name={name} color={color} />}
                            onChange={(checked) =>
                                update({
                                    objectTypesUuids: toggleInArray(objectsFilter.objectTypesUuids, uuid, checked),
                                })
                            }
                        />
                    ))}
                    {!objectsFilter.objectTypesUuids.length ? (
                        <p className={classes['empty-filter-text']}>Aucun filtre sur les types n&apos;est appliqué</p>
                    ) : null}
                </Accordion>

                <Accordion
                    title="Prescription"
                    expanded={isExpanded('PRESCRIPTION')}
                    onToggle={(expanded) => toggleSection('PRESCRIPTION', expanded)}
                >
                    <p className={classes['section-hint']}>
                        Les prescriptions sont appliquées automatiquement aux constructions et piscines détectées il y a
                        plus de 6 ans.
                    </p>
                    <Checkbox
                        label="Non prescrit"
                        checked={isPrescriptedChecked(false)}
                        onChange={(checked) => setPrescripted(false, checked)}
                    />
                    <Checkbox
                        label="Prescrit"
                        checked={isPrescriptedChecked(true)}
                        onChange={(checked) => setPrescripted(true, checked)}
                    />
                </Accordion>

                <Accordion
                    title="Etat de conformité"
                    expanded={isExpanded('VALIDATION')}
                    onToggle={(expanded) => toggleSection('VALIDATION', expanded)}
                >
                    {detectionValidationStatusesSelectable.map((status) => (
                        <Checkbox
                            key={status}
                            label={DETECTION_VALIDATION_STATUSES_NAMES_MAP[status]}
                            checked={objectsFilter.detectionValidationStatuses.includes(status)}
                            onChange={(checked) => toggleValidationStatus(status, checked)}
                        />
                    ))}
                    {!objectsFilter.detectionValidationStatuses.length ? (
                        <p className={classes['empty-filter-text']}>
                            Aucun filtre sur les statuts de validation n&apos;est appliqué
                        </p>
                    ) : null}
                </Accordion>

                <Accordion
                    title="Statut du contrôle"
                    expanded={isExpanded('CONTROL')}
                    onToggle={(expanded) => toggleSection('CONTROL', expanded)}
                >
                    {detectionControlStatuses.map((status) => (
                        <Checkbox
                            key={status}
                            label={DETECTION_CONTROL_STATUSES_NAMES_MAP[status]}
                            checked={objectsFilter.detectionControlStatuses.includes(status)}
                            onChange={(checked) =>
                                update({
                                    detectionControlStatuses: toggleInArray(
                                        objectsFilter.detectionControlStatuses,
                                        status,
                                        checked,
                                    ),
                                })
                            }
                        />
                    ))}
                    {!objectsFilter.detectionControlStatuses.length ? (
                        <p className={classes['empty-filter-text']}>
                            Aucun filtre sur les statuts de contrôle n&apos;est appliqué
                        </p>
                    ) : null}
                </Accordion>

                <Accordion
                    title="Zones à enjeux"
                    expanded={isExpanded('CUSTOM_ZONES')}
                    onToggle={(expanded) => toggleSection('CUSTOM_ZONES', expanded)}
                >
                    {mapGeoCustomZoneLayers.map(({ name, color, customZoneUuids }) => (
                        <Checkbox
                            key={customZoneUuids.join(',')}
                            checked={customZoneUuids.some((uuid) => objectsFilter.customZonesUuids.includes(uuid))}
                            label={<LabelWithColor name={name} color={color} />}
                            onChange={(checked) => {
                                if (checked) {
                                    update({
                                        customZonesUuids: Array.from(
                                            new Set([...objectsFilter.customZonesUuids, ...customZoneUuids]),
                                        ),
                                    });
                                    return;
                                }

                                const next = objectsFilter.customZonesUuids.filter(
                                    (uuid) => !customZoneUuids.includes(uuid),
                                );

                                if (!next.length) {
                                    // Detections outside every custom zone (zones urbaines) must not be
                                    // shown, so an empty selection is not a valid state.
                                    notifications.show({
                                        color: 'red',
                                        title: 'Zone à enjeux',
                                        message: 'Au moins une zone à enjeux doit rester sélectionnée',
                                    });
                                    return;
                                }

                                update({ customZonesUuids: next });
                            }}
                        />
                    ))}
                </Accordion>

                <Accordion
                    title="Score de fiabilité"
                    expanded={isExpanded('SCORE')}
                    onToggle={(expanded) => toggleSection('SCORE', expanded)}
                >
                    <p className={classes['section-hint']}>
                        Plus le score est élevé plus les détections affichées seront fiables, mais moins exhaustives.
                        Avec un score à 30, le taux d’erreur de l’IA est d’environ 10%.
                    </p>
                    <Range
                        label="Score minimum"
                        min={0}
                        max={100}
                        step={5}
                        value={Math.round(objectsFilter.score * 100)}
                        formatValue={formatScore}
                        onChange={(value) => update({ score: value / 100 })}
                    />
                </Accordion>
            </div>
        </div>
    );
};

export default Component;

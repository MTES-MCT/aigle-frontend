import React, { useEffect, useMemo, useRef } from 'react';

import Accordion from '@/components/dsfr/Accordion';
import Checkbox from '@/components/dsfr/Checkbox';
import Range from '@/components/dsfr/Range';
import { getZoneLayerTrackingName } from '@/components/Map/utils/tracking';
import { useExpandedSections } from '@/hooks/useExpandedSections';
import {
    detectionControlStatuses,
    DetectionValidationStatus,
    detectionValidationStatusesSelectable,
} from '@/models/detection';
import { ObjectsFilter } from '@/models/detection-filter';
import { MapGeoCustomZoneLayer } from '@/models/map-layer';
import { ObjectType, ObjectTypeMinimal } from '@/models/object-type';
import { useMap } from '@/store/slices/map';
import {
    DETECTION_CONTROL_STATUSES_NAMES_MAP,
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

const getScorePercent = (score: number) => Math.round(score * 100);

// Each keyboard step and each move of the slider is a change: only the value the agent settles on is sent.
const SCORE_TRACKING_DELAY_MS = 1000;

const getPrescriptedTrackingName = (prescripted: ObjectsFilter['prescripted']) => {
    if (prescripted === null) {
        return 'ALL';
    }

    return prescripted ? 'PRESCRIBED' : 'NOT_PRESCRIBED';
};

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
}: ComponentProps) => {
    const { isExpanded, toggleSection } = useExpandedSections(ALL_SECTIONS);
    const { settings } = useMap();
    const scoreTrackingRef = useRef<{ timer: ReturnType<typeof setTimeout>; from: number } | null>(null);

    const update = (patch: Partial<ObjectsFilter>) => updateObjectsFilter({ ...objectsFilter, ...patch });

    const objectTypesToDisplay: ObjectTypeMinimal[] = useMemo(() => {
        if (otherObjectTypesUuids.size === 0) {
            return objectTypes;
        }

        return [...objectTypes.filter((ot) => !otherObjectTypesUuids.has(ot.uuid)), OTHER_OBJECT_TYPE];
    }, [objectTypes, otherObjectTypesUuids]);

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

    const getObjectTypeTrackingName = (uuid: string) =>
        [...objectTypes, OTHER_OBJECT_TYPE].find((objectType) => objectType.uuid === uuid)?.name ?? 'Inconnu';

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

    // The agent's own changes only: presets, url restores and 'Rendre visible' update the store directly.
    const updateFromUser = (patch: Partial<ObjectsFilter>) => {
        onUserChange?.();
        update(patch);
    };

    const applyPreset = (presetId: string) => {
        const preset = OBJECTS_FILTER_PRESETS.find(({ id }) => id === presetId);

        if (preset) {
            trackFilterEvent('Filtre rapide appliqué', preset.id);
            updateFromUser(preset.filter);
        }
    };

    const changeScore = (score: number) => {
        const previousScore = objectsFilter.score;
        if (score === previousScore) {
            return;
        }

        updateFromUser({ score });

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
                if (getScorePercent(score) !== getScorePercent(from)) {
                    trackEvent(trackingCategory, 'Score modifié', String(getScorePercent(score)));
                }
            }, SCORE_TRACKING_DELAY_MS),
        };
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
        const detectionValidationStatuses = anySelectableLeft ? next : [];

        trackListChanges('Validation', objectsFilter.detectionValidationStatuses, detectionValidationStatuses);
        updateFromUser({ detectionValidationStatuses });
    };

    // Two checkboxes stand in for a tri-state: both ticked means no filter. Unticking one
    // always leaves the other ticked, so a click never lands on "nothing selected" (which
    // would show nothing) nor bounces the box the user just clicked back on.
    const setPrescripted = (target: boolean, checked: boolean) => {
        const prescripted = checked ? null : !target;

        if (prescripted !== objectsFilter.prescripted) {
            trackFilterEvent('Filtre modifié', `Prescription : =${getPrescriptedTrackingName(prescripted)}`);
        }
        updateFromUser({ prescripted });
    };

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
                        onClick={() => {
                            trackFilterEvent(
                                'Filtre modifié',
                                `Type d’objet : ${objectsFilter.objectTypesUuids.length ? '-' : '+'}TOUS`,
                            );
                            updateFromUser({
                                objectTypesUuids: objectsFilter.objectTypesUuids.length
                                    ? []
                                    : objectTypes.map(({ uuid }) => uuid),
                            });
                        }}
                    >
                        {objectsFilter.objectTypesUuids.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                    {objectTypesToDisplay.map(({ uuid, name, color }) => (
                        <Checkbox
                            key={uuid}
                            checked={objectsFilter.objectTypesUuids.includes(uuid)}
                            label={<LabelWithColor outlined name={name} color={color} />}
                            onChange={(checked) => {
                                const objectTypesUuids = toggleInArray(objectsFilter.objectTypesUuids, uuid, checked);

                                trackListChanges(
                                    'Type d’objet',
                                    objectsFilter.objectTypesUuids,
                                    objectTypesUuids,
                                    getObjectTypeTrackingName,
                                );
                                updateFromUser({ objectTypesUuids });
                            }}
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
                            onChange={(checked) => {
                                const detectionControlStatuses = toggleInArray(
                                    objectsFilter.detectionControlStatuses,
                                    status,
                                    checked,
                                );

                                trackListChanges(
                                    'Contrôle',
                                    objectsFilter.detectionControlStatuses,
                                    detectionControlStatuses,
                                );
                                updateFromUser({ detectionControlStatuses });
                            }}
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
                                const zoneTrackingName = getZoneLayerTrackingName({ name, customZoneUuids }, settings);

                                if (checked) {
                                    trackFilterEvent('Filtre modifié', `Zone à enjeux : +${zoneTrackingName}`);
                                    updateFromUser({
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
                                    trackFilterEvent('Filtre refusé', 'Dernière zone à enjeux');
                                    return;
                                }

                                trackFilterEvent('Filtre modifié', `Zone à enjeux : -${zoneTrackingName}`);
                                updateFromUser({ customZonesUuids: next });
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
                        onChange={(value) => changeScore(value / 100)}
                    />
                </Accordion>
            </div>
        </div>
    );
};

export default Component;

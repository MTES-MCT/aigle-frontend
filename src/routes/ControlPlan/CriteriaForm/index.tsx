import React, { useMemo } from 'react';

import Accordion from '@/components/dsfr/Accordion';
import Checkbox from '@/components/dsfr/Checkbox';
import Range from '@/components/dsfr/Range';
import GeoCollectivitiesMultiSelects from '@/components/FormFields/GeoCollectivitiesMultiSelects';
import SortableRows from '@/components/SortableRows';
import { ControlPlanCriteriaOptions, ControlPlanValidationStatus } from '@/models/control-plan';
import { ObjectTypeMinimal } from '@/models/object-type';
import {
    CRITERIA_FIELD_ATTRIBUTE,
    CriteriaFormErrors,
    CriteriaFormState,
    describeAdvancedCriteria,
    isAdvancedDefault,
    MAX_PARCELS_COUNT,
    moveItem,
    toggleZoneGroup,
} from '@/routes/ControlPlan/criteria';
import NoZoneAlert from '@/routes/ControlPlan/NoZoneAlert';
import SortableCheckboxRow from '@/routes/ControlPlan/SortableCheckboxRow';
import { RANKING_CRITERIA_LABELS } from '@/routes/ControlPlan/utils';
import ObjectTypeSquare from '@/routes/Table/ObjectTypeSquare';
import { getCustomZoneOpacities, withAlpha } from '@/utils/colors';
import {
    DEFAULT_CUSTOM_ZONE_LAYER_OPACITY,
    DETECTION_VALIDATION_STATUSES_NAMES_MAP,
    OTHER_OBJECT_TYPE,
} from '@/utils/constants';
import { GeoValues } from '@/utils/geojson';
import { useForm } from '@mantine/form';
import clsx from 'clsx';
import classes from './index.module.scss';

const formatScore = (score: number) => String(Math.round(score));

const ZONE_SWATCH_OPACITIES = getCustomZoneOpacities(DEFAULT_CUSTOM_ZONE_LAYER_OPACITY);

const VALIDATION_STATUSES: { status: ControlPlanValidationStatus; hint?: string }[] = [
    { status: 'SUSPECT' },
    { status: 'DETECTED_NOT_VERIFIED', hint: 'ils passeront «\u00a0Suspect\u00a0» à la validation du plan' },
];

type PerimeterLabels = Record<string, string>;

interface PerimeterFieldProps {
    communesUuids: string[];
    epcisUuids: string[];
    labels: PerimeterLabels;
    onChange: (communesUuids: string[], epcisUuids: string[], labels: PerimeterLabels) => void;
}

const PerimeterField: React.FC<PerimeterFieldProps> = ({
    communesUuids,
    epcisUuids,
    labels,
    onChange,
}: PerimeterFieldProps) => {
    const form = useForm({
        initialValues: { communesUuids, epcisUuids, departmentsUuids: [] as string[], regionsUuids: [] as string[] },
    });
    // the selects read their initial options once: they are mounted with every name known
    const initialGeoSelectedValues: GeoValues = {
        region: [],
        department: [],
        epci: epcisUuids.map((uuid) => ({ value: uuid, label: labels[uuid] ?? 'EPCI inconnu' })),
        commune: communesUuids.map((uuid) => ({ value: uuid, label: labels[uuid] ?? 'Commune inconnue' })),
    };

    return (
        <GeoCollectivitiesMultiSelects
            form={form}
            initialGeoSelectedValues={initialGeoSelectedValues}
            displayedCollectivityTypes={new Set(['epci', 'commune'])}
            onChange={(values) =>
                onChange(
                    values.commune.map(({ value }) => value),
                    values.epci.map(({ value }) => value),
                    Object.fromEntries([...values.commune, ...values.epci].map(({ value, label }) => [value, label])),
                )
            }
        />
    );
};

const ZoneSwatch: React.FC<{ color: string | null }> = ({ color }) =>
    color ? (
        <span
            className={classes['zone-square']}
            style={{
                borderColor: withAlpha(color, ZONE_SWATCH_OPACITIES.line),
                backgroundColor: withAlpha(color, ZONE_SWATCH_OPACITIES.fill),
            }}
            aria-hidden="true"
        />
    ) : null;

interface ComponentProps {
    // prefixes the ids of the field containers (`${id}-zoneGroups`…), which the error summary links to
    id: string;
    state: CriteriaFormState;
    onChange: (state: CriteriaFormState) => void;
    // every name of the perimeter, fetched by the stepper for a reloaded wave
    perimeterLabels: PerimeterLabels;
    perimeterLabelsLoading: boolean;
    onPerimeterLabelsChange: (labels: PerimeterLabels) => void;
    options: ControlPlanCriteriaOptions;
    errors: CriteriaFormErrors;
    advancedExpanded: boolean;
    onAdvancedExpandedChange: (expanded: boolean) => void;
}

const Component: React.FC<ComponentProps> = ({
    id,
    state,
    onChange,
    perimeterLabels: labels,
    perimeterLabelsLoading,
    onPerimeterLabelsChange,
    options,
    errors,
    advancedExpanded,
    onAdvancedExpandedChange,
}: ComponentProps) => {
    const update = (patch: Partial<CriteriaFormState>) => onChange({ ...state, ...patch });

    const objectTypesToDisplay: ObjectTypeMinimal[] = useMemo(() => {
        const types = options.objectTypes
            .filter(({ status }) => status !== 'OTHER_CATEGORY')
            .map(({ uuid, name, color }) => ({ uuid, name, color }));

        return options.objectTypes.some(({ status }) => status === 'OTHER_CATEGORY')
            ? [...types, OTHER_OBJECT_TYPE]
            : types;
    }, [options]);

    const toggle = <T,>(values: T[], value: T, checked: boolean): T[] =>
        checked ? [...values, value] : values.filter((item) => item !== value);

    const renderError = (field: keyof CriteriaFormState) =>
        errors[field] ? (
            <p className={clsx('fr-message fr-message--error', classes.error)} id={`${id}-${field}-error`}>
                {errors[field]}
            </p>
        ) : null;

    const fieldProps = (field: keyof CriteriaFormState) => ({
        id: `${id}-${field}`,
        [CRITERIA_FIELD_ATTRIBUTE]: field,
    });

    const activeRankingCriteria = state.rankingCriteria.filter(({ active }) => active);
    const advancedDefault = isAdvancedDefault(state);

    return (
        <div className={classes.container}>
            <section className={classes.section} aria-labelledby={`${id}-where`}>
                <h4 id={`${id}-where`} className={classes.title}>
                    Où chercher
                </h4>
                {options.singleCommune ? (
                    <div>
                        <p className={classes.legend}>Périmètre</p>
                        <p className={classes.value}>
                            {options.singleCommune.name} ({options.singleCommune.code}), la seule commune de votre
                            groupe.
                        </p>
                    </div>
                ) : (
                    <fieldset className={classes.fieldset}>
                        <legend className={classes.legend}>Périmètre</legend>
                        <p className={classes.hint}>
                            Sans commune ni EPCI, le plan couvre tout le territoire du groupe.
                        </p>
                        {perimeterLabelsLoading ? (
                            <p className={classes.hint}>Chargement du périmètre…</p>
                        ) : (
                            <PerimeterField
                                communesUuids={state.communesUuids}
                                epcisUuids={state.epcisUuids}
                                labels={labels}
                                onChange={(communesUuids, epcisUuids, selectedLabels) => {
                                    onPerimeterLabelsChange({ ...labels, ...selectedLabels });
                                    update({ communesUuids, epcisUuids });
                                }}
                            />
                        )}
                    </fieldset>
                )}

                <fieldset
                    className={classes.fieldset}
                    aria-describedby={`${id}-zones-hint${errors.zoneGroups ? ` ${id}-zoneGroups-error` : ''}`}
                    {...fieldProps('zoneGroups')}
                >
                    <legend className={classes.legend}>Zones à enjeux</legend>
                    <p id={`${id}-zones-hint`} className={classes.hint}>
                        Seuls les objets situés dans les zones cochées sont retenus, ainsi que ceux dessinés par un
                        agent.
                    </p>
                    {state.zoneGroups.length ? (
                        <div className={classes.options}>
                            {state.zoneGroups.map((group) => (
                                <Checkbox
                                    key={group.key}
                                    className={classes.checkbox}
                                    label={
                                        <span className={classes['zone-label']}>
                                            {group.name}
                                            <ZoneSwatch color={group.color} />
                                        </span>
                                    }
                                    checked={group.selected}
                                    onChange={(selected) =>
                                        update({ zoneGroups: toggleZoneGroup(state.zoneGroups, group.key, selected) })
                                    }
                                />
                            ))}
                        </div>
                    ) : (
                        <NoZoneAlert />
                    )}
                    {renderError('zoneGroups')}
                </fieldset>
            </section>

            <section className={classes.section} aria-labelledby={`${id}-objects`}>
                <h4 id={`${id}-objects`} className={classes.title}>
                    Quels objets
                </h4>
                <fieldset
                    className={classes.fieldset}
                    aria-describedby={errors.objectTypesUuids ? `${id}-objectTypesUuids-error` : undefined}
                    {...fieldProps('objectTypesUuids')}
                >
                    <legend className={classes.legend}>Types d’objets</legend>
                    <button
                        type="button"
                        className={clsx('fr-btn fr-btn--tertiary fr-btn--sm', classes['select-all'])}
                        onClick={() =>
                            update({
                                objectTypesUuids: state.objectTypesUuids.length
                                    ? []
                                    : objectTypesToDisplay.map(({ uuid }) => uuid),
                            })
                        }
                    >
                        {state.objectTypesUuids.length ? 'Tout désélectionner' : 'Tout sélectionner'}
                    </button>
                    <div className={classes.options}>
                        {objectTypesToDisplay.map(({ uuid, name, color }) => (
                            <Checkbox
                                key={uuid}
                                className={classes.checkbox}
                                label={
                                    <span className={classes['type-label']}>
                                        {name}
                                        <ObjectTypeSquare color={color} />
                                    </span>
                                }
                                checked={state.objectTypesUuids.includes(uuid)}
                                onChange={(checked) =>
                                    update({ objectTypesUuids: toggle(state.objectTypesUuids, uuid, checked) })
                                }
                            />
                        ))}
                    </div>
                    {renderError('objectTypesUuids')}
                </fieldset>
            </section>

            <section className={classes.section} aria-labelledby={`${id}-ranking`} {...fieldProps('rankingCriteria')}>
                <h4 id={`${id}-ranking`} className={classes.title}>
                    Dans quel ordre
                </h4>
                <p className={classes.hint}>
                    Aigle classe les parcelles par le premier critère coché, puis départage les égalités avec le
                    suivant. Sans critère, elles sont classées par commune puis par parcelle.
                </p>
                <div className={classes.list}>
                    <SortableRows
                        items={state.rankingCriteria}
                        hint="Flèches haut et bas pour changer l’ordre du critère"
                        getKey={({ criterion }) => criterion}
                        getName={({ criterion }) => RANKING_CRITERIA_LABELS[criterion].label}
                        onMove={(row, target) =>
                            update({ rankingCriteria: moveItem(state.rankingCriteria, row, target) })
                        }
                        renderRow={(row, sortable) => (
                            <SortableCheckboxRow
                                name={RANKING_CRITERIA_LABELS[row.criterion].label}
                                label={RANKING_CRITERIA_LABELS[row.criterion].label}
                                hint={RANKING_CRITERIA_LABELS[row.criterion].hint}
                                position={activeRankingCriteria.indexOf(row) + 1}
                                checked={row.active}
                                onCheckedChange={(active) =>
                                    update({
                                        rankingCriteria: state.rankingCriteria.map((item) =>
                                            item.criterion === row.criterion ? { ...item, active } : item,
                                        ),
                                    })
                                }
                                sortable={sortable}
                            />
                        )}
                    />
                </div>
            </section>

            <section className={classes.section} aria-labelledby={`${id}-count`}>
                <h4 id={`${id}-count`} className={classes.title}>
                    Combien de parcelles
                </h4>
                <div
                    className={clsx(
                        'fr-input-group',
                        errors.parcelsCount && 'fr-input-group--error',
                        classes['number-field'],
                    )}
                    {...fieldProps('parcelsCount')}
                >
                    <label className="fr-label" htmlFor={`${id}-parcels-count`}>
                        Nombre de parcelles à proposer
                        <span className="fr-hint-text">
                            Choisissez-le selon vos capacités de contrôle sur la période.
                        </span>
                    </label>
                    <input
                        className={clsx('fr-input', errors.parcelsCount && 'fr-input--error')}
                        type="number"
                        id={`${id}-parcels-count`}
                        min={1}
                        max={MAX_PARCELS_COUNT}
                        step={1}
                        value={Number.isNaN(state.parcelsCount) ? '' : state.parcelsCount}
                        aria-describedby={errors.parcelsCount ? `${id}-parcelsCount-error` : undefined}
                        onChange={(event) => update({ parcelsCount: event.currentTarget.valueAsNumber })}
                    />
                    {renderError('parcelsCount')}
                </div>
            </section>

            <div className={classes.advanced}>
                <Accordion
                    flush
                    titleAs="h4"
                    expanded={advancedExpanded}
                    onToggle={onAdvancedExpandedChange}
                    title={
                        <span className={classes['advanced-title']}>
                            <span>
                                Critères avancés
                                {advancedDefault ? null : (
                                    <span className="fr-badge fr-badge--sm fr-badge--info fr-badge--no-icon fr-ml-1w">
                                        Modifiés
                                    </span>
                                )}
                            </span>
                            <span className={classes['advanced-summary']}>{describeAdvancedCriteria(state)}</span>
                        </span>
                    }
                >
                    <div className={classes['advanced-content']}>
                        <fieldset
                            className={classes.fieldset}
                            aria-describedby={errors.validationStatuses ? `${id}-validationStatuses-error` : undefined}
                            {...fieldProps('validationStatuses')}
                        >
                            <legend className={classes.legend}>États de conformité</legend>
                            {VALIDATION_STATUSES.map(({ status, hint }) => (
                                <Checkbox
                                    key={status}
                                    className={classes.checkbox}
                                    label={
                                        <>
                                            {DETECTION_VALIDATION_STATUSES_NAMES_MAP[status]}
                                            {hint ? <span className="fr-hint-text">{hint}</span> : null}
                                        </>
                                    }
                                    checked={state.validationStatuses.includes(status)}
                                    onChange={(checked) =>
                                        update({
                                            validationStatuses: toggle(state.validationStatuses, status, checked),
                                        })
                                    }
                                />
                            ))}
                            {renderError('validationStatuses')}
                            <p className={classes.hint}>
                                Seuls les objets «&nbsp;Non contrôlé&nbsp;» peuvent entrer dans le plan.
                            </p>
                        </fieldset>

                        <div className={classes.fieldset} {...fieldProps('scoreMin')}>
                            <p className={classes.legend} id={`${id}-score`}>
                                Score de fiabilité minimum
                            </p>
                            <Range
                                label="Score de fiabilité minimum"
                                labelHidden
                                min={0}
                                max={100}
                                step={5}
                                value={Math.round(state.scoreMin * 100)}
                                formatValue={formatScore}
                                describedBy={`${id}-score ${id}-score-hint`}
                                onChange={(value) => update({ scoreMin: value / 100 })}
                            />
                            <p id={`${id}-score-hint`} className={classes.hint}>
                                Plus le score est élevé, plus l’IA est sûre de sa détection. Les objets dessinés ou
                                rendus visibles par un agent sont retenus quel que soit leur score.
                            </p>
                        </div>

                        <fieldset className={classes.fieldset}>
                            <legend className={classes.legend}>Objets et parcelles à écarter</legend>
                            <Checkbox
                                className={classes.checkbox}
                                label="Inclure les objets prescrits"
                                checked={state.includePrescribed}
                                onChange={(includePrescribed) => update({ includePrescribed })}
                            />
                            <Checkbox
                                className={classes.checkbox}
                                label="Exclure les parcelles ayant une autorisation d’urbanisme"
                                checked={state.excludeAuthorizedParcels}
                                onChange={(excludeAuthorizedParcels) => update({ excludeAuthorizedParcels })}
                            />
                            <Checkbox
                                className={classes.checkbox}
                                label={
                                    <>
                                        Exclure les parcelles ayant déjà un PV
                                        <span className="fr-hint-text">
                                            Un objet de la parcelle est ou a été «&nbsp;PV dressé&nbsp;»,
                                            «&nbsp;Astreinte administrative&nbsp;» ou «&nbsp;En jugement&nbsp;».
                                        </span>
                                    </>
                                }
                                checked={state.excludeOfficialReportParcels}
                                onChange={(excludeOfficialReportParcels) => update({ excludeOfficialReportParcels })}
                            />
                        </fieldset>

                        <div
                            className={clsx(
                                'fr-input-group',
                                errors.minObjectsCount && 'fr-input-group--error',
                                classes['number-field'],
                            )}
                            {...fieldProps('minObjectsCount')}
                        >
                            <label className="fr-label" htmlFor={`${id}-min-objects`}>
                                Nombre minimum d’objets sur la parcelle
                            </label>
                            <input
                                className={clsx('fr-input', errors.minObjectsCount && 'fr-input--error')}
                                type="number"
                                id={`${id}-min-objects`}
                                min={1}
                                step={1}
                                value={Number.isNaN(state.minObjectsCount) ? '' : state.minObjectsCount}
                                aria-describedby={errors.minObjectsCount ? `${id}-minObjectsCount-error` : undefined}
                                onChange={(event) => update({ minObjectsCount: event.currentTarget.valueAsNumber })}
                            />
                            {renderError('minObjectsCount')}
                        </div>
                    </div>
                </Accordion>
            </div>
        </div>
    );
};

export default Component;

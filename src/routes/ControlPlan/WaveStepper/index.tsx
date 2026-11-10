import React, { useEffect, useMemo, useRef, useState } from 'react';

import { controlPlanEndpoints, controlPlanWaveEndpoints, geoEndpoints } from '@/api/endpoints';
import Stepper from '@/components/dsfr/Stepper';
import Loader from '@/components/ui/Loader';
import {
    ControlPlan,
    ControlPlanCriteriaOptions,
    ControlPlanEligibleCount,
    ControlPlanValidationReport,
    ControlPlanWave,
    ControlPlanWaveInput,
} from '@/models/control-plan';
import { GeoCollectivity } from '@/models/geo/_common';
import ConfirmModal from '@/routes/ControlPlan/ConfirmModal';
import {
    ADVANCED_FIELDS,
    CRITERIA_FIELD_ATTRIBUTE,
    CRITERIA_FIELD_LABELS,
    CRITERIA_FIELDS_ORDER,
    CriteriaFormErrors,
    CriteriaFormState,
    criteriaFormStateToInput,
    describeCriteria,
    getDefaultPerimeterLabels,
    getInitialCriteriaFormState,
    validateCriteriaFormState,
} from '@/routes/ControlPlan/criteria';
import CriteriaForm from '@/routes/ControlPlan/CriteriaForm';
import CriteriaSummary from '@/routes/ControlPlan/CriteriaSummary';
import ErrorAlert from '@/routes/ControlPlan/ErrorAlert';
import Prerequisites from '@/routes/ControlPlan/Prerequisites';
import { hasNoZone, usePrerequisites } from '@/routes/ControlPlan/prerequisites-query';
import Proposal from '@/routes/ControlPlan/Proposal';
import {
    CONTROL_PLAN_QUERY_KEY,
    formatCount,
    invalidateControlPlanQueries,
    trackControlPlanError,
    trackControlPlanEvent,
} from '@/routes/ControlPlan/utils';
import ValidationStep from '@/routes/ControlPlan/ValidationStep';
import api, { ApiError } from '@/utils/api';
import { geoZoneToGeoOption } from '@/utils/geojson';
import { scrollBelowHeader } from '@/utils/html';
import { useDebouncedValue } from '@mantine/hooks';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import classes from './index.module.scss';

const STEPS = [
    { title: 'Prérequis', trackingName: 'PREREQUISITES' },
    { title: 'Critères', trackingName: 'CRITERIA' },
    { title: 'Proposition', trackingName: 'PROPOSAL' },
    { title: 'Validation', trackingName: 'VALIDATION' },
];

const FORM_ID = 'control-plan-criteria';

// the count waits for the agent to stop changing the criteria: each one costs a few seconds of computation
const ELIGIBLE_COUNT_DEBOUNCE_MS = 800;

type Step = 1 | 2 | 3 | 4;

// The names of a perimeter only known by its uuids (a wave reloaded): the selects and the summaries show them.
const fetchPerimeterLabels = async (communesUuids: string[], epcisUuids: string[]) => {
    const results = await Promise.allSettled([
        ...communesUuids.map((uuid) => api<GeoCollectivity>(geoEndpoints.commune.detail(uuid))),
        ...epcisUuids.map((uuid) => api<GeoCollectivity>(geoEndpoints.epci.detail(uuid))),
    ]);

    return results.reduce<Record<string, string>>((labels, result) => {
        if (result.status === 'fulfilled') {
            labels[result.value.uuid] = geoZoneToGeoOption(result.value).label;
        }
        return labels;
    }, {});
};

/**
 * The plan's draft carries the latest counts (an exclusion changes them without recomputing), but a
 * computation answers before the plan reloads with it: the more recently computed of the two wins.
 */
const getShownWave = (draftWave: ControlPlanWave | null, computedWave?: ControlPlanWave) => {
    if (!computedWave || (draftWave && draftWave.uuid !== computedWave.uuid)) {
        return draftWave ?? undefined;
    }

    if (!draftWave) {
        return computedWave;
    }

    return (computedWave.computedAt ?? '') > (draftWave.computedAt ?? '') ? computedWave : draftWave;
};

// a draft reopens on its proposal; the waves after the first skip the reminder of the prerequisites
const getInitialStep = (plan: ControlPlan): Step => {
    if (plan.draftWave) {
        return 3;
    }

    return plan.validatedWavesCount ? 2 : 1;
};

const getRankingTrackingName = ({ criteria }: ControlPlanWaveInput) =>
    criteria.rankingCriteria.length ? criteria.rankingCriteria.join(' > ') : 'AUCUN';

const focusField = (form: HTMLFormElement | null, field: string) => {
    const container = form?.querySelector<HTMLElement>(`[${CRITERIA_FIELD_ATTRIBUTE}="${field}"]`);
    // the first box or field, not a « Tout sélectionner » before it
    const control =
        container?.querySelector<HTMLElement>('input, select, textarea') ??
        container?.querySelector<HTMLElement>('button');

    (control ?? container)?.focus({ preventScroll: true });
    scrollBelowHeader(container ?? null);
};

interface EligibleCountProps {
    formValid: boolean;
    parcelsCount: number;
    data?: ControlPlanEligibleCount;
    error: ApiError | null;
    pending: boolean;
}

// What the criteria would find now: read before generating, to adjust them without a round trip.
const EligibleCount: React.FC<EligibleCountProps> = ({
    formValid,
    parcelsCount,
    data,
    error,
    pending,
}: EligibleCountProps) => {
    let main: React.ReactNode;
    let detail: React.ReactNode = null;

    if (!formValid) {
        main = 'Complétez les critères pour connaître le nombre de parcelles éligibles.';
    } else if (error && !data) {
        main =
            error.status === 503
                ? 'Le nombre de parcelles éligibles est trop long à calculer sur ce périmètre.'
                : 'Le nombre de parcelles éligibles n’a pas pu être calculé.';
        detail = 'Vous pouvez tout de même générer la proposition.';
    } else if (!data) {
        main = 'Calcul du nombre de parcelles éligibles…';
    } else if (!data.eligibleParcelsCount) {
        main = <b>Aucune parcelle ne répond à ces critères</b>;
        detail = 'Élargissez-les : périmètre, zones, types d’objets ou critères avancés.';
    } else {
        main = (
            <>
                <b>{formatCount(data.eligibleParcelsCount, 'parcelle répond', 'parcelles répondent')}</b> à ces critères
            </>
        );
        detail =
            Number.isInteger(parcelsCount) && parcelsCount > 0 && parcelsCount < data.eligibleParcelsCount
                ? `Aigle proposera les ${formatCount(parcelsCount, 'première', 'premières')}, par ordre de priorité.`
                : 'Aigle les proposera toutes, par ordre de priorité.';
    }

    return (
        <div className={classes.count}>
            <p className={classes['count-main']}>
                {main}
                {pending && data ? <span className={classes['count-pending']}> · mise à jour…</span> : null}
            </p>
            {detail ? <p className={classes['count-detail']}>{detail}</p> : null}
            {/* read once the count settles, not at each step of the debounce */}
            <p className="fr-sr-only" role="status">
                {pending ? null : (
                    <>
                        {main} {detail}
                    </>
                )}
            </p>
        </div>
    );
};

interface ComponentProps {
    plan: ControlPlan;
    // opened from a button: its title takes the focus
    focusOnMount?: boolean;
    // absent for the first wave: there is no follow-up to go back to yet
    onClose?: () => void;
    onValidated: (report: ControlPlanValidationReport) => void;
}

const Component: React.FC<ComponentProps> = ({ plan, focusOnMount = false, onClose, onValidated }: ComponentProps) => {
    const queryClient = useQueryClient();
    const formRef = useRef<HTMLFormElement>(null);
    const [step, setStep] = useState<Step>(() => getInitialStep(plan));
    const [formState, setFormState] = useState<CriteriaFormState>();
    const [formErrors, setFormErrors] = useState<CriteriaFormErrors>({});
    const [advancedExpanded, setAdvancedExpanded] = useState(false);
    // bumped on each invalid submission: the first invalid field takes the focus once rendered
    const [errorsFocusRequest, setErrorsFocusRequest] = useState(0);
    const [perimeterLabels, setPerimeterLabels] = useState<Record<string, string>>({});
    // the wave just computed, until the plan reloaded with it
    const [computedWave, setComputedWave] = useState<ControlPlanWave>();
    const [abandonOpened, setAbandonOpened] = useState(false);
    const wave = getShownWave(plan.draftWave, computedWave);
    const waveNumber = wave?.number ?? plan.validatedWavesCount + 1;

    const { data: prerequisites } = usePrerequisites(plan.userGroup.uuid);
    const noZone = hasNoZone(prerequisites);

    const { data: options, error: optionsError } = useQuery({
        queryKey: [CONTROL_PLAN_QUERY_KEY, 'criteria-options', plan.uuid],
        queryFn: ({ signal }) =>
            api<ControlPlanCriteriaOptions>(controlPlanEndpoints.criteriaOptions(plan.uuid), { signal }),
    });

    // From the draft being edited, else from the last validated wave, else the defaults.
    const criteriaSource: ControlPlanWaveInput | null = plan.draftWave ?? plan.lastValidatedWave;
    useEffect(() => {
        if (!options || formState) {
            return;
        }

        setFormState(getInitialCriteriaFormState(options, criteriaSource?.criteria, criteriaSource?.parcelsCount));
        setPerimeterLabels((labels) => ({ ...getDefaultPerimeterLabels(options), ...labels }));
    }, [options, formState, criteriaSource]);

    const missingCommunesUuids = formState?.communesUuids.filter((uuid) => !perimeterLabels[uuid]) ?? [];
    const missingEpcisUuids = formState?.epcisUuids.filter((uuid) => !perimeterLabels[uuid]) ?? [];
    const { data: fetchedLabels, isLoading: perimeterLabelsLoading } = useQuery({
        queryKey: [CONTROL_PLAN_QUERY_KEY, 'perimeter-labels', missingCommunesUuids, missingEpcisUuids],
        queryFn: () => fetchPerimeterLabels(missingCommunesUuids, missingEpcisUuids),
        enabled: missingCommunesUuids.length + missingEpcisUuids.length > 0,
        staleTime: Infinity,
    });
    const labels = useMemo(() => ({ ...fetchedLabels, ...perimeterLabels }), [fetchedLabels, perimeterLabels]);

    // one event per step shown, not per render (StrictMode runs effects twice)
    const trackedStepRef = useRef<Step | null>(null);
    useEffect(() => {
        if (trackedStepRef.current === step) {
            return;
        }
        trackedStepRef.current = step;
        trackControlPlanEvent('Étape affichée', STEPS[step - 1].trackingName);
    }, [step]);

    useEffect(() => {
        if (!errorsFocusRequest) {
            return;
        }

        const field = CRITERIA_FIELDS_ORDER.find((key) => formErrors[key]);
        if (field) {
            focusField(formRef.current, field);
        }
        // only on a new submission: fixing a field must not pull the focus elsewhere
    }, [errorsFocusRequest]);

    const formValid = !!formState && !Object.keys(validateCriteriaFormState(formState)).length;
    // a string: the debounce compares by value, a new object each render would never settle
    const countBody = useMemo(
        () =>
            formState && options && formValid
                ? JSON.stringify({ criteria: criteriaFormStateToInput(formState, options).criteria })
                : '',
        [formState, options, formValid],
    );
    const [debouncedCountBody] = useDebouncedValue(countBody, ELIGIBLE_COUNT_DEBOUNCE_MS);
    const {
        data: eligibleCount,
        error: eligibleCountError,
        isFetching: eligibleCountFetching,
    } = useQuery<ControlPlanEligibleCount, ApiError>({
        queryKey: [CONTROL_PLAN_QUERY_KEY, 'eligible-count', plan.uuid, debouncedCountBody],
        queryFn: ({ signal }) =>
            api<ControlPlanEligibleCount>(controlPlanEndpoints.eligibleCount(plan.uuid), {
                method: 'POST',
                body: JSON.parse(debouncedCountBody),
                signal,
            }),
        enabled: step === 2 && !!debouncedCountBody,
        placeholderData: keepPreviousData,
        staleTime: 60_000,
        retry: false,
    });

    const generateMutation = useMutation<ControlPlanWave, ApiError, ControlPlanWaveInput>({
        mutationFn: (input) =>
            wave
                ? api<ControlPlanWave>(controlPlanWaveEndpoints.detail(wave.uuid), { method: 'PATCH', body: input })
                : api<ControlPlanWave>(controlPlanWaveEndpoints.create, {
                      method: 'POST',
                      body: { ...input, controlPlanUuid: plan.uuid },
                  }),
        onSuccess: (computed, input) => {
            trackControlPlanEvent(
                wave ? 'Proposition recalculée' : 'Proposition générée',
                getRankingTrackingName(input),
                computed.eligibleParcelsCount,
            );
            setComputedWave(computed);
            invalidateControlPlanQueries(queryClient);
            setStep(3);
        },
        onError: (error) =>
            trackControlPlanError(wave ? 'Recalcul de la proposition' : 'Calcul de la proposition', error),
    });

    const abandonMutation = useMutation<void, ApiError, ControlPlanWave>({
        mutationFn: async (draft) => {
            await api(controlPlanWaveEndpoints.detail(draft.uuid), { method: 'DELETE' });
            // the plan reloaded without its draft, or the follow-up would offer to resume it
            await invalidateControlPlanQueries(queryClient);
        },
        onSuccess: (_, draft) => {
            trackControlPlanEvent('Proposition abandonnée', undefined, draft.number);
            setAbandonOpened(false);
            setComputedWave(undefined);

            if (onClose) {
                onClose();
            } else {
                setStep(1);
            }
        },
        onError: (error) => trackControlPlanError('Abandon de la proposition', error),
    });

    const generate = () => {
        if (!formState || !options) {
            return;
        }

        const errors = validateCriteriaFormState(formState);
        setFormErrors(errors);

        if (Object.keys(errors).length) {
            if (ADVANCED_FIELDS.some((field) => errors[field])) {
                setAdvancedExpanded(true);
            }
            setErrorsFocusRequest((request) => request + 1);
            return;
        }

        generateMutation.mutate(criteriaFormStateToInput(formState, options));
    };

    // the criteria of the wave in words, for the validation step
    const waveSummary = useMemo(
        () =>
            wave && options
                ? describeCriteria(
                      getInitialCriteriaFormState(options, wave.criteria, wave.parcelsCount),
                      options,
                      labels,
                  )
                : undefined,
        [wave, options, labels],
    );

    const renderCriteriaStep = () => {
        if (optionsError) {
            return <ErrorAlert error={optionsError} fallback="Les critères n’ont pas pu être chargés." />;
        }

        if (!options || !formState) {
            return <Loader className={classes.loader} />;
        }

        const errorFields = CRITERIA_FIELDS_ORDER.filter((field) => formErrors[field]);

        return (
            <form
                ref={formRef}
                noValidate
                className={classes.form}
                onSubmit={(event) => {
                    event.preventDefault();
                    generate();
                }}
            >
                {!wave && plan.lastValidatedWave ? (
                    <div className="fr-alert fr-alert--info fr-alert--sm">
                        <p>
                            Les critères de la vague {plan.lastValidatedWave.number} sont repris : ajustez-les, ou
                            générez directement la proposition.
                        </p>
                    </div>
                ) : null}

                <CriteriaForm
                    id={FORM_ID}
                    state={formState}
                    onChange={(state) => {
                        setFormState(state);
                        if (errorFields.length) {
                            setFormErrors(validateCriteriaFormState(state));
                        }
                    }}
                    perimeterLabels={labels}
                    perimeterLabelsLoading={perimeterLabelsLoading}
                    onPerimeterLabelsChange={setPerimeterLabels}
                    options={options}
                    errors={formErrors}
                    advancedExpanded={advancedExpanded}
                    onAdvancedExpandedChange={setAdvancedExpanded}
                />

                <section className={classes.recap} aria-labelledby={`${FORM_ID}-recap`}>
                    <h4 id={`${FORM_ID}-recap`} className={classes['recap-title']}>
                        Récapitulatif
                    </h4>
                    <CriteriaSummary summary={describeCriteria(formState, options, labels)} />
                </section>

                {errorFields.length ? (
                    <div className="fr-alert fr-alert--error fr-alert--sm" role="alert">
                        <p>Certains critères sont à corriger :</p>
                        <ul className={classes['error-list']}>
                            {errorFields.map((field) => (
                                <li key={field}>
                                    <a
                                        href={`#${FORM_ID}-${field}`}
                                        onClick={(event) => {
                                            event.preventDefault();
                                            if (ADVANCED_FIELDS.includes(field)) {
                                                setAdvancedExpanded(true);
                                            }
                                            focusField(formRef.current, field);
                                        }}
                                    >
                                        {CRITERIA_FIELD_LABELS[field]} : {formErrors[field]}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
                {generateMutation.isError ? (
                    <ErrorAlert
                        error={generateMutation.error}
                        fallback="La proposition n’a pas pu être calculée, veuillez réessayer."
                    />
                ) : null}

                {/* stays in view while the criteria scroll: the count answers each change */}
                <div className={classes.bar}>
                    <EligibleCount
                        formValid={formValid}
                        parcelsCount={formState.parcelsCount}
                        data={eligibleCount}
                        error={eligibleCountError}
                        pending={eligibleCountFetching || countBody !== debouncedCountBody}
                    />
                    <ul className={clsx('fr-btns-group fr-btns-group--inline', classes['bar-buttons'])}>
                        <li>
                            <button type="button" className="fr-btn fr-btn--secondary" onClick={() => setStep(1)}>
                                Retour
                            </button>
                        </li>
                        <li>
                            <button type="submit" className="fr-btn" disabled={generateMutation.isPending || noZone}>
                                {generateMutation.isPending ? 'Calcul de la proposition…' : 'Générer la proposition'}
                            </button>
                        </li>
                    </ul>
                </div>
            </form>
        );
    };

    const renderStep = () => {
        if (step === 1) {
            return (
                <>
                    <Prerequisites userGroupUuid={plan.userGroup.uuid} />
                    <ul className="fr-btns-group fr-btns-group--inline-md">
                        <li>
                            <button type="button" className="fr-btn" disabled={noZone} onClick={() => setStep(2)}>
                                Continuer
                            </button>
                        </li>
                    </ul>
                </>
            );
        }

        if (step === 2) {
            return renderCriteriaStep();
        }

        if (!wave) {
            return (
                <div className="fr-alert fr-alert--info fr-alert--sm">
                    <p>Aucune proposition en cours : générez-la depuis l’étape des critères.</p>
                    <button type="button" className="fr-btn fr-btn--sm fr-mt-1w" onClick={() => setStep(2)}>
                        Définir les critères
                    </button>
                </div>
            );
        }

        if (step === 3) {
            return (
                <>
                    <Proposal controlPlanUuid={plan.uuid} wave={wave} canEdit={plan.canEdit} />
                    <ul className="fr-btns-group fr-btns-group--inline-md fr-mt-3w">
                        <li>
                            <button
                                type="button"
                                className="fr-btn"
                                disabled={!wave.proposal.proposedCount}
                                onClick={() => setStep(4)}
                            >
                                Continuer vers la validation
                            </button>
                        </li>
                        <li>
                            <button type="button" className="fr-btn fr-btn--secondary" onClick={() => setStep(2)}>
                                Modifier les critères
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                className="fr-btn fr-btn--tertiary"
                                onClick={() => {
                                    abandonMutation.reset();
                                    setAbandonOpened(true);
                                }}
                            >
                                Abandonner la proposition
                            </button>
                        </li>
                    </ul>
                </>
            );
        }

        return (
            <ValidationStep
                plan={plan}
                wave={wave}
                criteriaSummary={waveSummary}
                onBack={() => setStep(3)}
                onValidated={onValidated}
            />
        );
    };

    return (
        <section className={classes.container} aria-label="Préparation d’une vague du plan">
            {onClose ? (
                <button
                    type="button"
                    className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-left-line fr-btn--icon-left"
                    onClick={onClose}
                >
                    Retour au suivi du plan
                </button>
            ) : null}
            <Stepper
                steps={STEPS.map(({ title }) => title)}
                currentStep={step}
                titleAs="h3"
                statePrefix={`Vague ${waveNumber}`}
                focusOnStepChange
                focusOnMount={focusOnMount}
            />
            {renderStep()}

            <ConfirmModal
                opened={abandonOpened}
                title="Abandonner la proposition"
                confirmLabel="Abandonner"
                pending={abandonMutation.isPending}
                error={abandonMutation.isError ? abandonMutation.error : null}
                errorFallback="La proposition n’a pas été abandonnée, veuillez réessayer."
                onConfirm={() => wave && abandonMutation.mutate(wave)}
                onClose={() => setAbandonOpened(false)}
            >
                <p>
                    La proposition en cours est supprimée, aucun statut n’est modifié. Les parcelles que vous avez
                    écartées restent écartées.
                </p>
            </ConfirmModal>
        </section>
    );
};

export default Component;

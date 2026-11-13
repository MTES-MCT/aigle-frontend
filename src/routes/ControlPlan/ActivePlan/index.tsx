import React, { useEffect, useRef, useState } from 'react';

import { controlPlanEndpoints } from '@/api/endpoints';
import { ControlPlan, ControlPlanGroup, ControlPlanValidationReport } from '@/models/control-plan';
import ConfirmModal from '@/routes/ControlPlan/ConfirmModal';
import FollowUp from '@/routes/ControlPlan/FollowUp';
import PlanFormModal from '@/routes/ControlPlan/PlanFormModal';
import {
    formatCount,
    formatPlanPeriod,
    invalidateControlPlanQueries,
    trackControlPlanError,
    trackControlPlanEvent,
} from '@/routes/ControlPlan/utils';
import WaveStepper from '@/routes/ControlPlan/WaveStepper';
import api, { ApiError } from '@/utils/api';
import { scrollBelowHeader } from '@/utils/html';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import classes from './index.module.scss';

type PlanAction = 'close' | 'delete';

interface ComponentProps {
    plan: ControlPlan;
    group: ControlPlanGroup;
}

const Component: React.FC<ComponentProps> = ({ plan, group }: ComponentProps) => {
    const queryClient = useQueryClient();
    // the stepper reopens on the draft left in progress
    const [waveOpened, setWaveOpened] = useState(() => !!plan.draftWave);
    const [validationReport, setValidationReport] = useState<ControlPlanValidationReport>();
    const [editOpened, setEditOpened] = useState(false);
    const [pendingAction, setPendingAction] = useState<PlanAction>();
    // the stepper opened from a button takes the focus; closing it gives it back to the plan's title
    const [waveOpenedByUser, setWaveOpenedByUser] = useState(false);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const [titleFocusRequest, setTitleFocusRequest] = useState(0);

    useEffect(() => {
        if (titleFocusRequest && titleRef.current) {
            titleRef.current.focus({ preventScroll: true });
            scrollBelowHeader(titleRef.current);
        }
    }, [titleFocusRequest]);

    // nothing to follow before the first wave: the stepper is the plan
    const firstWave = plan.validatedWavesCount === 0;
    const stepperShown = plan.canEdit && !validationReport && (waveOpened || firstWave);

    const actionMutation = useMutation<unknown, ApiError, PlanAction>({
        mutationFn: (action) =>
            action === 'close'
                ? api(controlPlanEndpoints.close(plan.uuid), { method: 'POST' })
                : api(controlPlanEndpoints.detail(plan.uuid), { method: 'DELETE' }),
        onSuccess: (_, action) => {
            trackControlPlanEvent(
                action === 'close' ? 'Plan clôturé' : 'Plan supprimé',
                undefined,
                plan.counters.planned,
            );
            setPendingAction(undefined);
            // a closed plan leaves the « Uniquement mon plan de contrôle » filter
            invalidateControlPlanQueries(queryClient, { detections: action === 'close' });
        },
        onError: (error, action) =>
            trackControlPlanError(action === 'close' ? 'Clôture du plan' : 'Suppression du plan', error),
    });

    return (
        <section className={classes.container} aria-labelledby={`control-plan-${plan.uuid}`}>
            <div className={classes.header}>
                <div className={classes.heading}>
                    <h2 id={`control-plan-${plan.uuid}`} ref={titleRef} tabIndex={-1} className={classes.title}>
                        {plan.name}
                    </h2>
                    <p className={classes.period}>
                        {formatPlanPeriod(plan)} · {group.name}
                        {plan.isExpired ? (
                            <span className="fr-badge fr-badge--sm fr-badge--warning fr-ml-1w">Période terminée</span>
                        ) : null}
                    </p>
                </div>
                {plan.canEdit ? (
                    <ul className="fr-btns-group fr-btns-group--inline fr-btns-group--sm fr-btns-group--icon-left">
                        <li>
                            <button
                                type="button"
                                className="fr-btn fr-btn--tertiary fr-btn--icon-left fr-icon-edit-line"
                                onClick={() => setEditOpened(true)}
                            >
                                Modifier
                            </button>
                        </li>
                        <li>
                            <button
                                type="button"
                                className="fr-btn fr-btn--tertiary fr-btn--icon-left fr-icon-close-circle-line"
                                onClick={() => {
                                    actionMutation.reset();
                                    setPendingAction(firstWave ? 'delete' : 'close');
                                }}
                            >
                                {firstWave ? 'Supprimer le plan' : 'Clôturer le plan'}
                            </button>
                        </li>
                    </ul>
                ) : null}
            </div>

            {stepperShown ? (
                <WaveStepper
                    plan={plan}
                    focusOnMount={waveOpenedByUser}
                    onClose={
                        firstWave
                            ? undefined
                            : () => {
                                  setWaveOpened(false);
                                  setTitleFocusRequest((request) => request + 1);
                              }
                    }
                    onValidated={(report) => {
                        setValidationReport(report);
                        setWaveOpened(false);
                    }}
                />
            ) : (
                <FollowUp
                    plan={plan}
                    validationReport={validationReport}
                    onDismissValidationReport={() => setValidationReport(undefined)}
                    onOpenWave={() => {
                        setValidationReport(undefined);
                        setWaveOpenedByUser(true);
                        setWaveOpened(true);
                    }}
                />
            )}

            <PlanFormModal
                opened={editOpened}
                plan={plan}
                group={group}
                onClose={() => setEditOpened(false)}
                onSaved={() => setEditOpened(false)}
            />

            <ConfirmModal
                opened={!!pendingAction}
                title={pendingAction === 'delete' ? 'Supprimer le plan de contrôle' : 'Clôturer le plan de contrôle'}
                confirmLabel={pendingAction === 'delete' ? 'Supprimer' : 'Clôturer'}
                pending={actionMutation.isPending}
                error={actionMutation.isError ? actionMutation.error : null}
                errorFallback="L’opération a échoué, veuillez réessayer."
                onConfirm={() => pendingAction && actionMutation.mutate(pendingAction)}
                onClose={() => setPendingAction(undefined)}
            >
                {pendingAction === 'delete' ? (
                    <p>
                        Aucune parcelle n’a encore été validée dans ce plan : il est supprimé avec la proposition en
                        cours, sans modifier aucun statut.
                    </p>
                ) : (
                    <>
                        <p>
                            Le plan passe dans les plans clôturés et la proposition en cours est abandonnée. Vous
                            pourrez ensuite créer le plan de la période suivante.
                        </p>
                        {plan.counters.toControl ? (
                            <p>
                                {formatCount(plan.counters.toControl, 'parcelle reste', 'parcelles restent')}{' '}
                                «&nbsp;À&nbsp;contrôler&nbsp;» :{' '}
                                {plan.counters.toControl > 1
                                    ? 'elles gardent ce statut et apparaîtront'
                                    : 'elle garde ce statut et apparaîtra'}{' '}
                                hors plan dans le plan suivant.
                            </p>
                        ) : null}
                    </>
                )}
            </ConfirmModal>
        </section>
    );
};

export default Component;

import React from 'react';

import { controlPlanWaveEndpoints } from '@/api/endpoints';
import { ControlPlan, ControlPlanValidationReport, ControlPlanWave } from '@/models/control-plan';
import { CriteriaSummary as CriteriaSummaryData } from '@/routes/ControlPlan/criteria';
import CriteriaSummary from '@/routes/ControlPlan/CriteriaSummary';
import ErrorAlert from '@/routes/ControlPlan/ErrorAlert';
import {
    formatCount,
    invalidateControlPlanQueries,
    trackControlPlanError,
    trackControlPlanEvent,
} from '@/routes/ControlPlan/utils';
import api, { ApiError } from '@/utils/api';
import { formatBigInt } from '@/utils/format';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import classes from './index.module.scss';

interface ComponentProps {
    plan: ControlPlan;
    wave: ControlPlanWave;
    // absent until the criteria options are loaded
    criteriaSummary?: CriteriaSummaryData;
    onBack: () => void;
    onValidated: (report: ControlPlanValidationReport) => void;
}

// The step is the confirmation: everything the validation does is said here, before the one button.
const Component: React.FC<ComponentProps> = ({ plan, wave, criteriaSummary, onBack, onValidated }: ComponentProps) => {
    const queryClient = useQueryClient();
    const { proposal } = wave;

    const mutation = useMutation<ControlPlanValidationReport, ApiError>({
        mutationFn: () =>
            api<ControlPlanValidationReport>(controlPlanWaveEndpoints.validate(wave.uuid), { method: 'POST' }),
        onSuccess: (report) => {
            trackControlPlanEvent('Plan validé', String(wave.number), report.plannedParcelsCount);
            invalidateControlPlanQueries(queryClient, { detections: true });
            onValidated(report);
        },
        onError: (error) => trackControlPlanError('Validation du plan', error),
    });

    return (
        <div className={classes.container}>
            <p className={classes.lead}>
                {wave.number > 1
                    ? `Cette vague ajoutera au plan «\u00a0${plan.name}\u00a0» `
                    : `Le plan «\u00a0${plan.name}\u00a0» comptera `}
                <b>{formatCount(proposal.proposedCount, 'parcelle')}</b> : leurs{' '}
                <b>{formatCount(proposal.objectsCount, 'objet')}</b> passeront «&nbsp;À contrôler&nbsp;».
            </p>
            <ul className={classes.list}>
                {proposal.unverifiedObjectsCount ? (
                    <li>
                        {formatCount(
                            proposal.unverifiedObjectsCount,
                            'objet «\u00a0Non vérifié\u00a0» passera',
                            'objets «\u00a0Non vérifié\u00a0» passeront',
                        )}{' '}
                        aussi «&nbsp;Suspect&nbsp;».
                    </li>
                ) : null}
                <li>Les objets déjà en cours de contrôle ou de procédure gardent leur statut.</li>
                <li>Le plan est partagé avec tous les membres du groupe {plan.userGroup.name}.</li>
                {proposal.excludedCount ? (
                    <li>
                        Les parcelles écartées ({formatBigInt(proposal.excludedCount)}) ne seront plus proposées dans ce
                        plan, sauf si vous les réintégrez.
                    </li>
                ) : null}
                <li>
                    Vous pourrez retirer une parcelle du plan à tout moment : ses objets encore «&nbsp;À
                    contrôler&nbsp;» reviendront «&nbsp;Non contrôlé&nbsp;».
                </li>
            </ul>

            {criteriaSummary ? (
                <section className={classes.recap} aria-labelledby={`validation-recap-${wave.uuid}`}>
                    <h4 id={`validation-recap-${wave.uuid}`} className={classes['recap-title']}>
                        Critères de la proposition
                    </h4>
                    <CriteriaSummary summary={criteriaSummary} />
                </section>
            ) : null}

            {mutation.isError ? (
                <ErrorAlert error={mutation.error} fallback="Le plan n’a pas été validé, veuillez réessayer." />
            ) : null}

            <ul className="fr-btns-group fr-btns-group--inline-md">
                <li>
                    <button
                        type="button"
                        className="fr-btn"
                        disabled={!proposal.proposedCount || mutation.isPending}
                        onClick={() => mutation.mutate()}
                    >
                        {mutation.isPending ? 'Validation en cours…' : 'Valider le plan'}
                    </button>
                </li>
                <li>
                    <button
                        type="button"
                        className="fr-btn fr-btn--secondary"
                        disabled={mutation.isPending}
                        onClick={onBack}
                    >
                        Revenir à la proposition
                    </button>
                </li>
            </ul>
        </div>
    );
};

export default Component;

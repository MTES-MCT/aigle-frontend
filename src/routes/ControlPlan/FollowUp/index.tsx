import React, { useEffect, useRef, useState } from 'react';

import { controlPlanEndpoints } from '@/api/endpoints';
import Tabs, { TabsItem } from '@/components/dsfr/Tabs';
import { ControlPlan, ControlPlanValidationReport, OutOfPlanParcel } from '@/models/control-plan';
import { Paginated } from '@/models/data';
import OutOfPlanTable from '@/routes/ControlPlan/OutOfPlanTable';
import PlanParcelsTable from '@/routes/ControlPlan/PlanParcelsTable';
import { CONTROL_PLAN_QUERY_KEY, formatCount, trackControlPlanEvent } from '@/routes/ControlPlan/utils';
import api from '@/utils/api';
import { formatBigInt, formatDateOnly } from '@/utils/format';
import { scrollBelowHeader } from '@/utils/html';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import classes from './index.module.scss';

type FollowUpTab = 'PLANNED' | 'OUT_OF_PLAN' | 'EXCLUDED_REMOVED';

interface ValidationReportProps {
    report: ControlPlanValidationReport;
    onDismiss: () => void;
}

// Shown in place of the stepper that was just validated: it takes the focus the stepper had.
const ValidationReport: React.FC<ValidationReportProps> = ({ report, onDismiss }: ValidationReportProps) => {
    const titleRef = useRef<HTMLHeadingElement>(null);

    useEffect(() => {
        titleRef.current?.focus({ preventScroll: true });
        scrollBelowHeader(titleRef.current);
    }, []);

    return (
        <div className={clsx('fr-alert fr-alert--success', classes.alert)}>
            <h3 ref={titleRef} tabIndex={-1} className="fr-alert__title">
                Plan validé
            </h3>
            <p>
                {formatCount(report.plannedParcelsCount, 'parcelle ajoutée', 'parcelles ajoutées')} au plan,{' '}
                {formatCount(report.switchedObjectsCount, 'objet passé', 'objets passés')} «&nbsp;À contrôler&nbsp;».
            </p>
            {report.skippedParcels.length ? (
                <>
                    <p>
                        {formatCount(
                            report.skippedParcels.length,
                            'parcelle n’était plus éligible et a été laissée',
                            'parcelles n’étaient plus éligibles et ont été laissées',
                        )}{' '}
                        de côté :
                    </p>
                    <ul>
                        {report.skippedParcels.map(({ idParcellaire, communeName }) => (
                            <li key={idParcellaire}>
                                {idParcellaire}
                                {communeName ? ` (${communeName})` : ''}
                            </li>
                        ))}
                    </ul>
                </>
            ) : null}
            <button type="button" className="fr-btn--close fr-btn" title="Masquer le message" onClick={onDismiss}>
                Masquer le message
            </button>
        </div>
    );
};

interface ComponentProps {
    plan: ControlPlan;
    validationReport?: ControlPlanValidationReport;
    onDismissValidationReport: () => void;
    // opens the wave stepper: a new wave, or the draft in progress
    onOpenWave: () => void;
}

const Component: React.FC<ComponentProps> = ({
    plan,
    validationReport,
    onDismissValidationReport,
    onOpenWave,
}: ComponentProps) => {
    const [tab, setTab] = useState<FollowUpTab>('PLANNED');
    const { counters, draftWave, canEdit } = plan;
    const treatedCount = counters.planned - counters.toControl;
    const progress = counters.planned ? Math.round((treatedCount / counters.planned) * 100) : 0;

    const { data: outOfPlanCount } = useQuery({
        queryKey: [CONTROL_PLAN_QUERY_KEY, 'out-of-plan-count', plan.uuid],
        queryFn: async ({ signal }) => {
            const page = await api<Paginated<OutOfPlanParcel>>(controlPlanEndpoints.outOfPlan(plan.uuid), {
                params: { limit: 1, offset: 0 },
                signal,
            });
            return page.count;
        },
    });

    const tabs: TabsItem<FollowUpTab>[] = [
        { value: 'PLANNED', label: `Au plan (${formatBigInt(counters.planned)})` },
        {
            value: 'OUT_OF_PLAN',
            label: outOfPlanCount === undefined ? 'Hors plan' : `Hors plan (${formatBigInt(outOfPlanCount)})`,
        },
        {
            value: 'EXCLUDED_REMOVED',
            label: `Écartées et retirées (${formatBigInt(counters.excluded + counters.removed)})`,
            shortLabel: 'Écartées',
        },
    ];

    return (
        <div className={classes.container}>
            {validationReport ? (
                <ValidationReport report={validationReport} onDismiss={onDismissValidationReport} />
            ) : null}

            {plan.isExpired ? (
                <div className={clsx('fr-alert fr-alert--warning fr-alert--sm', classes.alert)}>
                    <p>
                        La période de ce plan s’est terminée le {formatDateOnly(plan.endDate)}.
                        {canEdit ? ' Clôturez-le pour préparer le plan suivant.' : ''}
                    </p>
                </div>
            ) : null}

            {draftWave ? (
                <div className={clsx('fr-alert fr-alert--info fr-alert--sm', classes.alert)}>
                    <p>
                        Une proposition de parcelles (vague {draftWave.number}) est en cours de préparation
                        {canEdit ? '.' : ' par les membres de votre groupe.'}
                    </p>
                    {canEdit ? (
                        <button type="button" className="fr-btn fr-btn--sm fr-mt-1w" onClick={onOpenWave}>
                            Reprendre la proposition
                        </button>
                    ) : null}
                </div>
            ) : null}

            {!counters.planned ? (
                <div className={clsx('fr-alert fr-alert--info fr-alert--sm', classes.alert)}>
                    <p>
                        {plan.validatedWavesCount
                            ? 'Toutes les parcelles validées ont été retirées du plan.'
                            : 'Aucune parcelle n’a encore été validée dans ce plan.'}
                    </p>
                </div>
            ) : null}

            {counters.planned && !counters.toControl ? (
                <div className={clsx('fr-callout fr-icon-checkbox-circle-line', classes.callout)}>
                    <h3 className="fr-callout__title">Toutes les parcelles du plan sont traitées</h3>
                    <p className="fr-callout__text">
                        {canEdit
                            ? 'Ajoutez des parcelles au plan pour poursuivre vos contrôles.'
                            : 'Les membres ayant le droit d’écriture peuvent y ajouter des parcelles.'}
                    </p>
                    {canEdit && !draftWave ? (
                        <button type="button" className="fr-btn" onClick={onOpenWave}>
                            Ajouter des parcelles
                        </button>
                    ) : null}
                </div>
            ) : null}

            <section className={classes.summary} aria-labelledby={`progress-${plan.uuid}`}>
                <h3 id={`progress-${plan.uuid}`} className={classes.title}>
                    Avancement
                </h3>
                <div
                    className={classes.progress}
                    role="progressbar"
                    aria-labelledby={`progress-${plan.uuid}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progress}
                    aria-valuetext={`${formatCount(treatedCount, 'parcelle traitée', 'parcelles traitées')} sur ${formatBigInt(counters.planned)}`}
                >
                    <div className={classes['progress-bar']} style={{ width: `${progress}%` }} />
                </div>
                <ul className={classes.counters}>
                    <li>
                        <span className={classes['counter-value']}>{formatBigInt(counters.planned)}</span>
                        {counters.planned > 1 ? 'parcelles au plan' : 'parcelle au plan'}
                    </li>
                    <li>
                        <span className={classes['counter-value']}>{formatBigInt(counters.toControl)}</span>
                        {counters.toControl > 1 ? 'restent à contrôler' : 'reste à contrôler'}
                    </li>
                    <li>
                        <span className={classes['counter-value']}>{formatBigInt(counters.controlled)}</span>
                        {counters.controlled > 1 ? 'contrôlées' : 'contrôlée'}
                    </li>
                    <li>
                        <span className={classes['counter-value']}>{formatBigInt(counters.released)}</span>
                        {counters.released > 1 ? 'sorties du plan' : 'sortie du plan'}
                    </li>
                </ul>
                {/* the callout above carries it once every parcel is treated */}
                {canEdit && !draftWave && (counters.toControl || !counters.planned) ? (
                    <button
                        type="button"
                        className="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-add-line"
                        onClick={onOpenWave}
                    >
                        Ajouter des parcelles
                    </button>
                ) : null}
            </section>

            <Tabs
                label="Parcelles du plan"
                tabs={tabs}
                value={tab}
                onChange={(value) => {
                    trackControlPlanEvent('Onglet affiché', value);
                    setTab(value);
                }}
            >
                {tab === 'PLANNED' ? (
                    <PlanParcelsTable
                        controlPlanUuid={plan.uuid}
                        section="PLANNED"
                        canEdit={canEdit}
                        caption="Parcelles du plan"
                        emptyText="Aucune parcelle"
                        followUpFilterShown
                    />
                ) : null}
                {tab === 'OUT_OF_PLAN' ? <OutOfPlanTable controlPlanUuid={plan.uuid} /> : null}
                {tab === 'EXCLUDED_REMOVED' ? (
                    <div className={classes.sections}>
                        <section aria-labelledby={`excluded-${plan.uuid}`}>
                            <h4 id={`excluded-${plan.uuid}`} className={classes.title}>
                                Écartées
                            </h4>
                            <p className={classes.hint}>
                                Écartées lors d’une proposition : aucune vague ne les propose plus, sauf réintégration.
                            </p>
                            <PlanParcelsTable
                                controlPlanUuid={plan.uuid}
                                section="EXCLUDED"
                                canEdit={canEdit}
                                caption="Parcelles écartées"
                                emptyText="Aucune parcelle écartée"
                            />
                        </section>
                        <section aria-labelledby={`removed-${plan.uuid}`}>
                            <h4 id={`removed-${plan.uuid}`} className={classes.title}>
                                Retirées du plan
                            </h4>
                            <p className={classes.hint}>
                                Retirées après validation : leurs objets sont revenus à «&nbsp;Non contrôlé&nbsp;».
                            </p>
                            <PlanParcelsTable
                                controlPlanUuid={plan.uuid}
                                section="REMOVED"
                                canEdit={canEdit}
                                caption="Parcelles retirées du plan"
                                emptyText="Aucune parcelle retirée"
                            />
                        </section>
                    </div>
                ) : null}
            </Tabs>
        </div>
    );
};

export default Component;

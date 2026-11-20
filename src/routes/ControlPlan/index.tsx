import React, { useState } from 'react';

import { controlPlanEndpoints } from '@/api/endpoints';
import Select from '@/components/dsfr/Select';
import LayoutBase from '@/components/LayoutBase';
import Loader from '@/components/ui/Loader';
import { ControlPlan, ControlPlanGroup } from '@/models/control-plan';
import { useActiveControlPlans } from '@/routes/ControlPlan/active-plans-query';
import ActivePlan from '@/routes/ControlPlan/ActivePlan';
import ClosedPlans from '@/routes/ControlPlan/ClosedPlans';
import ErrorAlert from '@/routes/ControlPlan/ErrorAlert';
import PlanFormModal from '@/routes/ControlPlan/PlanFormModal';
import PlanSwitcher from '@/routes/ControlPlan/PlanSwitcher';
import Prerequisites from '@/routes/ControlPlan/Prerequisites';
import { hasNoZone, usePrerequisites } from '@/routes/ControlPlan/prerequisites-query';
import { CONTROL_PLAN_QUERY_KEY, trackControlPlanEvent } from '@/routes/ControlPlan/utils';
import api from '@/utils/api';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import classes from './index.module.scss';

// `?plan=<uuid>` opens that plan (the Suivi page links to it); kept in the url as the agent picks one
const PLAN_PARAM = 'plan';

const getRequestedPlanUuid = () => new URLSearchParams(window.location.search).get(PLAN_PARAM);

// not through the router: the url also carries the objects filter, written behind its back
const setRequestedPlanUuid = (planUuid: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set(PLAN_PARAM, planUuid);
    window.history.replaceState(window.history.state, '', url.toString());
};

const NoPlan: React.FC<{ group: ControlPlanGroup; onCreate: () => void }> = ({ group, onCreate }) => {
    // the alert of the prerequisites says why
    const { data: prerequisites } = usePrerequisites(group.uuid);

    return (
        <section className={classes.section} aria-labelledby="no-control-plan">
            <h2 id="no-control-plan" className={classes['section-title']}>
                Aucun plan de contrôle en cours
            </h2>
            <ol className={classes.steps}>
                <li>Vous choisissez et classez vos critères : types d’objets, zones à enjeux, prescription, PV…</li>
                <li>
                    Aigle propose les parcelles à contrôler en priorité. Vous écartez celles qui n’ont pas besoin d’un
                    contrôle, et ajoutez celles de la liste d’attente qui vous intéressent.
                </li>
                <li>
                    Une fois le plan de contrôle validé, les objets des parcelles retenues passent
                    «&nbsp;À&nbsp;contrôler&nbsp;». Vous et les membres de votre groupe les suivez dans l’onglet Suivi :
                    une parcelle passe «&nbsp;Contrôlée&nbsp;» dès que le contrôle de ses objets est saisi dans Aigle.
                </li>
            </ol>
            <p className={classes.hint}>
                Votre groupe peut mener plusieurs plans à la fois&nbsp;: un plan annuel, une opération ponctuelle, le
                suivi sans date de fin de parcelles préemptées ou d’une zone sous surveillance…
            </p>
            <Prerequisites userGroupUuid={group.uuid} titleAs="h3" />
            {group.canEdit ? (
                <div>
                    <button
                        type="button"
                        className="fr-btn fr-btn--icon-left fr-icon-add-line"
                        disabled={hasNoZone(prerequisites)}
                        onClick={onCreate}
                    >
                        Créer un plan de contrôle
                    </button>
                </div>
            ) : (
                <p className={classes.hint}>
                    Seuls les membres ayant le droit d’écriture sur le groupe peuvent créer un plan de contrôle.
                </p>
            )}
        </section>
    );
};

const GroupPlans: React.FC<{ group: ControlPlanGroup }> = ({ group }) => {
    const [formOpened, setFormOpened] = useState(false);
    const [selectedPlanUuid, setSelectedPlanUuid] = useState(getRequestedPlanUuid);
    const {
        data: plans,
        isLoading,
        error,
    } = useQuery({
        queryKey: [CONTROL_PLAN_QUERY_KEY, 'list', group.uuid],
        queryFn: ({ signal }) =>
            api<ControlPlan[]>(controlPlanEndpoints.list, { params: { userGroupUuid: group.uuid }, signal }),
    });

    if (isLoading) {
        return <Loader className={classes.loader} />;
    }

    if (error || !plans) {
        return <ErrorAlert error={error} fallback="Les plans de contrôle n’ont pas pu être chargés." />;
    }

    const activePlans = plans.filter(({ controlPlanStatus }) => controlPlanStatus === 'ACTIVE');
    const closedPlans = plans.filter(({ controlPlanStatus }) => controlPlanStatus === 'CLOSED');
    // a plan closed or deleted meanwhile gives way to the most recent one
    const selectedPlan = activePlans.find(({ uuid }) => uuid === selectedPlanUuid) ?? activePlans[0];

    const selectPlan = (planUuid: string) => {
        setSelectedPlanUuid(planUuid);
        setRequestedPlanUuid(planUuid);
    };

    return (
        <>
            {selectedPlan ? (
                <>
                    <PlanSwitcher
                        plans={activePlans}
                        selectedUuid={selectedPlan.uuid}
                        onSelect={(plan) => {
                            trackControlPlanEvent('Plan sélectionné', undefined, activePlans.length);
                            selectPlan(plan.uuid);
                        }}
                        onCreate={group.canEdit ? () => setFormOpened(true) : undefined}
                    />
                    <ActivePlan key={selectedPlan.uuid} plan={selectedPlan} group={group} />
                </>
            ) : (
                <NoPlan group={group} onCreate={() => setFormOpened(true)} />
            )}
            {closedPlans.length ? <ClosedPlans plans={closedPlans} /> : null}
            <PlanFormModal
                opened={formOpened}
                group={group}
                onClose={() => setFormOpened(false)}
                onSaved={(plan) => {
                    setFormOpened(false);
                    selectPlan(plan.uuid);
                }}
            />
        </>
    );
};

const Component: React.FC = () => {
    const [selectedGroupUuid, setSelectedGroupUuid] = useState<string>();
    const {
        data: groups,
        isLoading,
        error,
    } = useQuery({
        queryKey: [CONTROL_PLAN_QUERY_KEY, 'groups'],
        queryFn: ({ signal }) => api<ControlPlanGroup[]>(controlPlanEndpoints.groups, { signal }),
    });
    // the group of the plan a link asks for
    const requestedPlanUuid = getRequestedPlanUuid();
    const { data: activePlans, isLoading: activePlansLoading } = useActiveControlPlans(!!requestedPlanUuid);
    const requestedGroupUuid = activePlans?.find(({ uuid }) => uuid === requestedPlanUuid)?.userGroup.uuid;

    // without a choice, the group of the plan asked for, else one whose plans are running
    const group =
        groups?.find(({ uuid }) => uuid === selectedGroupUuid) ??
        groups?.find(({ uuid }) => uuid === requestedGroupUuid) ??
        groups?.find(({ activeControlPlansCount }) => activeControlPlansCount > 0) ??
        groups?.[0];

    return (
        <LayoutBase title="Plan de contrôle">
            <div className={classes.container}>
                <div className={classes.header}>
                    <div className={classes['header-row']}>
                        <h1>Plan de contrôle</h1>
                        {groups && groups.length > 1 && group ? (
                            <Select
                                label="Groupe"
                                className={classes['group-select']}
                                value={group.uuid}
                                options={groups.map(({ uuid, name }) => ({ value: uuid, label: name }))}
                                onChange={(uuid) => {
                                    const selected = groups.find((item) => item.uuid === uuid);
                                    trackControlPlanEvent('Groupe sélectionné', selected?.userGroupType);
                                    setSelectedGroupUuid(uuid);
                                }}
                            />
                        ) : null}
                    </div>
                    {/* what the page is for, until a plan is running: after that the plans say it themselves */}
                    {group && !group.activeControlPlansCount ? (
                        <p className={classes.lead}>
                            Aigle vous propose les parcelles à contrôler en priorité selon les critères que vous
                            choisissez et classez. Une fois validé, le plan passe leurs objets
                            «&nbsp;À&nbsp;contrôler&nbsp;» et se partage avec les membres de votre groupe, qui le
                            suivent dans l’onglet Suivi.
                        </p>
                    ) : null}
                </div>

                {isLoading ? <Loader className={classes.loader} /> : null}
                {error ? <ErrorAlert error={error} fallback="Vos groupes n’ont pas pu être chargés." /> : null}
                {groups && !groups.length ? (
                    <div className={clsx('fr-alert fr-alert--info', classes.alert)}>
                        <h2 className="fr-alert__title">Aucun groupe</h2>
                        <p>
                            Le plan de contrôle se prépare pour un groupe : vous n’appartenez à aucun groupe qui y a
                            accès.
                        </p>
                    </div>
                ) : null}
                {group && !(requestedPlanUuid && activePlansLoading) ? (
                    <GroupPlans key={group.uuid} group={group} />
                ) : null}
            </div>
        </LayoutBase>
    );
};

export default Component;

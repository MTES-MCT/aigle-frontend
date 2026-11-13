import React, { useState } from 'react';

import { controlPlanEndpoints } from '@/api/endpoints';
import Select from '@/components/dsfr/Select';
import LayoutBase from '@/components/LayoutBase';
import Loader from '@/components/ui/Loader';
import { ControlPlan, ControlPlanGroup } from '@/models/control-plan';
import ActivePlan from '@/routes/ControlPlan/ActivePlan';
import ClosedPlans from '@/routes/ControlPlan/ClosedPlans';
import ErrorAlert from '@/routes/ControlPlan/ErrorAlert';
import PlanFormModal from '@/routes/ControlPlan/PlanFormModal';
import Prerequisites from '@/routes/ControlPlan/Prerequisites';
import { hasNoZone, usePrerequisites } from '@/routes/ControlPlan/prerequisites-query';
import { CONTROL_PLAN_QUERY_KEY, trackControlPlanEvent } from '@/routes/ControlPlan/utils';
import api from '@/utils/api';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import classes from './index.module.scss';

const NoPlan: React.FC<{ group: ControlPlanGroup }> = ({ group }) => {
    const [formOpened, setFormOpened] = useState(false);
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
                    «&nbsp;À&nbsp;contrôler&nbsp;». Vous et les membres de votre groupe voyez ensuite quelles parcelles
                    restent à contrôler : une parcelle passe «&nbsp;Contrôlée&nbsp;» dès que le contrôle de ses objets
                    est saisi dans Aigle.
                </li>
            </ol>
            <Prerequisites userGroupUuid={group.uuid} titleAs="h3" />
            {group.canEdit ? (
                <div>
                    <button
                        type="button"
                        className="fr-btn fr-btn--icon-left fr-icon-add-line"
                        disabled={hasNoZone(prerequisites)}
                        onClick={() => setFormOpened(true)}
                    >
                        Créer le plan de contrôle
                    </button>
                </div>
            ) : (
                <p className={classes.hint}>
                    Seuls les membres ayant le droit d’écriture sur le groupe peuvent créer le plan de contrôle.
                </p>
            )}
            <PlanFormModal
                opened={formOpened}
                group={group}
                onClose={() => setFormOpened(false)}
                onSaved={() => setFormOpened(false)}
            />
        </section>
    );
};

const GroupPlans: React.FC<{ group: ControlPlanGroup }> = ({ group }) => {
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

    const activePlan = plans.find(({ controlPlanStatus }) => controlPlanStatus === 'ACTIVE');
    const closedPlans = plans.filter(({ controlPlanStatus }) => controlPlanStatus === 'CLOSED');

    return (
        <>
            {activePlan ? (
                <ActivePlan key={activePlan.uuid} plan={activePlan} group={group} />
            ) : (
                <NoPlan group={group} />
            )}
            {closedPlans.length ? <ClosedPlans plans={closedPlans} /> : null}
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

    // without a choice, the group whose plan is running
    const group =
        groups?.find(({ uuid }) => uuid === selectedGroupUuid) ??
        groups?.find(({ activeControlPlanUuid }) => !!activeControlPlanUuid) ??
        groups?.[0];

    return (
        <LayoutBase title="Plan de contrôle">
            <div className={classes.container}>
                <div className={classes.header}>
                    <h1>Plan de contrôle</h1>
                    <p className={classes.lead}>
                        Aigle vous propose les parcelles à contrôler en priorité selon les critères que vous choisissez
                        et classez. Une fois validé, le plan passe leurs objets «&nbsp;À&nbsp;contrôler&nbsp;» et se
                        partage avec les membres de votre groupe.
                    </p>
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
                {group ? <GroupPlans key={group.uuid} group={group} /> : null}
            </div>
        </LayoutBase>
    );
};

export default Component;

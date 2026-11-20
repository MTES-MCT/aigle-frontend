import React, { useEffect, useId, useRef } from 'react';

import Select from '@/components/dsfr/Select';
import { ObjectsFilter } from '@/models/detection-filter';
import { useActiveControlPlans, useClosedControlPlanReset } from '@/routes/ControlPlan/active-plans-query';
import { formatCount, getPlanStatus, trackControlPlanEvent } from '@/routes/ControlPlan/utils';
import { useAuth } from '@/store/slices/auth';
import { formatBigInt } from '@/utils/format';
import { isAllParcelsViewChosen, isAllParcelsViewRequested, rememberControlPlanView } from '@/utils/objects-filter';
import clsx from 'clsx';
import { useNavigate } from 'react-router-dom';
import classes from './index.module.scss';

const ALL_PLANS = '';

interface ComponentProps {
    objectsFilter: ObjectsFilter;
    updateObjectsFilter: (objectsFilter: ObjectsFilter) => void;
}

/**
 * The Suivi page follows the control plans first: it opens on them while one is running (unless the agent
 * picked « Toutes les parcelles »), one of them can be picked, and the plan page is one link away.
 */
const Component: React.FC<ComponentProps> = ({ objectsFilter, updateObjectsFilter }: ComponentProps) => {
    const id = useId();
    const navigate = useNavigate();
    const { canAccessControlPlan } = useAuth();
    const hasAccess = canAccessControlPlan();
    const { data: plans } = useActiveControlPlans(hasAccess);
    const defaultViewAppliedRef = useRef(false);

    useEffect(() => {
        if (!plans || defaultViewAppliedRef.current) {
            return;
        }

        defaultViewAppliedRef.current = true;
        if (plans.length && !objectsFilter.controlPlan && !isAllParcelsViewRequested() && !isAllParcelsViewChosen()) {
            updateObjectsFilter({ ...objectsFilter, controlPlan: true, controlPlanUuid: null });
        }
    }, [plans, objectsFilter, updateObjectsFilter]);

    useClosedControlPlanReset();

    if (!hasAccess || !plans || (!plans.length && !objectsFilter.controlPlan)) {
        return null;
    }

    const planView = !!objectsFilter.controlPlan;
    const selectedPlan = plans.find(({ uuid }) => uuid === objectsFilter.controlPlanUuid);
    const linkedPlan = selectedPlan ?? (plans.length === 1 ? plans[0] : undefined);
    const followedPlans = selectedPlan ? [selectedPlan] : plans;
    const toControl = followedPlans.reduce((sum, { counters }) => sum + counters.toControl, 0);
    const planned = followedPlans.reduce((sum, { counters }) => sum + counters.planned, 0);
    // a plan with no validated wave yet has nothing to count
    const progress =
        followedPlans.length === 1
            ? getPlanStatus(followedPlans[0])
            : planned
              ? `${formatCount(toControl, 'parcelle reste', 'parcelles restent')} à contrôler sur ${formatBigInt(planned)}`
              : 'Aucune parcelle validée';

    const setPlanView = (controlPlan: boolean) => {
        trackControlPlanEvent('Vue du suivi', controlPlan ? 'Plans' : 'Toutes les parcelles');
        rememberControlPlanView(controlPlan);
        updateObjectsFilter({ ...objectsFilter, controlPlan, controlPlanUuid: null });
    };

    const openPlanPage = (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        trackControlPlanEvent('Plan ouvert depuis le suivi');
        // the query carries the objects filter from page to page, as the header links do
        const params = new URLSearchParams(window.location.search);
        if (linkedPlan) {
            params.set('plan', linkedPlan.uuid);
        } else {
            params.delete('plan');
        }
        navigate(`/control-plan?${params.toString()}`);
    };

    return (
        <div className={classes.container}>
            <fieldset className={clsx('fr-segmented', classes.view)}>
                <legend className="fr-segmented__legend fr-sr-only">Parcelles affichées</legend>
                <div className="fr-segmented__elements">
                    <div className="fr-segmented__element">
                        <input
                            type="radio"
                            id={`${id}-plans`}
                            name={`${id}-view`}
                            checked={planView}
                            onChange={() => setPlanView(true)}
                        />
                        <label className="fr-label" htmlFor={`${id}-plans`}>
                            {plans.length > 1 ? 'Mes plans de contrôle' : 'Mon plan de contrôle'}
                        </label>
                    </div>
                    <div className="fr-segmented__element">
                        <input
                            type="radio"
                            id={`${id}-all`}
                            name={`${id}-view`}
                            checked={!planView}
                            onChange={() => setPlanView(false)}
                        />
                        <label className="fr-label" htmlFor={`${id}-all`}>
                            Toutes les parcelles
                        </label>
                    </div>
                </div>
            </fieldset>

            {planView && plans.length > 1 ? (
                <Select
                    label="Plan"
                    labelHidden
                    className={classes.select}
                    value={selectedPlan?.uuid ?? ALL_PLANS}
                    options={[
                        { value: ALL_PLANS, label: 'Tous les plans en cours' },
                        ...plans.map(({ uuid, name }) => ({ value: uuid, label: name })),
                    ]}
                    onChange={(planUuid) => {
                        trackControlPlanEvent('Plan suivi choisi', undefined, plans.length);
                        updateObjectsFilter({ ...objectsFilter, controlPlanUuid: planUuid || null });
                    }}
                />
            ) : null}

            {planView && plans.length ? (
                <p className={classes.summary}>
                    {linkedPlan && !selectedPlan ? <b>{linkedPlan.name}&nbsp;: </b> : null}
                    {progress}
                    {selectedPlan ? null : '. La liste compte aussi les autres objets « À contrôler » du territoire.'}
                    <a
                        className="fr-link fr-link--sm fr-ml-2w"
                        href={linkedPlan ? `/control-plan?plan=${linkedPlan.uuid}` : '/control-plan'}
                        onClick={openPlanPage}
                    >
                        {linkedPlan ? 'Voir le plan' : 'Voir les plans'}
                    </a>
                </p>
            ) : null}
        </div>
    );
};

export default Component;

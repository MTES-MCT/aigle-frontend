import React from 'react';

import { ControlPlan } from '@/models/control-plan';
import { formatCount, formatPlanPeriod, getPlanStatus } from '@/routes/ControlPlan/utils';
import clsx from 'clsx';
import classes from './index.module.scss';

interface ComponentProps {
    plans: ControlPlan[];
    selectedUuid: string;
    onSelect: (plan: ControlPlan) => void;
    // the button is left out for a member without the write right
    onCreate?: () => void;
}

/** The active plans of the group: the one picked shows below. A single plan has nothing to pick. */
const Component: React.FC<ComponentProps> = ({ plans, selectedUuid, onSelect, onCreate }: ComponentProps) => {
    if (plans.length < 2) {
        return onCreate ? (
            <div className={classes.head}>
                <p className={classes.count}>{formatCount(plans.length, 'plan en cours', 'plans en cours')}</p>
                <button
                    type="button"
                    className="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-add-line"
                    onClick={onCreate}
                >
                    Nouveau plan
                </button>
            </div>
        ) : null;
    }

    return (
        <nav className={classes.container} aria-label="Plans en cours">
            <div className={classes.head}>
                <p className={classes.count}>{formatCount(plans.length, 'plan en cours', 'plans en cours')}</p>
                {onCreate ? (
                    <button
                        type="button"
                        className="fr-btn fr-btn--secondary fr-btn--sm fr-btn--icon-left fr-icon-add-line"
                        onClick={onCreate}
                    >
                        Nouveau plan
                    </button>
                ) : null}
            </div>
            <ul className={classes.list}>
                {plans.map((plan) => {
                    const selected = plan.uuid === selectedUuid;
                    const progress = plan.counters.planned
                        ? Math.round(((plan.counters.planned - plan.counters.toControl) / plan.counters.planned) * 100)
                        : 0;

                    return (
                        <li key={plan.uuid}>
                            <button
                                type="button"
                                className={clsx(classes.plan, selected && classes.selected)}
                                aria-current={selected ? 'true' : undefined}
                                onClick={() => onSelect(plan)}
                            >
                                <span className={classes.name} title={plan.name}>
                                    {plan.name}
                                </span>
                                <span className={classes.period}>
                                    {formatPlanPeriod(plan)}
                                    {plan.isExpired ? (
                                        <span className="fr-badge fr-badge--sm fr-badge--warning">
                                            Période terminée
                                        </span>
                                    ) : null}
                                </span>
                                <span className={classes.status}>{getPlanStatus(plan)}</span>
                                {plan.counters.planned ? (
                                    <span className={classes.progress} aria-hidden>
                                        <span className={classes['progress-bar']} style={{ width: `${progress}%` }} />
                                    </span>
                                ) : null}
                            </button>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
};

export default Component;

import React from 'react';

import Table from '@/components/dsfr/Table';
import OptionalText from '@/components/ui/OptionalText';
import { ControlPlan } from '@/models/control-plan';
import { formatPlanPeriod, formatTimestampDay } from '@/routes/ControlPlan/utils';
import { formatBigInt } from '@/utils/format';
import classes from './index.module.scss';

interface ComponentProps {
    plans: ControlPlan[];
}

// The group's previous plans, for the record.
const Component: React.FC<ComponentProps> = ({ plans }: ComponentProps) => (
    <section className={classes.container} aria-labelledby="closed-control-plans">
        <h2 id="closed-control-plans" className={classes.title}>
            Plans clôturés
        </h2>
        <Table caption="Plans de contrôle clôturés" className={classes.table}>
            <thead>
                <tr>
                    <th scope="col">Plan</th>
                    <th scope="col">Période</th>
                    <th scope="col">Parcelles au plan</th>
                    <th scope="col">Contrôlées</th>
                    <th scope="col">Clôturé le</th>
                </tr>
            </thead>
            <tbody>
                {plans.map((plan) => (
                    <tr key={plan.uuid} className={classes.row}>
                        <td data-label="Plan" className={classes['cell-wide']}>
                            {plan.name}
                        </td>
                        <td data-label="Période" className={classes['cell-wide']}>
                            {formatPlanPeriod(plan)}
                        </td>
                        <td data-label="Parcelles au plan">{formatBigInt(plan.counters.planned)}</td>
                        <td data-label="Contrôlées">{formatBigInt(plan.counters.controlled)}</td>
                        <td data-label="Clôturé le">
                            <OptionalText text={plan.closedAt ? formatTimestampDay(plan.closedAt) : null} />
                        </td>
                    </tr>
                ))}
            </tbody>
        </Table>
    </section>
);

export default Component;

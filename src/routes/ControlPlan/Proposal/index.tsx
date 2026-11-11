import React, { useState } from 'react';

import Tabs, { TabsItem } from '@/components/dsfr/Tabs';
import { ControlPlanWave } from '@/models/control-plan';
import PlanParcelsTable from '@/routes/ControlPlan/PlanParcelsTable';
import { formatCount, trackControlPlanEvent } from '@/routes/ControlPlan/utils';
import { formatBigInt } from '@/utils/format';
import classes from './index.module.scss';

type ProposalTab = 'PROPOSED' | 'WAITING' | 'EXCLUDED';

interface ComponentProps {
    controlPlanUuid: string;
    wave: ControlPlanWave;
    canEdit: boolean;
}

const Component: React.FC<ComponentProps> = ({ controlPlanUuid, wave, canEdit }: ComponentProps) => {
    const [tab, setTab] = useState<ProposalTab>('PROPOSED');
    const { proposal } = wave;

    const tabs: TabsItem<ProposalTab>[] = [
        { value: 'PROPOSED', label: `Proposées (${formatBigInt(proposal.proposedCount)})` },
        { value: 'WAITING', label: `Liste d’attente (${formatBigInt(proposal.waitingCount)})` },
        { value: 'EXCLUDED', label: `Écartées (${formatBigInt(proposal.excludedCount)})` },
    ];

    return (
        <div className={classes.container}>
            {wave.eligibleParcelsCount ? (
                <div className={classes.summary}>
                    <p>
                        {formatCount(wave.eligibleParcelsCount, 'parcelle répond', 'parcelles répondent')} à vos
                        critères : Aigle en propose {formatBigInt(proposal.proposedCount - proposal.addedCount)} sur les{' '}
                        {formatBigInt(wave.parcelsCount)} demandées, par ordre de priorité
                        {proposal.addedCount
                            ? `, et vous en avez ajouté ${formatBigInt(proposal.addedCount)} depuis la liste d’attente.`
                            : '.'}
                    </p>
                    <p className={classes.hint}>
                        Écartez celles qui n’ont pas besoin d’un contrôle : la suivante de la liste d’attente prend leur
                        place. Une parcelle de la liste d’attente vous intéresse ? Ajoutez-la au plan, en plus des
                        parcelles demandées.
                    </p>
                </div>
            ) : (
                <div className="fr-alert fr-alert--warning fr-alert--sm">
                    <p>Aucune parcelle ne répond à vos critères : modifiez-les pour élargir la recherche.</p>
                </div>
            )}

            <Tabs
                label="Parcelles de la proposition"
                tabs={tabs}
                value={tab}
                onChange={(value) => {
                    trackControlPlanEvent('Onglet affiché', value);
                    setTab(value);
                }}
            >
                {tab === 'PROPOSED' ? (
                    <PlanParcelsTable
                        controlPlanUuid={controlPlanUuid}
                        section="PROPOSED"
                        canEdit={canEdit}
                        caption="Parcelles proposées"
                        emptyText="Aucune parcelle proposée"
                    />
                ) : null}
                {tab === 'WAITING' ? (
                    <PlanParcelsTable
                        controlPlanUuid={controlPlanUuid}
                        section="WAITING"
                        canEdit={canEdit}
                        caption="Parcelles en liste d’attente"
                        emptyText="La liste d’attente est vide"
                    />
                ) : null}
                {tab === 'EXCLUDED' ? (
                    <PlanParcelsTable
                        controlPlanUuid={controlPlanUuid}
                        section="EXCLUDED"
                        canEdit={canEdit}
                        caption="Parcelles écartées"
                        emptyText="Aucune parcelle écartée"
                    />
                ) : null}
            </Tabs>
        </div>
    );
};

export default Component;

import React from 'react';

import NoZoneAlert from '@/routes/ControlPlan/NoZoneAlert';
import { hasNoZone, usePrerequisites } from '@/routes/ControlPlan/prerequisites-query';
import { formatCount, trackControlPlanEvent } from '@/routes/ControlPlan/utils';
import { OBJECTS_FILTER_PRESETS } from '@/utils/objects-filter-presets';
import clsx from 'clsx';
import classes from './index.module.scss';

// the map with the « Vérifier les détections IA » quick filter
const getVerifyDetectionsLink = () => {
    const preset = OBJECTS_FILTER_PRESETS.find(({ id }) => id === 'VERIFY_AI_DETECTIONS');
    const params = new URLSearchParams(
        preset
            ? {
                  detectionValidationStatuses: preset.filter.detectionValidationStatuses.join(','),
                  detectionControlStatuses: preset.filter.detectionControlStatuses.join(','),
                  prescripted: String(preset.filter.prescripted),
              }
            : {},
    );

    return `/map?${params.toString()}`;
};

interface ComponentProps {
    userGroupUuid: string;
    // h4 inside the stepper, h3 on the page without a plan
    titleAs?: 'h3' | 'h4';
    className?: string;
}

// The cleaning the plan expects: told, counted, never enforced.
const Component: React.FC<ComponentProps> = ({ userGroupUuid, titleAs: Title = 'h4', className }: ComponentProps) => {
    const { data, isLoading, isError } = usePrerequisites(userGroupUuid);

    return (
        <div className={clsx(classes.container, className)}>
            {hasNoZone(data) ? <NoZoneAlert /> : null}
            <div className={clsx('fr-callout fr-icon-information-line', classes.callout)}>
                <Title className="fr-callout__title">Prérequis : nettoyer les détections</Title>
                <p className="fr-callout__text">
                    Avant de construire le plan, invalidez les fausses détections de votre territoire et passez en
                    «&nbsp;Suspect&nbsp;» les objets à contrôler. Ce n’est pas bloquant : les objets encore «&nbsp;Non
                    vérifié&nbsp;» peuvent entrer dans le plan, ils passeront alors «&nbsp;Suspect&nbsp;».
                </p>
                {isLoading ? <p className={classes.counts}>Décompte des objets à vérifier…</p> : null}
                {isError ? (
                    <p className={classes.counts}>Le décompte des objets à vérifier n’a pas pu être chargé.</p>
                ) : null}
                {data ? (
                    <ul className={classes.counts}>
                        <li>
                            {data.unverifiedObjectsCount
                                ? `Il reste ${formatCount(data.unverifiedObjectsCount, 'objet')} «\u00a0Non vérifié\u00a0» sur votre territoire.`
                                : 'Aucun objet «\u00a0Non vérifié\u00a0» ne reste sur votre territoire.'}
                        </li>
                        {data.objectsWithoutParcelCount ? (
                            <li>
                                {`${formatCount(data.objectsWithoutParcelCount, 'objet')} sans parcelle cadastrale ne ${
                                    data.objectsWithoutParcelCount > 1 ? 'peuvent' : 'peut'
                                } pas entrer dans un plan.`}
                            </li>
                        ) : null}
                    </ul>
                ) : null}
                <a
                    className="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-map-pin-2-line"
                    href={getVerifyDetectionsLink()}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Vérifier les détections sur la carte - nouvelle fenêtre"
                    onClick={() => trackControlPlanEvent('Lien prérequis ouvert')}
                >
                    Vérifier les détections sur la carte
                </a>
            </div>
        </div>
    );
};

export default Component;

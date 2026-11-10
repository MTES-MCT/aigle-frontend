import React from 'react';

import { CONTACT_EMAIL } from '@/routes/HelpCenter/utils';
import clsx from 'clsx';

interface ComponentProps {
    className?: string;
}

// A wave searches the parcels inside the group's zones à enjeux: without any, no plan can be generated.
const Component: React.FC<ComponentProps> = ({ className }: ComponentProps) => (
    <div className={clsx('fr-alert fr-alert--warning fr-alert--sm', className)}>
        <p>
            Votre groupe n’a aucune zone à enjeux active : Aigle cherche les parcelles à contrôler dans ces zones, aucun
            plan ne peut donc être généré. Pour en créer ou en activer, écrivez à l’équipe Aigle :{' '}
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
        </p>
    </div>
);

export default Component;

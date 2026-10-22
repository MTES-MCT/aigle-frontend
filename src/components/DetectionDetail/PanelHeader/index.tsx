import React, { ReactNode } from 'react';
import classes from './index.module.scss';

interface ComponentProps {
    title: ReactNode;
    // shown right after the title
    actions?: ReactNode;
    onClose: () => void;
}

// The title row of the side panel (SidePanel), mirrored on the right edge of the map.
const Component: React.FC<ComponentProps> = ({ title, actions, onClose }: ComponentProps) => (
    <div className={classes.header}>
        <div className={classes.heading}>
            <h2 className={classes.title}>{title}</h2>
            {actions}
        </div>
        <button
            type="button"
            className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line fr-btn--icon-right"
            aria-label="Fermer le détail de détection"
            onClick={onClose}
        >
            Fermer
        </button>
    </div>
);

export default Component;

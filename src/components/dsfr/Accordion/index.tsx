import Collapse from '@/components/dsfr/Collapse';
import React, { PropsWithChildren, useId } from 'react';
import classes from './index.module.scss';

interface ComponentProps extends PropsWithChildren {
    title: string;
    expanded: boolean;
    onToggle: (expanded: boolean) => void;
}

const Component: React.FC<ComponentProps> = ({ title, expanded, onToggle, children }: ComponentProps) => {
    const panelId = `accordion-${useId()}`;

    return (
        <section className="fr-accordion">
            <h3 className="fr-accordion__title">
                <button
                    type="button"
                    className="fr-accordion__btn"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => onToggle(!expanded)}
                >
                    {title}
                </button>
            </h3>
            <Collapse id={panelId} expanded={expanded}>
                <div className={classes.content}>{children}</div>
            </Collapse>
        </section>
    );
};

export default Component;

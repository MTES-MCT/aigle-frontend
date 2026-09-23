import Collapse from '@/components/dsfr/Collapse';
import React, { PropsWithChildren, ReactNode, useId } from 'react';
import classes from './index.module.scss';

interface ComponentProps extends PropsWithChildren {
    title: ReactNode;
    expanded: boolean;
    onToggle: (expanded: boolean) => void;
    id?: string;
    titleAs?: 'h2' | 'h3' | 'h4';
}

const Component: React.FC<ComponentProps> = ({
    title,
    expanded,
    onToggle,
    id,
    titleAs: TitleTag = 'h3',
    children,
}: ComponentProps) => {
    const panelId = `accordion-${useId()}`;

    return (
        <section id={id} className="fr-accordion">
            <TitleTag className="fr-accordion__title">
                <button
                    type="button"
                    className="fr-accordion__btn"
                    aria-expanded={expanded}
                    aria-controls={panelId}
                    onClick={() => onToggle(!expanded)}
                >
                    {title}
                </button>
            </TitleTag>
            <Collapse id={panelId} expanded={expanded}>
                <div className={classes.content}>{children}</div>
            </Collapse>
        </section>
    );
};

export default Component;

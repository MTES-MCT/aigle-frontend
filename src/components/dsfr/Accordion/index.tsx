import Collapse from '@/components/dsfr/Collapse';
import clsx from 'clsx';
import React, { PropsWithChildren, ReactNode, useId } from 'react';
import classes from './index.module.scss';

interface ComponentProps extends PropsWithChildren {
    title: ReactNode;
    expanded: boolean;
    onToggle: (expanded: boolean) => void;
    id?: string;
    titleAs?: 'h2' | 'h3' | 'h4';
    // title and content on the edge of the page's content, as a section of a form
    flush?: boolean;
}

const Component: React.FC<ComponentProps> = ({
    title,
    expanded,
    onToggle,
    id,
    titleAs: TitleTag = 'h3',
    flush = false,
    children,
}: ComponentProps) => {
    const panelId = `accordion-${useId()}`;

    return (
        <section id={id} className={clsx('fr-accordion', flush && classes.flush)}>
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

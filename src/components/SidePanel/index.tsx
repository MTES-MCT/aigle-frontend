import { ReactNode, useEffect, useState } from 'react';

import clsx from 'clsx';
import classes from './index.module.scss';

export interface SidePanelSection<T extends string> {
    id: T;
    title: string;
    icon: string;
    content: ReactNode;
    indicator?: boolean;
    disabled?: boolean;
}

interface ComponentProps<T extends string> {
    sections: SidePanelSection<T>[];
    section?: T;
    setSection: (section?: T) => void;
    // `overlay` floats over the map, `column` is a column of the page beside its content
    layout: 'overlay' | 'column';
}

const Component = <T extends string>({ sections, section, setSection, layout }: ComponentProps<T>) => {
    // once opened, a section stays mounted: closing or switching never drops its state or in-flight work
    const [openedSections, setOpenedSections] = useState<T[]>(section ? [section] : []);
    const [lastSection, setLastSection] = useState(section);

    useEffect(() => {
        if (!section) {
            return;
        }

        setLastSection(section);
        setOpenedSections((previous) => (previous.includes(section) ? previous : [...previous, section]));
    }, [section]);

    // closed, the panel keeps showing the last section, which slides out with it
    const shownSection = section ?? lastSection;

    return (
        <div className={clsx(classes.container, classes[`container-${layout}`])}>
            <div className={clsx(classes.panel, section && classes['panel-open'])} aria-hidden={!section}>
                <div className={classes['panel-header']}>
                    <h2 className={classes['panel-title']}>{sections.find(({ id }) => id === shownSection)?.title}</h2>
                    <button
                        type="button"
                        className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-close-line fr-btn--icon-right"
                        onClick={() => setSection(undefined)}
                    >
                        Fermer
                    </button>
                </div>
                {sections
                    .filter(({ id }) => id === section || openedSections.includes(id))
                    .map(({ id, content }) => (
                        <div key={id} hidden={id !== shownSection}>
                            {content}
                        </div>
                    ))}
            </div>

            <div className={classes.rail}>
                {sections.map(({ id, title, icon, indicator, disabled }) => (
                    <button
                        key={id}
                        type="button"
                        className={clsx(classes['rail-button'], section === id && classes['rail-button-active'])}
                        title={title}
                        aria-label={title}
                        aria-pressed={section === id}
                        disabled={disabled}
                        onClick={() => setSection(section === id ? undefined : id)}
                    >
                        <span className={icon} aria-hidden="true" />
                        {indicator ? <span className={classes['rail-button-indicator']} /> : null}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default Component;

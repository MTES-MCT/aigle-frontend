import { HEADER_HEIGHT_PX } from '@/utils/constants';
import clsx from 'clsx';
import React, { PropsWithChildren, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';

export interface TabsItem<T extends string> {
    value: T;
    label: string;
    icon?: string;
}

interface ComponentProps<T extends string> extends PropsWithChildren {
    label: string;
    tabs: TabsItem<T>[];
    value: T;
    onChange: (value: T) => void;
}

/**
 * DSFR tabs driven from React instead of the DSFR JS runtime. Only the selected panel is mounted:
 * DSFR stacks every panel in the same box and merely hides the others, so they would all count
 * towards its height.
 *
 * `.fr-tabs` sizes itself (and its frame) from `--tabs-height`, which the DSFR JS computes as
 * list height + panel height. It is measured here with a ResizeObserver so the frame follows
 * content that grows, e.g. an accordion opening inside the panel.
 */
const Component = <T extends string>({ label, tabs, value, onChange, children }: ComponentProps<T>) => {
    const baseId = `tabs-${useId()}`;
    const listRef = useRef<HTMLUListElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const tabRefs = useRef<Map<T, HTMLButtonElement>>(new Map());
    const [height, setHeight] = useState<number>();

    useLayoutEffect(() => {
        const list = listRef.current;
        const panel = panelRef.current;

        if (!list || !panel) {
            return;
        }

        const measure = () =>
            setHeight(Math.round(list.getBoundingClientRect().height) + Math.round(panel.offsetHeight));
        const observer = new ResizeObserver(measure);
        observer.observe(list);
        observer.observe(panel);

        return () => observer.disconnect();
    }, []);

    // On a narrow screen the list scrolls horizontally: keep the selected tab in view. Only the
    // list is scrolled, scrollIntoView would move the page too.
    useLayoutEffect(() => {
        const list = listRef.current;
        const tab = tabRefs.current.get(value);

        if (!list || !tab || list.scrollWidth <= list.clientWidth) {
            return;
        }

        const listRect = list.getBoundingClientRect();
        const tabRect = tab.getBoundingClientRect();
        list.scrollLeft += tabRect.left - listRect.left - (listRect.width - tabRect.width) / 2;
    }, [value]);

    // A control outside the list that switches tabs (e.g. a button in the panel) often unmounts
    // itself, dropping focus to <body>: put it on the newly selected tab instead, scrolled clear of
    // the fixed header (the browser's own focus scroll would leave it underneath).
    const previousValueRef = useRef(value);
    useEffect(() => {
        const tab = tabRefs.current.get(value);

        if (tab && previousValueRef.current !== value && document.activeElement === document.body) {
            tab.focus({ preventScroll: true });
            const { top, bottom } = tab.getBoundingClientRect();
            if (top < HEADER_HEIGHT_PX || bottom > window.innerHeight) {
                window.scrollTo({ top: window.scrollY + top - HEADER_HEIGHT_PX - 16 });
            }
        }
        previousValueRef.current = value;
    }, [value]);

    const selectTab = (tabValue: T) => {
        onChange(tabValue);
        tabRefs.current.get(tabValue)?.focus();
    };

    const handleKeyDown = (event: React.KeyboardEvent, index: number) => {
        const lastIndex = tabs.length - 1;
        const targetIndexByKey: Record<string, number> = {
            ArrowLeft: index === 0 ? lastIndex : index - 1,
            ArrowRight: index === lastIndex ? 0 : index + 1,
            Home: 0,
            End: lastIndex,
        };
        const targetIndex = targetIndexByKey[event.key];

        if (targetIndex === undefined) {
            return;
        }

        event.preventDefault();
        selectTab(tabs[targetIndex].value);
    };

    return (
        <div
            className="fr-tabs"
            style={height === undefined ? undefined : ({ '--tabs-height': `${height}px` } as React.CSSProperties)}
        >
            <ul ref={listRef} className="fr-tabs__list" role="tablist" aria-label={label}>
                {tabs.map((tab, index) => (
                    <li key={tab.value} role="presentation">
                        <button
                            ref={(node) => {
                                if (node) {
                                    tabRefs.current.set(tab.value, node);
                                } else {
                                    tabRefs.current.delete(tab.value);
                                }
                            }}
                            type="button"
                            id={`${baseId}-tab-${tab.value}`}
                            role="tab"
                            className={clsx('fr-tabs__tab', tab.icon && [tab.icon, 'fr-tabs__tab--icon-left'])}
                            aria-selected={tab.value === value}
                            aria-controls={`${baseId}-panel`}
                            tabIndex={tab.value === value ? 0 : -1}
                            onClick={() => onChange(tab.value)}
                            onKeyDown={(event) => handleKeyDown(event, index)}
                        >
                            {tab.label}
                        </button>
                    </li>
                ))}
            </ul>
            <div
                ref={panelRef}
                id={`${baseId}-panel`}
                className="fr-tabs__panel fr-tabs__panel--selected"
                role="tabpanel"
                aria-labelledby={`${baseId}-tab-${value}`}
                tabIndex={0}
            >
                {children}
            </div>
        </div>
    );
};

export default Component;

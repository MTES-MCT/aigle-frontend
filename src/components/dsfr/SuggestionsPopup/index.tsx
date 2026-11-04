import { AnchorRect } from '@/hooks/useAnchoredPosition';
import { getSuggestionId } from '@/hooks/useSuggestionsKeyboard';
import { MAIN_CONTENT_ID } from '@/utils/html';
import clsx from 'clsx';
import React, { forwardRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import classes from './index.module.scss';

export interface SuggestionOption {
    value: string;
    label: string;
    description?: string;
}

interface ComponentProps {
    listboxId: string;
    position?: AnchorRect;
    options: SuggestionOption[];
    // the option the arrow keys are on, -1 for none
    activeIndex: number;
    // shown instead of the list when there is nothing to offer yet (loading, no result)
    message?: string;
    onSelect: (option: SuggestionOption) => void;
}

/**
 * The dropdown half of the DSFR-less combobox pattern. It is portalled to the body because
 * these fields live inside `fr-collapse`, which clips its overflow, and because anything
 * rendered in flow under the input would push the rest of the form down as the user types.
 */
const Component = forwardRef<HTMLDivElement, ComponentProps>(
    ({ listboxId, position, options, activeIndex, message, onSelect }: ComponentProps, ref) => {
        useEffect(() => {
            if (activeIndex !== -1) {
                document.getElementById(getSuggestionId(listboxId, activeIndex))?.scrollIntoView({ block: 'nearest' });
            }
        }, [listboxId, activeIndex]);

        if (!position || (!options.length && !message)) {
            return null;
        }

        return createPortal(
            <div
                ref={ref}
                className={classes.popup}
                style={{ top: position.top, left: position.left, width: position.width }}
                // a press on the content keeps the focus in the field, which drives the list; one on the
                // scrollbar (the popup itself) is left alone so it can still be dragged
                onMouseDown={(event) => event.target !== event.currentTarget && event.preventDefault()}
            >
                {options.length ? (
                    <ul className={classes.suggestions} id={listboxId} role="listbox">
                        {options.map((option, index) => (
                            // the option itself takes the click: a button inside it would be a nested control
                            <li
                                key={option.value}
                                id={getSuggestionId(listboxId, index)}
                                role="option"
                                aria-selected={index === activeIndex}
                                className={clsx(
                                    classes.suggestion,
                                    index === activeIndex && classes['suggestion-active'],
                                )}
                                onClick={() => onSelect(option)}
                            >
                                <span className={classes['suggestion-label']}>{option.label}</span>
                                {option.description ? (
                                    <span className={classes['suggestion-description']}>{option.description}</span>
                                ) : null}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className={classes.message}>{message}</p>
                )}
            </div>,
            // inside the page landmark, out of any clipping ancestor of the field
            document.getElementById(MAIN_CONTENT_ID) ?? document.body,
        );
    },
);

Component.displayName = 'SuggestionsPopup';

interface SuggestionsStatusProps {
    opened: boolean;
    count: number;
    message?: string;
}

// Mounted with the field rather than with the popup: a live region only announces changes to
// content it already holds.
export const SuggestionsStatus: React.FC<SuggestionsStatusProps> = ({ opened, count, message }) => {
    let text = '';

    if (opened && count) {
        text = `${count} suggestion${count > 1 ? 's' : ''} disponible${count > 1 ? 's' : ''}`;
    } else if (opened && message) {
        text = message;
    }

    return (
        <p className="fr-sr-only" role="status">
            {text}
        </p>
    );
};

export default Component;

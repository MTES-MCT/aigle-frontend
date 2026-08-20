import { AnchorRect } from '@/hooks/useAnchoredPosition';
import { forwardRef } from 'react';
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
    ({ listboxId, position, options, message, onSelect }: ComponentProps, ref) => {
        if (!position || (!options.length && !message)) {
            return null;
        }

        return createPortal(
            <div
                ref={ref}
                className={classes.popup}
                style={{ top: position.top, left: position.left, width: position.width }}
            >
                {options.length ? (
                    <ul className={classes.suggestions} id={listboxId} role="listbox">
                        {options.map((option) => (
                            <li key={option.value} role="option" aria-selected={false}>
                                <button type="button" className={classes.suggestion} onClick={() => onSelect(option)}>
                                    <span className={classes['suggestion-label']}>{option.label}</span>
                                    {option.description ? (
                                        <span className={classes['suggestion-description']}>{option.description}</span>
                                    ) : null}
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className={classes.message}>{message}</p>
                )}
            </div>,
            document.body,
        );
    },
);

Component.displayName = 'SuggestionsPopup';

export default Component;

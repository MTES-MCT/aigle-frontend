import React, { useEffect, useState } from 'react';

export const getSuggestionId = (listboxId: string, index: number) => `${listboxId}-option-${index}`;

/**
 * The keyboard half of the DSFR-less combobox: the arrows move through the options while the
 * focus stays in the field, Enter picks the option they are on.
 */
export const useSuggestionsKeyboard = <T extends { value: string }>(
    options: T[],
    opened: boolean,
    onPick: (option: T) => void,
) => {
    const [activeIndex, setActiveIndex] = useState(-1);
    const optionsKey = options.map(({ value }) => value).join('\n');

    // a list that opens again, or whose options changed, starts with none of them active
    useEffect(() => setActiveIndex(-1), [opened, optionsKey]);

    // until that reset has run, an index past the options points at nothing
    const index = activeIndex < options.length ? activeIndex : -1;

    const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (!options.length) {
            return;
        }

        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            const last = options.length - 1;

            if (event.key === 'ArrowDown') {
                setActiveIndex(index >= last ? 0 : index + 1);
            } else {
                setActiveIndex(index <= 0 ? last : index - 1);
            }
        } else if (event.key === 'Enter' && index !== -1) {
            // the field may sit in a form: Enter picks rather than submits
            event.preventDefault();
            onPick(options[index]);
        }
    };

    return { activeIndex: index, onKeyDown };
};

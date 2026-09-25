import Checkbox from '@/components/dsfr/Checkbox';
import { useAuth } from '@/store/slices/auth';
import { useLocalStorage } from '@mantine/hooks';
import clsx from 'clsx';
import React, { ReactNode, useRef } from 'react';
import { Link } from 'react-router-dom';
import { PATH_VALIDATION_CHECKLIST_ID } from '../content/exercises';
import { ContentBlock } from '../content/types';
import { usePathValidation } from '../usePathValidation';
import { buildAppFilterUrl, findSearchTerm, normalizeSearchText } from '../utils';
import classes from './index.module.scss';

const INLINE_MARKUP_REGEX = /(\*\*.+?\*\*|\[[^\]]+\]\([^)]+\))/g;
const LINK_REGEX = /^\[([^\]]+)\]\(([^)]+)\)$/;

// Every character is normalized on its own so a match in the normalized text maps back to the
// exact same characters in the original.
const highlightText = (text: string, terms: string[]): ReactNode => {
    if (!terms.length) {
        return text;
    }

    const chars = Array.from(text);
    const normalizedChars = chars.map(normalizeSearchText);
    const normalized = normalizedChars.join('');
    const originalIndexByNormalizedIndex: number[] = [];
    normalizedChars.forEach((normalizedChar, index) => {
        for (let i = 0; i < normalizedChar.length; i++) {
            originalIndexByNormalizedIndex.push(index);
        }
    });

    const highlighted = new Array(chars.length).fill(false);
    terms.forEach((term) => {
        let start = findSearchTerm(normalized, term);
        while (start !== -1) {
            const from = originalIndexByNormalizedIndex[start];
            const to = originalIndexByNormalizedIndex[start + term.length - 1];
            for (let i = from; i <= to; i++) {
                highlighted[i] = true;
            }
            start = findSearchTerm(normalized, term, start + term.length);
        }
    });

    const parts: ReactNode[] = [];
    let current = '';
    let currentHighlighted = highlighted[0];
    chars.forEach((char, index) => {
        if (highlighted[index] !== currentHighlighted) {
            parts.push(currentHighlighted ? <mark key={parts.length}>{current}</mark> : current);
            current = '';
            currentHighlighted = highlighted[index];
        }
        current += char;
    });
    parts.push(currentHighlighted ? <mark key={parts.length}>{current}</mark> : current);

    return parts;
};

interface InlineProps {
    text: string;
    highlightTerms?: string[];
}

export const Inline: React.FC<InlineProps> = ({ text, highlightTerms = [] }: InlineProps) => (
    <>
        {text.split(INLINE_MARKUP_REGEX).map((part, index) => {
            if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
                return <strong key={index}>{highlightText(part.slice(2, -2), highlightTerms)}</strong>;
            }

            const linkMatch = part.match(LINK_REGEX);
            if (linkMatch) {
                const [, label, href] = linkMatch;

                if (href.startsWith('/')) {
                    return (
                        <Link key={index} to={href}>
                            {highlightText(label, highlightTerms)}
                        </Link>
                    );
                }

                const isExternal = href.startsWith('http');
                return (
                    <a
                        key={index}
                        href={href}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        title={isExternal ? `${label} - nouvelle fenêtre` : undefined}
                    >
                        {highlightText(label, highlightTerms)}
                    </a>
                );
            }

            return <React.Fragment key={index}>{highlightText(part, highlightTerms)}</React.Fragment>;
        })}
    </>
);

interface ChecklistViewProps {
    items: string[];
    summary?: string;
    checked: number[];
    onToggle: (index: number, isChecked: boolean) => void;
    onReset: () => void;
    // No progress to show yet: the checklist is disabled and the badge says why.
    status?: 'loading' | 'unavailable';
    error?: string;
}

const ChecklistView: React.FC<ChecklistViewProps> = ({
    items,
    summary,
    checked,
    onToggle,
    onReset,
    status,
    error,
}: ChecklistViewProps) => {
    const done = checked.length === items.length;
    const containerRef = useRef<HTMLFieldSetElement>(null);

    let badgeLabel: ReactNode = (
        <>
            {checked.length} / {items.length} réalisé{checked.length > 1 ? 's' : ''}
        </>
    );
    if (status === 'loading') {
        badgeLabel = 'Chargement…';
    } else if (status === 'unavailable') {
        badgeLabel = 'Indisponible';
    }

    return (
        <fieldset
            ref={containerRef}
            className={clsx('fr-fieldset', error && 'fr-fieldset--error', classes.checklist)}
            disabled={!!status}
            aria-busy={status === 'loading' || undefined}
        >
            <legend className="fr-fieldset__legend fr-fieldset__legend--regular">
                <span
                    className={clsx('fr-badge fr-badge--sm', done && !status ? 'fr-badge--success' : 'fr-badge--info')}
                >
                    {badgeLabel}
                </span>
            </legend>
            {items.map((item, index) => (
                <div key={index} className="fr-fieldset__element">
                    <Checkbox
                        label={
                            <span>
                                <Inline text={item} />
                            </span>
                        }
                        checked={checked.includes(index)}
                        onChange={(isChecked) => onToggle(index, isChecked)}
                    />
                </div>
            ))}
            {summary ? (
                <div className="fr-fieldset__element">
                    <p className={classes['checklist-summary']}>
                        <Inline text={summary} />
                    </p>
                </div>
            ) : null}
            {/* Last, so that appearing with the first checked box moves nothing above it. */}
            {checked.length ? (
                <div className="fr-fieldset__element">
                    <button
                        type="button"
                        className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-refresh-line fr-btn--icon-left"
                        onClick={() => {
                            onReset();
                            // The button disappears with the last checked box: keep focus in the list.
                            containerRef.current?.querySelector<HTMLInputElement>('input[type=checkbox]')?.focus();
                        }}
                    >
                        Réinitialiser
                    </button>
                </div>
            ) : null}
            <div className={clsx('fr-messages-group', classes['checklist-messages'])} aria-live="polite">
                {error ? <p className="fr-message fr-message--error">{error}</p> : null}
            </div>
        </fieldset>
    );
};

interface LocalChecklistProps {
    id: string;
    items: string[];
    summary?: string;
}

const LocalChecklist: React.FC<LocalChecklistProps> = ({ id, items, summary }: LocalChecklistProps) => {
    const { userMe } = useAuth();
    // Keyed per user: workstations are often shared within a service, and logout keeps local storage.
    const [storedChecked, setChecked] = useLocalStorage<number[]>({
        key: `help-center-checklist-${userMe?.uuid ?? 'anonymous'}-${id}`,
        defaultValue: [],
    });
    // Whatever sits in storage is untrusted: an older format or a manual edit must not crash the page.
    const checked = Array.isArray(storedChecked) ? storedChecked.filter((index) => index < items.length) : [];

    return (
        <ChecklistView
            items={items}
            summary={summary}
            checked={checked}
            onToggle={(index, isChecked) =>
                setChecked(isChecked ? [...checked, index] : checked.filter((checkedIndex) => checkedIndex !== index))
            }
            onReset={() => setChecked([])}
        />
    );
};

interface PathValidationChecklistProps {
    items: string[];
    summary?: string;
}

const PathValidationChecklist: React.FC<PathValidationChecklistProps> = ({
    items,
    summary,
}: PathValidationChecklistProps) => {
    const { checked, isLoading, loadError, saveError, toggle, reset } = usePathValidation(items.length);

    let error: string | undefined;
    if (loadError) {
        error = 'Votre progression n’a pas pu être chargée. Rechargez la page pour réessayer.';
    } else if (saveError) {
        error = 'Votre dernière modification n’a pas pu être enregistrée. Réessayez.';
    }

    return (
        <ChecklistView
            items={items}
            summary={summary}
            checked={checked}
            onToggle={toggle}
            onReset={reset}
            status={isLoading ? 'loading' : loadError ? 'unavailable' : undefined}
            error={error}
        />
    );
};

interface ComponentProps {
    blocks: ContentBlock[];
    highlightTerms?: string[];
}

const Component: React.FC<ComponentProps> = ({ blocks, highlightTerms }: ComponentProps) => (
    <div className={classes.container}>
        {blocks.map((block, index) => {
            switch (block.type) {
                case 'paragraph':
                    return (
                        <p key={index}>
                            <Inline text={block.text} highlightTerms={highlightTerms} />
                        </p>
                    );
                case 'list': {
                    const ListTag = block.ordered ? 'ol' : 'ul';
                    return (
                        // fr-list: DSFR's list defaults, which a surrounding fr-raw-list would otherwise pass down.
                        <ListTag key={index} className={clsx('fr-list', block.columns && classes.columns)}>
                            {block.items.map((item, itemIndex) => (
                                <li key={itemIndex}>
                                    <Inline text={item} highlightTerms={highlightTerms} />
                                </li>
                            ))}
                        </ListTag>
                    );
                }
                case 'note':
                    return (
                        <div key={index} className={clsx('fr-highlight', classes.note)}>
                            <p>
                                <Inline text={block.text} highlightTerms={highlightTerms} />
                            </p>
                        </div>
                    );
                case 'warning':
                    return (
                        <div key={index} className={clsx('fr-alert fr-alert--warning fr-alert--sm', classes.alert)}>
                            <p>
                                <Inline text={block.text} highlightTerms={highlightTerms} />
                            </p>
                        </div>
                    );
                case 'example':
                    return (
                        <div
                            key={index}
                            className={clsx(
                                'fr-highlight fr-highlight--beige-gris-galet',
                                classes.note,
                                classes.example,
                            )}
                        >
                            <p>
                                <Inline text={block.text} highlightTerms={highlightTerms} />
                            </p>
                        </div>
                    );
                case 'table':
                    return (
                        <div
                            key={index}
                            className={clsx('fr-table fr-table--no-caption fr-table--multiline', classes.table)}
                        >
                            <div className="fr-table__wrapper">
                                <div className="fr-table__container">
                                    <div className="fr-table__content">
                                        <table>
                                            <thead>
                                                <tr>
                                                    {block.head.map((cell, cellIndex) => (
                                                        <th key={cellIndex} scope="col">
                                                            {cell}
                                                        </th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {block.rows.map((row, rowIndex) => (
                                                    <tr key={rowIndex}>
                                                        {row.map((cell, cellIndex) => (
                                                            <td key={cellIndex}>
                                                                <Inline text={cell} highlightTerms={highlightTerms} />
                                                            </td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                case 'checklist':
                    return block.id === PATH_VALIDATION_CHECKLIST_ID ? (
                        <PathValidationChecklist key={index} items={block.items} summary={block.summary} />
                    ) : (
                        <LocalChecklist key={index} id={block.id} items={block.items} summary={block.summary} />
                    );
                case 'appLink':
                    // A new tab keeps the instructions open next to the app, and the full load it
                    // implies is what makes the map and table read the filters from the url.
                    return (
                        <p key={index}>
                            <a
                                className="fr-btn fr-btn--secondary fr-btn--sm"
                                href={buildAppFilterUrl(block)}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={`${block.label} - nouvelle fenêtre`}
                            >
                                {block.label}
                            </a>
                        </p>
                    );
                default:
                    return null;
            }
        })}
    </div>
);

export default Component;

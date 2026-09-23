import Checkbox from '@/components/dsfr/Checkbox';
import { useAuth } from '@/store/slices/auth';
import { useLocalStorage } from '@mantine/hooks';
import clsx from 'clsx';
import React, { ReactNode, useRef } from 'react';
import { Link } from 'react-router-dom';
import { ContentBlock } from '../content/types';
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

interface ChecklistProps {
    id: string;
    items: string[];
    summary?: string;
}

const Checklist: React.FC<ChecklistProps> = ({ id, items, summary }: ChecklistProps) => {
    const { userMe } = useAuth();
    // Keyed per user: workstations are often shared within a service, and logout keeps local storage.
    const [storedChecked, setChecked] = useLocalStorage<number[]>({
        key: `help-center-checklist-${userMe?.uuid ?? 'anonymous'}-${id}`,
        defaultValue: [],
    });
    // Whatever sits in storage is untrusted: an older format or a manual edit must not crash the page.
    const checked = Array.isArray(storedChecked) ? storedChecked.filter((index) => index < items.length) : [];
    const done = checked.length === items.length;
    const containerRef = useRef<HTMLDivElement>(null);

    return (
        <div ref={containerRef} className={classes.checklist}>
            <div className={classes['checklist-header']}>
                <p className={clsx('fr-badge fr-badge--sm', done ? 'fr-badge--success' : 'fr-badge--info')}>
                    {checked.length} / {items.length} réalisé{checked.length > 1 ? 's' : ''}
                </p>
                {checked.length ? (
                    <button
                        type="button"
                        className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-refresh-line fr-btn--icon-left"
                        onClick={() => {
                            setChecked([]);
                            // The button disappears with the last checked box: keep focus in the list.
                            containerRef.current?.querySelector<HTMLInputElement>('input[type=checkbox]')?.focus();
                        }}
                    >
                        Réinitialiser
                    </button>
                ) : null}
            </div>
            {items.map((item, index) => (
                <Checkbox
                    key={index}
                    label={
                        <span>
                            <Inline text={item} />
                        </span>
                    }
                    checked={checked.includes(index)}
                    onChange={(isChecked) =>
                        setChecked(
                            isChecked ? [...checked, index] : checked.filter((checkedIndex) => checkedIndex !== index),
                        )
                    }
                />
            ))}
            {summary ? (
                <p className={classes['checklist-summary']}>
                    <Inline text={summary} />
                </p>
            ) : null}
        </div>
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
                        <ListTag key={index}>
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
                        <p key={index} className={classes.example}>
                            <Inline text={block.text} highlightTerms={highlightTerms} />
                        </p>
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
                    return <Checklist key={index} id={block.id} items={block.items} summary={block.summary} />;
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

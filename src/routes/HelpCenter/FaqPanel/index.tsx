import Accordion from '@/components/dsfr/Accordion';
import { useClipboard } from '@mantine/hooks';
import clsx from 'clsx';
import React, { useId, useMemo, useState } from 'react';
import { FAQ_CATEGORIES } from '../content/faq';
import { FaqQuestion } from '../content/types';
import RichText, { Inline } from '../RichText';
import { findSearchTerm, getBlocksText, getHelpCenterUrl, normalizeSearchText } from '../utils';
import classes from './index.module.scss';

// Words that match nearly every answer: searching or highlighting them only adds noise.
const IGNORED_SEARCH_WORDS = new Set([
    ...'le la les de des du un une et en au aux je mon ma mes est il on que qui pour par sur dans'.split(' '),
    ...'ce ces se ne pas comment pourquoi quoi quel quelle peut faire'.split(' '),
]);

const getSearchTerms = (query: string): string[] => [
    ...new Set(
        normalizeSearchText(query)
            .split(/[^a-z0-9]+/)
            .filter((word) => word.length > 1 && !IGNORED_SEARCH_WORDS.has(word))
            // Plural-insensitive: "caravanes" still finds "caravane". The stem must stay longer than
            // 3 letters, or it would only match as a whole word ("faux" must not become "fau").
            .map((word) => (word.length > 4 && /[sx]$/.test(word) ? word.slice(0, -1) : word)),
    ),
];

const SEARCH_INDEX = new Map<string, string>(
    FAQ_CATEGORIES.flatMap(({ title, questions }) =>
        questions.map(
            ({ id, question, answer }) =>
                [id, normalizeSearchText(`${title} ${question} ${getBlocksText(answer)}`)] as const,
        ),
    ),
);

const QUESTIONS_COUNT = SEARCH_INDEX.size;

const CopyLinkButton: React.FC<{ questionId: string }> = ({ questionId }) => {
    const clipboard = useClipboard({ timeout: 2000 });

    return (
        <button
            type="button"
            className={clsx(
                'fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-btn--icon-left',
                clipboard.copied ? 'fr-icon-check-line' : 'fr-icon-links-line',
            )}
            onClick={() => clipboard.copy(getHelpCenterUrl('faq', questionId))}
        >
            {clipboard.copied ? 'Lien copié' : 'Copier le lien vers cette question'}
        </button>
    );
};

interface ComponentProps {
    expandedIds: string[];
    onToggle: (id: string, expanded: boolean) => void;
}

const Component: React.FC<ComponentProps> = ({ expandedIds, onToggle }: ComponentProps) => {
    const searchId = useId();
    const [query, setQuery] = useState('');
    const [categoryId, setCategoryId] = useState<string | null>(null);

    const searchTerms = useMemo(() => getSearchTerms(query), [query]);

    const categories = useMemo(
        () =>
            FAQ_CATEGORIES.filter(({ id }) => !categoryId || id === categoryId)
                .map((category) => ({
                    ...category,
                    questions: category.questions.filter(({ id }) => {
                        const text = SEARCH_INDEX.get(id) ?? '';
                        return searchTerms.every((term) => findSearchTerm(text, term) !== -1);
                    }),
                }))
                .filter(({ questions }) => questions.length),
        [categoryId, searchTerms],
    );

    const resultsCount = categories.reduce((total, { questions }) => total + questions.length, 0);
    const isFiltered = !!searchTerms.length || !!categoryId;

    const renderQuestion = (question: FaqQuestion) => (
        <Accordion
            key={question.id}
            id={question.id}
            titleAs="h4"
            // The accordion button is a flex container: bare text next to <mark> would lose its spaces.
            title={
                <span>
                    <Inline text={question.question} highlightTerms={searchTerms} />
                </span>
            }
            expanded={expandedIds.includes(question.id)}
            onToggle={(expanded) => onToggle(question.id, expanded)}
        >
            <div className={classes.answer}>
                <RichText blocks={question.answer} highlightTerms={searchTerms} />
                <CopyLinkButton questionId={question.id} />
            </div>
        </Accordion>
    );

    return (
        <>
            <div className={classes.intro}>
                <h2 className="fr-sr-only">Questions fréquentes</h2>
                <p>
                    Retrouvez les réponses aux {QUESTIONS_COUNT} questions les plus fréquentes sur AIGLE, classées par
                    thème. Recherchez par mot-clé ou filtrez par thème.
                </p>
            </div>

            <div className={clsx('fr-input-group', classes.search)} role="search">
                <label className="fr-label" htmlFor={searchId}>
                    Rechercher dans les questions fréquentes
                    <span className="fr-hint-text">Par exemple : cadastre, prescription, export, mot de passe</span>
                </label>
                <div className="fr-input-wrap fr-icon-search-line">
                    <input
                        className="fr-input"
                        id={searchId}
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.currentTarget.value)}
                    />
                </div>
            </div>

            <ul className={clsx('fr-tags-group', classes.tags)} aria-label="Filtrer par thème">
                <li>
                    <button
                        type="button"
                        className="fr-tag fr-tag--sm"
                        aria-pressed={!categoryId}
                        onClick={() => setCategoryId(null)}
                    >
                        Tous les thèmes
                    </button>
                </li>
                {FAQ_CATEGORIES.map((category) => (
                    <li key={category.id}>
                        <button
                            type="button"
                            className="fr-tag fr-tag--sm"
                            aria-pressed={categoryId === category.id}
                            onClick={() => setCategoryId(categoryId === category.id ? null : category.id)}
                        >
                            {category.title}
                        </button>
                    </li>
                ))}
            </ul>

            <p className={classes.count} aria-live="polite">
                {isFiltered
                    ? `${resultsCount} question${resultsCount > 1 ? 's' : ''} sur ${QUESTIONS_COUNT}`
                    : `${QUESTIONS_COUNT} questions`}
            </p>

            {categories.length ? (
                categories.map((category) => (
                    <section key={category.id} className={classes.category}>
                        <h3>{category.title}</h3>
                        <div className="fr-accordions-group">{category.questions.map(renderQuestion)}</div>
                    </section>
                ))
            ) : (
                <div className={classes.empty}>
                    <p>Aucune question ne correspond à votre recherche.</p>
                    <button
                        type="button"
                        className="fr-btn fr-btn--secondary fr-btn--sm"
                        onClick={() => {
                            setQuery('');
                            setCategoryId(null);
                            document.getElementById(searchId)?.focus();
                        }}
                    >
                        Afficher toutes les questions
                    </button>
                </div>
            )}
        </>
    );
};

export default Component;

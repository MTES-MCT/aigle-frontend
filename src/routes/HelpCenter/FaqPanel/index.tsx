import Accordion from '@/components/dsfr/Accordion';
import { useClipboard } from '@mantine/hooks';
import clsx from 'clsx';
import React, { useId, useMemo, useState } from 'react';
import { FAQ_CATEGORIES } from '../content/faq';
import { FaqQuestion } from '../content/types';
import RichText, { Inline } from '../RichText';
import { CONTACT_EMAIL, findSearchTerm, getBlocksText, getHelpCenterUrl, normalizeSearchText } from '../utils';
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
    const themeSelectId = useId();
    const [query, setQuery] = useState('');
    const [categoryId, setCategoryId] = useState<string | null>(null);

    const searchTerms = useMemo(() => getSearchTerms(query), [query]);

    // Search first, theme second: the theme menu shows how many matches each theme holds.
    const matchingCategories = useMemo(
        () =>
            FAQ_CATEGORIES.map((category) => ({
                ...category,
                questions: category.questions.filter(({ id }) => {
                    const text = SEARCH_INDEX.get(id) ?? '';
                    return searchTerms.every((term) => findSearchTerm(text, term) !== -1);
                }),
            })),
        [searchTerms],
    );
    const matchingCount = matchingCategories.reduce((total, { questions }) => total + questions.length, 0);
    const categories = matchingCategories.filter(
        ({ id, questions }) => questions.length && (!categoryId || id === categoryId),
    );

    const resultsCount = categories.reduce((total, { questions }) => total + questions.length, 0);
    const isFiltered = !!searchTerms.length || !!categoryId;
    const selectedCategory = FAQ_CATEGORIES.find(({ id }) => id === categoryId);

    const resetFilters = () => {
        setQuery('');
        setCategoryId(null);
        document.getElementById(searchId)?.focus();
    };

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

    const themeOptions = [
        { id: null, title: 'Tous les thèmes', count: matchingCount },
        ...matchingCategories.map(({ id, title, questions }) => ({ id, title, count: questions.length })),
    ];

    return (
        <>
            <h2 className="fr-sr-only">Questions fréquentes</h2>
            <div className={classes.layout}>
                <nav className={clsx('fr-sidemenu fr-hidden fr-unhidden-lg', classes.sidemenu)} aria-label="Thèmes">
                    <div className="fr-sidemenu__inner">
                        <p className={clsx('fr-sidemenu__title', classes['sidemenu-title'])}>Thèmes</p>
                        <ul className="fr-sidemenu__list">
                            {themeOptions.map((option) => (
                                <li key={option.id ?? 'all'} className="fr-sidemenu__item">
                                    <button
                                        type="button"
                                        className={clsx('fr-sidemenu__link', classes['theme-link'])}
                                        aria-current={categoryId === option.id ? 'true' : undefined}
                                        onClick={() => setCategoryId(option.id)}
                                    >
                                        <span>{option.title}</span>
                                        <span className={classes['theme-count']}>{option.count}</span>
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </div>
                </nav>

                <div className={classes.content}>
                    <p className={classes.intro}>
                        Retrouvez les réponses aux {QUESTIONS_COUNT} questions les plus fréquentes sur AIGLE, classées
                        par thème. Recherchez par mot-clé ou filtrez par thème.
                    </p>

                    <div className={classes.filters} role="search">
                        <div className={clsx('fr-input-group', classes.field)}>
                            <label className="fr-label" htmlFor={searchId}>
                                Rechercher dans les questions fréquentes
                                <span className="fr-hint-text">
                                    Par exemple : cadastre, prescription, export, mot de passe
                                </span>
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

                        <div className={clsx('fr-select-group fr-hidden-lg', classes.field)}>
                            <label className="fr-label" htmlFor={themeSelectId}>
                                Thème
                            </label>
                            <select
                                className="fr-select"
                                id={themeSelectId}
                                value={categoryId ?? ''}
                                onChange={(event) => setCategoryId(event.currentTarget.value || null)}
                            >
                                {themeOptions.map((option) => (
                                    <option key={option.id ?? 'all'} value={option.id ?? ''}>
                                        {option.title} ({option.count})
                                    </option>
                                ))}
                            </select>
                        </div>

                        <p className={classes.count} aria-live="polite">
                            {isFiltered
                                ? `${resultsCount} question${resultsCount > 1 ? 's' : ''} sur ${QUESTIONS_COUNT}${
                                      selectedCategory ? ` · ${selectedCategory.title}` : ''
                                  }`
                                : `${QUESTIONS_COUNT} questions`}
                        </p>
                    </div>

                    {categories.length ? (
                        categories.map((category) => (
                            <section key={category.id} className={classes.category}>
                                <h3 className="fr-h6">{category.title}</h3>
                                <div className="fr-accordions-group">{category.questions.map(renderQuestion)}</div>
                            </section>
                        ))
                    ) : (
                        <div className={classes.empty}>
                            <div className="fr-alert fr-alert--info fr-alert--sm">
                                <p>
                                    Aucune question ne correspond à votre recherche. Essayez un autre mot-clé, ou posez
                                    directement votre question à l’équipe AIGLE.
                                </p>
                            </div>
                            <ul className="fr-btns-group fr-btns-group--sm fr-btns-group--inline-md fr-btns-group--icon-left">
                                <li>
                                    <button type="button" className="fr-btn fr-btn--secondary" onClick={resetFilters}>
                                        Afficher toutes les questions
                                    </button>
                                </li>
                                <li>
                                    <a
                                        className="fr-btn fr-btn--tertiary fr-icon-mail-line"
                                        href={`mailto:${CONTACT_EMAIL}`}
                                    >
                                        Écrire à l’équipe AIGLE
                                    </a>
                                </li>
                            </ul>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};

export default Component;

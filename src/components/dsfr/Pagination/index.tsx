import clsx from 'clsx';
import React from 'react';

// pages shown on each side of the current one, the first and last pages always are
const SIBLINGS = 1;

type PageItem = number | 'ellipsis-start' | 'ellipsis-end';

const getPageItems = (page: number, totalPages: number): PageItem[] => {
    const start = Math.max(2, page - SIBLINGS);
    const end = Math.min(totalPages - 1, page + SIBLINGS);
    const items: PageItem[] = [1];

    if (start > 2) {
        items.push('ellipsis-start');
    }

    for (let current = start; current <= end; current += 1) {
        items.push(current);
    }

    if (end < totalPages - 1) {
        items.push('ellipsis-end');
    }

    if (totalPages > 1) {
        items.push(totalPages);
    }

    return items;
};

interface ComponentProps {
    // 1-based
    page: number;
    totalPages: number;
    onChange: (page: number) => void;
    className?: string;
}

// The DSFR pagination with buttons: the pages are client state, not urls.
const Component: React.FC<ComponentProps> = ({ page, totalPages, onChange, className }: ComponentProps) => {
    const isFirst = page <= 1;
    const isLast = page >= totalPages;

    return (
        <nav role="navigation" className={clsx('fr-pagination', className)} aria-label="Pagination">
            <ul className="fr-pagination__list">
                <li>
                    <button
                        type="button"
                        className="fr-pagination__link fr-pagination__link--first"
                        disabled={isFirst}
                        onClick={() => onChange(1)}
                    >
                        Première page
                    </button>
                </li>
                <li>
                    <button
                        type="button"
                        className="fr-pagination__link fr-pagination__link--prev fr-pagination__link--lg-label"
                        disabled={isFirst}
                        onClick={() => onChange(page - 1)}
                    >
                        Page précédente
                    </button>
                </li>
                {getPageItems(page, totalPages).map((item) =>
                    typeof item === 'number' ? (
                        <li key={item}>
                            <button
                                type="button"
                                className="fr-pagination__link"
                                title={`Page ${item}`}
                                aria-current={item === page ? 'page' : undefined}
                                onClick={() => onChange(item)}
                            >
                                {item}
                            </button>
                        </li>
                    ) : (
                        <li key={item}>
                            <span className="fr-pagination__link fr-displayed-lg">…</span>
                        </li>
                    ),
                )}
                <li>
                    <button
                        type="button"
                        className="fr-pagination__link fr-pagination__link--next fr-pagination__link--lg-label"
                        disabled={isLast}
                        onClick={() => onChange(page + 1)}
                    >
                        Page suivante
                    </button>
                </li>
                <li>
                    <button
                        type="button"
                        className="fr-pagination__link fr-pagination__link--last"
                        disabled={isLast}
                        onClick={() => onChange(totalPages)}
                    >
                        Dernière page
                    </button>
                </li>
            </ul>
        </nav>
    );
};

export default Component;

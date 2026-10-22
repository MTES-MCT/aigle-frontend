import clsx from 'clsx';
import React, { PropsWithChildren, ReactNode } from 'react';
import classes from './index.module.scss';

export type SortOrder = 'asc' | 'desc';

interface SortHeaderProps extends PropsWithChildren {
    sortOrder?: SortOrder;
    onOrderChange: (sortOrder?: SortOrder) => void;
    className?: string;
}

const ARIA_SORT: Record<SortOrder, 'ascending' | 'descending'> = { asc: 'ascending', desc: 'descending' };

const SORT_ACTION_LABELS: Record<SortOrder | 'none', string> = {
    none: 'Trier par ordre croissant',
    asc: 'Trier par ordre décroissant',
    desc: 'Retirer le tri',
};

// A sortable column header: unsorted, then ascending, descending and back to unsorted.
export const TableSortHeader: React.FC<SortHeaderProps> = ({
    sortOrder,
    onOrderChange,
    className,
    children,
}: SortHeaderProps) => {
    const actionLabel = SORT_ACTION_LABELS[sortOrder ?? 'none'];

    return (
        <th scope="col" className={className} aria-sort={sortOrder ? ARIA_SORT[sortOrder] : undefined}>
            <div className="fr-cell--sort">
                <span>{children}</span>
                <button
                    type="button"
                    className={clsx('fr-btn fr-btn--sm', sortOrder ? `fr-btn--sort-${sortOrder}` : 'fr-btn--sort')}
                    title={actionLabel}
                    onClick={() => {
                        if (sortOrder === 'asc') {
                            onOrderChange('desc');
                        } else if (sortOrder === 'desc') {
                            onOrderChange(undefined);
                        } else {
                            onOrderChange('asc');
                        }
                    }}
                >
                    {actionLabel}
                </button>
            </div>
        </th>
    );
};

interface ComponentProps extends PropsWithChildren {
    // read by screen readers only
    caption: string;
    header?: ReactNode;
    footerStart?: ReactNode;
    footerMiddle?: ReactNode;
    footerEnd?: ReactNode;
    size?: 'sm' | 'md';
    bordered?: boolean;
    busy?: boolean;
    className?: string;
    tableRef?: React.Ref<HTMLTableElement>;
}

/**
 * The DSFR table markup (`fr-table` > wrapper > container > content). `data-fr-js-table` is what
 * the DSFR script would set: it turns on the outer border, which is otherwise drawn by that script.
 */
const Component: React.FC<ComponentProps> = ({
    caption,
    header,
    footerStart,
    footerMiddle,
    footerEnd,
    size = 'md',
    bordered = false,
    busy = false,
    className,
    tableRef,
    children,
}: ComponentProps) => (
    <div
        className={clsx(
            'fr-table fr-table--no-caption fr-table--multiline',
            size === 'sm' && 'fr-table--sm',
            bordered && 'fr-table--bordered',
            classes.table,
            busy && classes.busy,
            className,
        )}
        data-fr-js-table="true"
        aria-busy={busy || undefined}
    >
        {header ? <div className={clsx('fr-table__header', classes.header)}>{header}</div> : null}
        <div className="fr-table__wrapper">
            <div className="fr-table__container">
                <div className="fr-table__content">
                    <table ref={tableRef}>
                        <caption>{caption}</caption>
                        {children}
                    </table>
                </div>
            </div>
        </div>
        {footerStart || footerMiddle || footerEnd ? (
            <div className={clsx('fr-table__footer', classes.footer)}>
                <div className="fr-table__footer--start">{footerStart}</div>
                <div className="fr-table__footer--middle">{footerMiddle}</div>
                {footerEnd ? <div className="fr-table__footer--end">{footerEnd}</div> : null}
            </div>
        ) : null}
    </div>
);

export default Component;

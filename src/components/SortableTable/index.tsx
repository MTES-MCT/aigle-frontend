import React, { useMemo, useState } from 'react';

import DataTableSortableHeaderColumn, { SortOrder } from '@/components/DataTable/DataTableSortableHeaderColumn';
import { downloadCsv } from '@/utils/download';
import { ActionIcon, Table, TextInput, Tooltip } from '@mantine/core';
import { IconDownload, IconSearch } from '@tabler/icons-react';
import classes from './index.module.scss';

export interface SortableTableColumn<T> {
    key: string;
    label: string;
    /** Cell value: what is sorted, searched and exported. Rendered as-is unless `render` is given. */
    value: (item: T) => string | number | null;
    render?: (item: T) => React.ReactNode;
    /** Overrides `value` for sorting only (ranked categories, dates behind a formatted label...). */
    sortValue?: (item: T) => string | number | null;
    /** Totals row cell. The row appears as soon as one column defines it. */
    footer?: (items: T[]) => React.ReactNode;
}

const compareValues = (a: string | number, b: string | number) =>
    typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'fr');

// Accent-insensitive search: decompose, then drop the combining marks.
const normalize = (value: string) =>
    value
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

interface ComponentProps<T> {
    columns: SortableTableColumn<T>[];
    items: T[];
    getItemKey: (item: T) => string;
    initialSort?: { key: string; order: SortOrder };
    /** Renders a search input filtering on every column value. */
    searchPlaceholder?: string;
    /** Renders the CSV export button. */
    csvFileName?: string;
}

const Component = <T,>({
    columns,
    items,
    getItemKey,
    initialSort,
    searchPlaceholder,
    csvFileName,
}: ComponentProps<T>) => {
    const [sort, setSort] = useState<{ key: string; order: SortOrder } | undefined>(initialSort);
    const [search, setSearch] = useState('');

    const rows = useMemo(() => {
        const query = normalize(search.trim());
        const filtered = query
            ? items.filter((item) =>
                  columns.some((column) => normalize(String(column.value(item) ?? '')).includes(query)),
              )
            : items;

        const sortColumn = sort ? columns.find((column) => column.key === sort.key) : undefined;
        if (!sortColumn || !sort) {
            return filtered;
        }

        const sortValue = sortColumn.sortValue || sortColumn.value;
        return [...filtered].sort((a, b) => {
            const [valueA, valueB] = [sortValue(a), sortValue(b)];
            // Empty cells stay at the bottom whatever the direction.
            if (valueA === null || valueB === null) {
                return valueA === valueB ? 0 : valueA === null ? 1 : -1;
            }
            return (sort.order === 'desc' ? -1 : 1) * compareValues(valueA, valueB);
        });
    }, [items, columns, sort, search]);

    const hasFooter = columns.some((column) => !!column.footer);

    return (
        <>
            {searchPlaceholder || csvFileName ? (
                <div className={classes['table-actions']}>
                    {searchPlaceholder ? (
                        <TextInput
                            className={classes.search}
                            leftSection={<IconSearch size={16} />}
                            placeholder={searchPlaceholder}
                            value={search}
                            onChange={(event) => setSearch(event.currentTarget.value)}
                        />
                    ) : null}
                    {csvFileName ? (
                        <Tooltip label="Télécharger le tableau (CSV)">
                            <ActionIcon
                                variant="subtle"
                                size="lg"
                                aria-label="Télécharger le tableau (CSV)"
                                onClick={() =>
                                    downloadCsv(csvFileName, [
                                        columns.map((column) => column.label),
                                        ...rows.map((item) => columns.map((column) => column.value(item))),
                                    ])
                                }
                            >
                                <IconDownload size={18} />
                            </ActionIcon>
                        </Tooltip>
                    ) : null}
                </div>
            ) : null}

            <div className={classes.container}>
                <Table>
                    <Table.Thead>
                        <Table.Tr>
                            {columns.map((column) => (
                                <DataTableSortableHeaderColumn
                                    key={column.key}
                                    sortOrder={sort?.key === column.key ? sort.order : undefined}
                                    onOrderChange={(order) => setSort(order ? { key: column.key, order } : undefined)}
                                >
                                    {column.label}
                                </DataTableSortableHeaderColumn>
                            ))}
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows.length ? null : (
                            <Table.Tr>
                                <Table.Td className="empty-results-cell" colSpan={columns.length}>
                                    Aucun résultat
                                </Table.Td>
                            </Table.Tr>
                        )}
                        {rows.map((item) => (
                            <Table.Tr key={getItemKey(item)}>
                                {columns.map((column) => (
                                    <Table.Td key={column.key}>
                                        {column.render ? column.render(item) : column.value(item)}
                                    </Table.Td>
                                ))}
                            </Table.Tr>
                        ))}
                    </Table.Tbody>
                    {hasFooter ? (
                        <Table.Tfoot className={classes.footer}>
                            <Table.Tr>
                                {columns.map((column) => (
                                    <Table.Td key={column.key}>{column.footer ? column.footer(rows) : null}</Table.Td>
                                ))}
                            </Table.Tr>
                        </Table.Tfoot>
                    ) : null}
                </Table>
            </div>
        </>
    );
};

export default Component;

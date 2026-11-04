import { SortOrder } from '@/components/dsfr/Table';
import { ObjectsFilter } from '@/models/detection-filter';

export interface FormValues {
    communesUuids: string[];
    epcisUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
}

export interface DataTableFilter extends ObjectsFilter, FormValues {}

export interface TableOrder<F extends string = string> {
    sortOrder?: SortOrder;
    field: F;
}

// the API `ordering` param: the field, prefixed with `-` when descending
export const getOrdering = ({ sortOrder, field }: TableOrder) => (sortOrder === 'asc' ? field : `-${field}`);

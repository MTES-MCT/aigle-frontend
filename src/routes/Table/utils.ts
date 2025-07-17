import { ObjectsFilter } from '@/models/detection-filter';

export interface FormValues {
    communesUuids: string[];
    departmentsUuids: string[];
    regionsUuids: string[];
}

export interface DataTableFilter extends ObjectsFilter, FormValues {}

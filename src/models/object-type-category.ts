import { Timestamped, Uuided } from '@/models/data';
import { ObjectType } from '@/models/object-type';

export const objectTypeCategoryObjectTypeStatuses = ['VISIBLE', 'OTHER_CATEGORY', 'HIDDEN'] as const;
export type ObjectTypeCategoryObjectTypeStatus = (typeof objectTypeCategoryObjectTypeStatuses)[number];

export interface ObjectTypeCategoryObjectType {
    objectType: ObjectType;
    objectTypeCategoryObjectTypeStatus: ObjectTypeCategoryObjectTypeStatus;
}

export interface ObjectTypeCategory extends Uuided, Timestamped {
    name: string;
}

export interface ObjectTypeCategoryDetail extends ObjectTypeCategory {
    objectTypeCategoryObjectTypes: ObjectTypeCategoryObjectType[];
}

import { Timestamped, Uuided } from '@/models/data';
import { ObjectTypeCategory } from '@/models/object-type-category';

export interface ObjectType extends Uuided, Timestamped {
    name: string;
    color: string;
}

export interface ObjectTypeDetail extends ObjectType {
    categories: ObjectTypeCategory[];
}

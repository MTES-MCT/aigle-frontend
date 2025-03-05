import { Timestamped, Uuided, WithCollectivities } from '@/models/data';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { ObjectTypeCategory } from '@/models/object-type-category';

export const userGroupTypes = ['DDTM', 'COLLECTIVITY'] as const;
export type UserGroupType = (typeof userGroupTypes)[number];

export interface UserGroup extends Uuided, Timestamped {
    name: string;
    userGroupType: UserGroupType;
}

export interface UserGroupDetail extends UserGroup, WithCollectivities {
    objectTypeCategories: ObjectTypeCategory[];
    geoCustomZones: GeoCustomZone[];
}

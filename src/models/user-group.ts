import { Timestamped, Uuided } from '@/models/data';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { GeoZone } from '@/models/geo/geo-zone';
import { ObjectTypeCategory } from '@/models/object-type-category';

export const userGroupTypes = ['DDTM', 'COLLECTIVITY'] as const;
export type UserGroupType = (typeof userGroupTypes)[number];

export interface UserGroup extends Uuided, Timestamped {
    name: string;
    userGroupType: UserGroupType;
}

export interface UserGroupDetail extends UserGroup {
    communes: GeoZone[];
    departments: GeoZone[];
    regions: GeoZone[];
    objectTypeCategories: ObjectTypeCategory[];
    geoCustomZones: GeoCustomZone[];
}

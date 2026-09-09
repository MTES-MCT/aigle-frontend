import { Timestamped, Uuided, WithCollectivities } from '@/models/data';
import { GeoCustomZone } from '@/models/geo/geo-custom-zone';
import { GeoZone } from '@/models/geo/geo-zone';
import { ObjectTypeCategory } from '@/models/object-type-category';

export const userGroupTypes = ['DDTM', 'COLLECTIVITY'] as const;
export type UserGroupType = (typeof userGroupTypes)[number];

// Mirrors the FeatureFlag enum of the API. The catalogue displayed in the admin form
// comes from the backend, this union only types the `if` that gates a feature.
export const featureFlags = ['STATS', 'REQUIRE_2FA'] as const;
export type FeatureFlag = (typeof featureFlags)[number];

export interface FeatureFlagOption {
    value: FeatureFlag;
    label: string;
}

export interface UserGroup extends Uuided, Timestamped {
    name: string;
    userGroupType: UserGroupType;
    geoZones: GeoZone[];
}

export interface UserGroupDetail extends UserGroup, WithCollectivities {
    objectTypeCategories: ObjectTypeCategory[];
    geoCustomZones: GeoCustomZone[];
    featureFlags: FeatureFlag[];
}

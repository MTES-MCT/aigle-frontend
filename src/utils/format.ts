import { GeoCommune } from '@/models/geo/geo-commune';
import { ParcelMinimal } from '@/models/parcel';

export const formatParcel = (parcel: ParcelMinimal) => {
    return `${parcel.prefix} ${parcel.section} ${parcel.numParcel}`;
};

type OutputFormatCommune = 'CODE_BEFORE_NAME' | 'CODE_AFTER_NAME';

export const formatCommune = (commune: GeoCommune, type: OutputFormatCommune = 'CODE_BEFORE_NAME') => {
    if (type === 'CODE_BEFORE_NAME') {
        return `${commune.code} ${commune.name}`;
    }

    return `${commune.name} (${commune.code})`;
};

import { GeoCommune } from '@/models/geo/geo-commune';
import { ParcelMinimal } from '@/models/parcel';

export const formatParcel = (parcel: ParcelMinimal) => {
    let res = `${parcel.commune.code} `;

    if (parseInt(parcel.prefix) !== 0) {
        res += `${parcel.prefix} `;
    }

    res += `${parcel.section} ${parcel.numParcel}`;

    return res;
};

type OutputFormatCommune = 'CODE_BEFORE_NAME' | 'CODE_AFTER_NAME';

export const formatCommune = (commune: GeoCommune, type: OutputFormatCommune = 'CODE_BEFORE_NAME') => {
    if (type === 'CODE_BEFORE_NAME') {
        return `${commune.code} ${commune.name}`;
    }

    return `${commune.name} (${commune.code})`;
};

const INT_FORMATTER = new Intl.NumberFormat('fr-FR');

export const formatBigInt = (bigInt: number) => {
    return INT_FORMATTER.format(bigInt);
};

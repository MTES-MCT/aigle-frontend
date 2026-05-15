import { GeoCommune } from '@/models/geo/geo-commune';
import { GeoCustomZoneWithSubZones } from '@/models/geo/geo-custom-zone';
import { ParcelMinimal } from '@/models/parcel';
import { DEFAULT_DATE_FORMAT } from '@/utils/constants';

export const formatParcel = (parcel: ParcelMinimal, withCommuneCode: boolean = true) => {
    let res = '';

    if (withCommuneCode) {
        res += `${parcel.commune.code} `;
    }

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

export const formatDateOnly = (isoDate: string, displayFormat: string = DEFAULT_DATE_FORMAT): string => {
    const [year, month, day] = isoDate.substring(0, 10).split('-');
    return displayFormat.replace('yyyy', year).replace('MM', month).replace('dd', day);
};

export const formatGeoCustomZonesWithSubZones = (geoCustomZones: GeoCustomZoneWithSubZones[]) => {
    return geoCustomZones
        .map((geoCustomZone) => {
            let res = `${geoCustomZone.geoCustomZoneCategory ? geoCustomZone.geoCustomZoneCategory.name : geoCustomZone.name}`;

            if (geoCustomZone.subCustomZones && geoCustomZone.subCustomZones.length) {
                res += ` (${geoCustomZone.subCustomZones.map((subZone) => subZone.name).join(', ')})`;
            }

            return res;
        })
        .join(', ');
};

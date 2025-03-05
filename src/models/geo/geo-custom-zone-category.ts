import { Timestamped, Uuided } from '@/models/data';

export interface GeoCustomZoneCategory extends Uuided, Timestamped {
    name: string;
    color: string;
}

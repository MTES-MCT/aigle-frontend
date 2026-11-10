import React, { useMemo } from 'react';

import { controlPlanParcelEndpoints } from '@/api/endpoints';
import DetectionTilePreview from '@/components/DetectionDetail/DetectionTilePreview';
import Loader from '@/components/ui/Loader';
import { ControlPlanParcel, ControlPlanParcelPreview } from '@/models/control-plan';
import { formatCount } from '@/routes/ControlPlan/utils';
import api from '@/utils/api';
import { PARCEL_COLOR } from '@/utils/constants';
import { extendBbox } from '@/utils/geojson';
import { useQuery } from '@tanstack/react-query';
import { bbox } from '@turf/turf';
import { MultiPolygon, Polygon } from 'geojson';
import classes from './index.module.scss';

// the parcel and some of its surroundings
const BOUNDS_EXTENSION = 0.5;

interface PreviewGeometry {
    color: string;
    geometry: Polygon | MultiPolygon;
}

interface ComponentProps {
    parcel: ControlPlanParcel;
}

// The parcel on its latest imagery years, to judge it « à l'œil » before keeping or dismissing it.
const Component: React.FC<ComponentProps> = ({ parcel }: ComponentProps) => {
    const { data, isLoading, isError } = useQuery({
        queryKey: [controlPlanParcelEndpoints.preview(parcel.uuid)],
        queryFn: ({ signal }) =>
            api<ControlPlanParcelPreview>(controlPlanParcelEndpoints.preview(parcel.uuid), { signal }),
    });

    const geometries: PreviewGeometry[] = useMemo(() => {
        if (!data) {
            return [];
        }

        // a point cannot be outlined: the previews draw lines
        const objects = data.detectionObjects.flatMap(({ geometry, objectTypeColor }) =>
            geometry.type === 'Point' ? [] : [{ geometry, color: objectTypeColor }],
        );

        return data.parcelGeometry ? [...objects, { geometry: data.parcelGeometry, color: PARCEL_COLOR }] : objects;
    }, [data]);

    const bounds = useMemo(() => {
        if (data?.bounds) {
            return extendBbox(data.bounds, BOUNDS_EXTENSION);
        }

        if (data?.parcelGeometry) {
            return extendBbox(bbox(data.parcelGeometry) as [number, number, number, number], BOUNDS_EXTENSION);
        }

        return undefined;
    }, [data]);

    const tileSetPreviews = useMemo(
        () =>
            (data?.tileSetPreviews ?? [])
                .filter(({ preview }) => preview)
                .sort((first, second) => first.tileSet.date.localeCompare(second.tileSet.date)),
        [data],
    );

    if (isLoading) {
        return <Loader className={classes.loader} />;
    }

    if (isError || !data) {
        return <p className={classes.message}>L’aperçu de la parcelle n’a pas pu être chargé.</p>;
    }

    return (
        <div className={classes.container}>
            <p className={classes.summary}>
                {formatCount(parcel.objectsCount, 'objet')}
                {parcel.newObjectsCount ? `, dont ${formatCount(parcel.newObjectsCount, 'nouveau', 'nouveaux')}` : ''}
                {parcel.unverifiedObjectsCount
                    ? `, dont ${formatCount(parcel.unverifiedObjectsCount, 'non vérifié', 'non vérifiés')}`
                    : ''}
                . La parcelle est entourée en orange, les objets aux couleurs de leur type.
            </p>
            {bounds && tileSetPreviews.length ? (
                <div className={classes.previews}>
                    {tileSetPreviews.map(({ tileSet }) => (
                        <DetectionTilePreview
                            key={tileSet.uuid}
                            tileSet={tileSet}
                            bounds={bounds}
                            geometries={geometries}
                            controlsDisplayed={['ZOOM']}
                            fitBoundsOptions={{ padding: 10 }}
                            classNames={{
                                inner: 'detection-tile-preview-detail-container',
                                main: 'detection-tile-preview-detail',
                            }}
                        />
                    ))}
                </div>
            ) : (
                <p className={classes.message}>Aucune image aérienne ne couvre cette parcelle.</p>
            )}
        </div>
    );
};

export default Component;

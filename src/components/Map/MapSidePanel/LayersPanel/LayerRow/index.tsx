import Collapse from '@/components/dsfr/Collapse';
import Range from '@/components/dsfr/Range';
import { getCustomZoneOpacities, withAlpha } from '@/utils/colors';
import { DEFAULT_CUSTOM_ZONE_LAYER_OPACITY } from '@/utils/constants';
import clsx from 'clsx';
import React, { useId, useState } from 'react';
import classes from './index.module.scss';

const formatOpacity = (opacity: number) => `${Math.round(opacity)} %`;

interface ComponentProps {
    name: string;
    displayed: boolean;
    color?: string;
    icon?: string;
    description?: string | null;
    opacity?: number;
    onToggleDisplayed: (displayed: boolean) => void;
    onOpacityChange?: (opacity: number) => void;
}

const Component: React.FC<ComponentProps> = ({
    name,
    displayed,
    color,
    icon,
    description,
    opacity,
    onToggleDisplayed,
    onOpacityChange,
}: ComponentProps) => {
    const detailsId = `layer-details-${useId()}`;
    const [expanded, setExpanded] = useState(false);
    const expandable = onOpacityChange !== undefined || !!description;
    const swatchOpacities = getCustomZoneOpacities(opacity ?? DEFAULT_CUSTOM_ZONE_LAYER_OPACITY);

    return (
        <div className={classes.layer}>
            <div className={classes.header}>
                <span
                    className={clsx(classes.vignette, icon)}
                    style={
                        color
                            ? {
                                  backgroundColor: withAlpha(color, swatchOpacities.fill),
                                  borderColor: withAlpha(color, swatchOpacities.line),
                              }
                            : undefined
                    }
                    aria-hidden="true"
                />
                <span className={classes.title}>
                    <span className={classes.name}>{name}</span>
                </span>
                <button
                    type="button"
                    className={clsx(
                        'fr-btn fr-btn--tertiary-no-outline fr-btn--sm',
                        displayed ? 'fr-icon-eye-line' : 'fr-icon-eye-off-line',
                    )}
                    title={displayed ? `Masquer ${name}` : `Afficher ${name}`}
                    onClick={() => onToggleDisplayed(!displayed)}
                >
                    {displayed ? `Masquer ${name}` : `Afficher ${name}`}
                </button>
                {expandable ? (
                    <button
                        type="button"
                        className="fr-btn fr-btn--tertiary-no-outline fr-btn--sm fr-icon-arrow-down-s-line"
                        title={expanded ? `Replier ${name}` : `Déplier ${name}`}
                        aria-expanded={expanded}
                        aria-controls={detailsId}
                        onClick={() => setExpanded((prev) => !prev)}
                    >
                        {expanded ? `Replier ${name}` : `Déplier ${name}`}
                    </button>
                ) : null}
            </div>

            {expandable ? (
                <Collapse id={detailsId} expanded={expanded}>
                    <div className={classes.details}>
                        {onOpacityChange !== undefined && opacity !== undefined ? (
                            <Range
                                small
                                label={`Opacité de ${name}`}
                                value={Math.round(opacity * 100)}
                                min={0}
                                max={100}
                                step={5}
                                formatValue={formatOpacity}
                                onChange={(value) => onOpacityChange(value / 100)}
                            />
                        ) : null}
                        {description ? <p className={classes.description}>{description}</p> : null}
                    </div>
                </Collapse>
            ) : null}
        </div>
    );
};

export default Component;

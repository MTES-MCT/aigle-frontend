export const BLUE = '#2196F3';
export const YELLOW = '#936e00';
export const GREEN = '#39833c';
export const RED = '#bb1c18';
export const GREY = '#808080';

export const colors = {
    BLUE,
    YELLOW,
    GREEN,
    RED,
    GREY,
} as const;

// Mapbox and the legend both need "this colour at that opacity"; a hex alpha suffix keeps it
// a plain CSS colour usable in both. Only #RRGGBB can take the suffix — anything else (a
// zone saved without a colour reaches here as null) is returned untouched rather than
// concatenated into a string the browser silently drops.
export const withAlpha = (color: string, alpha: number): string => {
    if (!/^#[0-9a-f]{6}$/i.test(color)) {
        return color;
    }

    const clamped = Math.min(Math.max(alpha, 0), 1);

    return `${color}${Math.round(clamped * 255)
        .toString(16)
        .padStart(2, '0')}`;
};

/**
 * Fill and outline opacity for a "zone à enjeux" drawn at `opacity`. The outline is twice
 * the fill so a narrow zone stays readable at low values, and both reach 1 together so the
 * slider's 100% really is opaque.
 */
export const getCustomZoneOpacities = (opacity: number) => ({
    fill: opacity,
    line: Math.min(opacity * 2, 1),
});

const CSV_SEPARATOR = ';';
// Excel only reads UTF-8 accents right when the file starts with the BOM.
const CSV_BOM = '\ufeff';

const PNG_SCALE = 2;
const TITLE_HEIGHT = 28;
const TITLE_FONT = 'bold 14px Marianne, arial, sans-serif';
const LEGEND_HEIGHT = 26;
const LEGEND_SWATCH_SIZE = 10;
const LEGEND_SWATCH_GAP = 6;
const LEGEND_ITEM_GAP = 18;
const LEGEND_FONT = '12px Marianne, arial, sans-serif';

// Properties carrying the rendered look. Read from getComputedStyle (which resolves the
// CSS variables, classes and `currentColor` a detached SVG file has no access to) and
// re-applied inline on the clone.
const RENDERED_STYLE_PROPS = [
    'fill',
    'fill-opacity',
    'stroke',
    'stroke-width',
    'stroke-opacity',
    'stroke-dasharray',
    'opacity',
    'font-family',
    'font-size',
    'font-weight',
    'text-anchor',
    'dominant-baseline',
];

/** "Activité des groupes" -> "activite-des-groupes" (safe, readable file names). */
export const toFileSlug = (text: string) =>
    text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

const triggerDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
};

const toCsvCell = (value: string | number | null): string => {
    const text = value === null || value === undefined ? '' : String(value);
    return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
};

export const downloadCsv = (fileName: string, rows: (string | number | null)[][]) =>
    triggerDownload(
        new Blob([CSV_BOM + rows.map((row) => row.map(toCsvCell).join(CSV_SEPARATOR)).join('\n')], {
            type: 'text/csv;charset=utf-8',
        }),
        fileName,
    );

// A chart legend is HTML next to the <svg>, so it is absent from the serialized markup and
// has to be re-drawn on the canvas. Two selectors: Mantine's own legend, and the toggleable
// one the statistics charts render in its place. A category switched off is left out.
const readLegendItems = (container: HTMLElement) =>
    Array.from(container.querySelectorAll('.mantine-ChartLegend-legendItem, [data-chart-legend-item]'))
        .filter((item) => !item.hasAttribute('data-hidden'))
        .map((item) => ({
            label: item.textContent || '',
            color:
                [item, ...Array.from(item.querySelectorAll('*'))]
                    .map((element) => getComputedStyle(element).backgroundColor)
                    .find((color) => color && color !== 'rgba(0, 0, 0, 0)') || '#000000',
        }));

const drawLegend = (
    context: CanvasRenderingContext2D,
    items: { label: string; color: string }[],
    width: number,
    baseline: number,
) => {
    context.font = LEGEND_FONT;
    context.textBaseline = 'alphabetic';
    const itemWidths = items.map(
        (item) => LEGEND_SWATCH_SIZE + LEGEND_SWATCH_GAP + context.measureText(item.label).width,
    );
    const totalWidth =
        itemWidths.reduce((total, itemWidth) => total + itemWidth, 0) + LEGEND_ITEM_GAP * (items.length - 1);
    let x = Math.max(0, (width - totalWidth) / 2);

    items.forEach((item, index) => {
        context.fillStyle = item.color;
        context.fillRect(x, baseline - LEGEND_SWATCH_SIZE, LEGEND_SWATCH_SIZE, LEGEND_SWATCH_SIZE);
        context.fillStyle = '#000000';
        context.fillText(item.label, x + LEGEND_SWATCH_SIZE + LEGEND_SWATCH_GAP, baseline);
        x += itemWidths[index] + LEGEND_ITEM_GAP;
    });
};

/**
 * Rasterises the <svg> rendered inside `container` — titled, and with the Mantine legend
 * re-drawn — onto a canvas. Resolves to null when the container holds no chart.
 */
const renderChartToCanvas = (container: HTMLElement, title?: string): Promise<HTMLCanvasElement | null> => {
    const svg = container.querySelector('svg');

    if (!svg) {
        return Promise.resolve(null);
    }

    const { width, height } = svg.getBoundingClientRect();
    const clone = svg.cloneNode(true) as SVGSVGElement;
    const sourceNodes = svg.querySelectorAll('*');

    clone.querySelectorAll('*').forEach((node, index) => {
        const computed = getComputedStyle(sourceNodes[index]);
        node.setAttribute(
            'style',
            RENDERED_STYLE_PROPS.map((property) => `${property}:${computed.getPropertyValue(property)}`).join(';'),
        );
    });

    // The <svg> box is not the painted area: Mantine sets `svg { overflow: visible }`, so
    // anything recharts draws above y=0 — a ReferenceLine label, for one — shows on screen
    // but sits outside the viewport. Grow the viewBox to the ink rather than clip it.
    // getBBox() has to run on the live node: a detached clone measures zero.
    let inkTop = 0;
    let svgHeight = height;
    try {
        const ink = svg.getBBox();
        inkTop = Math.min(0, Math.floor(ink.y));
        svgHeight = Math.max(height, Math.ceil(ink.y + ink.height)) - inkTop;
    } catch {
        // not rendered — fall back to the layout box
    }

    // recharts sizes its <svg> with an inline width/height of 100%, which has no meaning
    // in a standalone file — the inline style has to be overwritten, not just the attributes.
    clone.setAttribute('viewBox', `0 ${inkTop} ${width} ${svgHeight}`);
    clone.setAttribute('width', String(width));
    clone.setAttribute('height', String(svgHeight));
    clone.style.width = `${width}px`;
    clone.style.height = `${svgHeight}px`;

    const legendItems = readLegendItems(container);
    const legendHeight = legendItems.length ? LEGEND_HEIGHT : 0;
    const titleHeight = title ? TITLE_HEIGHT : 0;
    const svgUrl = URL.createObjectURL(
        new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml;charset=utf-8' }),
    );

    return new Promise((resolve) => {
        const image = new Image();

        image.onload = () => {
            const canvas = document.createElement('canvas');
            const totalHeight = titleHeight + svgHeight + legendHeight;
            canvas.width = width * PNG_SCALE;
            canvas.height = totalHeight * PNG_SCALE;

            const context = canvas.getContext('2d');
            if (context) {
                context.scale(PNG_SCALE, PNG_SCALE);
                context.fillStyle = '#ffffff';
                context.fillRect(0, 0, width, totalHeight);
                if (title) {
                    context.font = TITLE_FONT;
                    context.textBaseline = 'alphabetic';
                    context.fillStyle = '#000000';
                    context.fillText(title, 0, TITLE_HEIGHT - 10);
                }
                context.drawImage(image, 0, titleHeight, width, svgHeight);
                if (legendItems.length) {
                    drawLegend(context, legendItems, width, totalHeight - 8);
                }
            }

            URL.revokeObjectURL(svgUrl);
            resolve(canvas);
        };
        image.onerror = () => {
            URL.revokeObjectURL(svgUrl);
            resolve(null);
        };
        image.src = svgUrl;
    });
};

/** Saves the <svg> rendered inside `container`, titled and with its Mantine legend, as a PNG. */
export const downloadChartPng = async (container: HTMLElement, fileName: string, title?: string) => {
    const canvas = await renderChartToCanvas(container, title);
    canvas?.toBlob((blob) => blob && triggerDownload(blob, fileName));
};

/** The same rendering as a data URL: how a live chart gets into a generated PDF. */
export const chartToPngDataUrl = async (container: HTMLElement, title?: string) => {
    const canvas = await renderChartToCanvas(container, title);
    return canvas ? canvas.toDataURL('image/png') : null;
};

import { useReducedMotion } from '@mantine/hooks';
import { useEffect, useState } from 'react';

/** Budget for one whole column, whatever its number of segments. */
const STACK_BUILD_MS = 700;
// Below ~3 frames a segment pops rather than grows.
const SEGMENT_MIN_MS = 45;
// A frame of slack, so nothing is called settled while the last segment is still painting.
const SETTLE_MS = 50;

interface StackSlot {
    animationBegin: number;
    animationDuration: number;
}

/**
 * A stack grows as ONE column: each segment starts exactly when the one below it lands, and
 * the segments share the budget in proportion to what they weigh, so the top of the column
 * climbs at a steady speed instead of lurching at every boundary.
 *
 * recharts animates every rectangle from its own bottom edge (Bar interpolates height from 0
 * and sets y = y + height - h), so segments run together float detached above one another —
 * measured mid-flight, four segments at four different heights with 80px of nothing between
 * them. A category empty over the whole period gets no slot at all rather than a dead one.
 */
export const makeStackSchedule = (rows: Record<string, unknown>[], seriesNames: string[]) => {
    const totals = seriesNames.map((name) => rows.reduce((sum, row) => sum + (Number(row[name]) || 0), 0));
    const grandTotal = totals.reduce((sum, total) => sum + total, 0);
    const paintedCount = totals.filter((total) => total > 0).length;
    // floors handed out first, the remainder shared by weight, so the sum stays the budget
    const floorMs = Math.min(SEGMENT_MIN_MS, STACK_BUILD_MS / Math.max(1, paintedCount));
    const shared = STACK_BUILD_MS - floorMs * paintedCount;
    let begin = 0;

    return new Map<string, StackSlot>(
        seriesNames.map((name, index) => {
            const animationDuration =
                totals[index] > 0 && grandTotal > 0
                    ? Math.max(1, Math.round(floorMs + (totals[index] / grandTotal) * shared))
                    : 0;
            const slot: StackSlot = { animationBegin: begin, animationDuration };

            begin += animationDuration;

            return [name, slot];
        }),
    );
};

// The last moment at which a chart on the page can still be painting. The PNG and PDF
// exports serialise the live <svg>, so a capture started before this would rasterise
// half-drawn columns — or no columns at all if it lands at the very start.
let settledAt = 0;

export const whenChartsSettled = () => {
    const remaining = settledAt - performance.now();

    return remaining > 0 ? new Promise<void>((resolve) => window.setTimeout(resolve, remaining)) : Promise.resolve();
};

/**
 * `building` is true while a chart plays its entrance and false forever after — it selects
 * the staggered build schedule, not whether the chart moves at all. `animate` is the reader's
 * own answer: with prefers-reduced-motion the charts never animate, they just appear.
 */
export const useBuildAnimation = (durationMs: number = STACK_BUILD_MS) => {
    // read on the first render rather than in an effect, else a reduced-motion reader still
    // gets one frame of build
    const reduceMotion = useReducedMotion(false, { getInitialValueInEffect: false }) === true;
    const [building, setBuilding] = useState(true);

    useEffect(() => {
        if (reduceMotion) {
            return;
        }

        settledAt = Math.max(settledAt, performance.now() + durationMs + SETTLE_MS);

        const timeout = window.setTimeout(() => setBuilding(false), durationMs + SETTLE_MS);

        return () => window.clearTimeout(timeout);
    }, [durationMs, reduceMotion]);

    return { building: building && !reduceMotion, animate: !reduceMotion };
};

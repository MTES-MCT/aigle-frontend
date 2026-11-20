import { useEffect } from 'react';

import { controlPlanEndpoints } from '@/api/endpoints';
import { ControlPlan } from '@/models/control-plan';
import { CONTROL_PLAN_QUERY_KEY } from '@/routes/ControlPlan/utils';
import { useObjectsFilter } from '@/store/slices/objects-filter';
import api from '@/utils/api';
import { useQuery } from '@tanstack/react-query';

/** The active plans of every group the user reaches the control plans of, most recent first. */
export const useActiveControlPlans = (enabled: boolean) =>
    useQuery({
        queryKey: [CONTROL_PLAN_QUERY_KEY, 'active'],
        queryFn: ({ signal }) =>
            api<ControlPlan[]>(controlPlanEndpoints.list, { params: { controlPlanStatus: 'ACTIVE' }, signal }),
        enabled,
    });

/**
 * A filter narrowed to a plan closed meanwhile (an old link, another tab, the plan page) shows nothing:
 * back to all the plans. For the pages that list under the objects filter.
 */
export const useClosedControlPlanReset = () => {
    const { objectsFilter, updateObjectsFilter } = useObjectsFilter();
    const controlPlanUuid = objectsFilter?.controlPlan ? objectsFilter.controlPlanUuid : null;
    const { data: plans } = useActiveControlPlans(!!controlPlanUuid);

    useEffect(() => {
        if (objectsFilter && plans && controlPlanUuid && !plans.some(({ uuid }) => uuid === controlPlanUuid)) {
            updateObjectsFilter({ ...objectsFilter, controlPlanUuid: null });
        }
    }, [plans, controlPlanUuid, objectsFilter, updateObjectsFilter]);
};

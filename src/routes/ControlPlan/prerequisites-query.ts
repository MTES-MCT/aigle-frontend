import { controlPlanEndpoints } from '@/api/endpoints';
import { ControlPlanPrerequisites } from '@/models/control-plan';
import { CONTROL_PLAN_QUERY_KEY } from '@/routes/ControlPlan/utils';
import api from '@/utils/api';
import { useQuery } from '@tanstack/react-query';

export const usePrerequisites = (userGroupUuid: string) =>
    useQuery({
        queryKey: [CONTROL_PLAN_QUERY_KEY, 'prerequisites', userGroupUuid],
        queryFn: ({ signal }) =>
            api<ControlPlanPrerequisites>(controlPlanEndpoints.prerequisites, { params: { userGroupUuid }, signal }),
    });

// known to be 0 only: while loading or on an error, nothing is blocked
export const hasNoZone = (prerequisites?: ControlPlanPrerequisites) => prerequisites?.customZonesCount === 0;

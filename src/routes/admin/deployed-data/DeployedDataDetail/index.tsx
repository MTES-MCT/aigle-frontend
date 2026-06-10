import React from 'react';

import { deployedDataEndpoints } from '@/api/endpoints';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import { DeployedDataDepartment } from '@/models/deployed-data';
import api from '@/utils/api';
import { Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'react-router-dom';
import DepartmentDetailContent from '../DepartmentDetailContent';

const BACK_URL = '/admin/deployed-data';

const ComponentInner: React.FC = () => {
    const { uuid } = useParams();
    const [searchParams] = useSearchParams();
    // Mirror the list's per-commune threshold so the detail stays consistent with the row clicked.
    const minCommuneDetections = searchParams.get('minCommuneDetections') ?? undefined;

    const { isLoading, error, data } = useQuery({
        queryKey: [deployedDataEndpoints.detail(String(uuid)), minCommuneDetections],
        enabled: !!uuid,
        queryFn: ({ signal }) =>
            api<DeployedDataDepartment>(deployedDataEndpoints.detail(String(uuid)), {
                params: minCommuneDetections ? { minCommuneDetections } : undefined,
                signal,
            }),
    });

    if (isLoading) {
        return <Loader />;
    }

    if (error || !data) {
        return <ErrorCard>{error?.message ?? 'Département introuvable'}</ErrorCard>;
    }

    return (
        <>
            <Title order={1} mb="md">
                {data.name}
            </Title>
            <DepartmentDetailContent department={data} />
        </>
    );
};

const Component: React.FC = () => {
    return (
        <LayoutAdminForm title="Données déployées" backText="Liste des départements" backUrl={BACK_URL}>
            <ComponentInner />
        </LayoutAdminForm>
    );
};

export default Component;

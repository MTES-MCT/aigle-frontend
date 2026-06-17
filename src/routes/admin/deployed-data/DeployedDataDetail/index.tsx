import React from 'react';

import { deployedDataEndpoints } from '@/api/endpoints';
import SoloAccordion from '@/components/SoloAccordion';
import LayoutAdminForm from '@/components/admin/LayoutAdminForm';
import ErrorCard from '@/components/ui/ErrorCard';
import Loader from '@/components/ui/Loader';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { DeployedDataDepartment } from '@/models/deployed-data';
import api from '@/utils/api';
import { NumberInput, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import DepartmentDetailContent from '../DepartmentDetailContent';

const BACK_URL = '/admin/deployed-data';

// Communes below this many objects are hidden by default (kept in sync with the list view).
const DEFAULT_MIN_COMMUNE_DETECTIONS = '50';

const ComponentInner: React.FC = () => {
    const { uuid } = useParams();
    // On the URL so the threshold stays consistent with the clicked list row and is shareable.
    const [filter, setFilter] = useUrlFilter({ minCommuneDetections: DEFAULT_MIN_COMMUNE_DETECTIONS });
    const { minCommuneDetections } = filter;

    const { isLoading, error, data } = useQuery({
        queryKey: [deployedDataEndpoints.detail(String(uuid)), minCommuneDetections],
        enabled: !!uuid,
        queryFn: ({ signal }) =>
            api<DeployedDataDepartment>(deployedDataEndpoints.detail(String(uuid)), {
                params: minCommuneDetections ? { minCommuneDetections } : undefined,
                signal,
            }),
    });

    let body: React.ReactNode;
    if (isLoading) {
        body = <Loader />;
    } else if (error || !data) {
        body = <ErrorCard>{error?.message ?? 'Département introuvable'}</ErrorCard>;
    } else {
        body = (
            <>
                <Title order={1} mt="md" mb="md">
                    {data.name}
                </Title>
                <DepartmentDetailContent department={data} />
            </>
        );
    }

    return (
        <>
            <SoloAccordion indicatorShown={minCommuneDetections !== DEFAULT_MIN_COMMUNE_DETECTIONS}>
                <NumberInput
                    label="Détections minimum par commune"
                    description="Exclut les communes en-dessous de ce seuil (ex : 50)"
                    placeholder="0"
                    min={0}
                    allowDecimal={false}
                    value={minCommuneDetections}
                    onChange={(value) =>
                        setFilter((filter) => ({
                            ...filter,
                            minCommuneDetections: value === '' ? '' : String(value),
                        }))
                    }
                />
            </SoloAccordion>
            {body}
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

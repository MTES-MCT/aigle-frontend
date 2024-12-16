import React, { useEffect, useState } from 'react';

import DataTable from '@/components/admin/DataTable';
import SoloAccordion from '@/components/admin/SoloAccordion';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import { CollectivityType, GeoCollectivity, collectivityTypes } from '@/models/geo/_common';
import { COLLECTIVITY_TYPES_ENDPOINTS_MAP, COLLECTIVITY_TYPES_NAMES_MAP } from '@/utils/constants';
import { Button, Input, Table } from '@mantine/core';
import { IconSearch } from '@tabler/icons-react';
import isEqual from 'lodash/isEqual';
import { useNavigate, useSearchParams } from 'react-router-dom';
import classes from './index.module.scss';

const COLLECTIVITY_TYPE_SEARCH_PARAM = 'collectivityType';

interface DataFilter {
    q: string;
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
};

const Component: React.FC = () => {
    const [filter, setFilter] = useState<DataFilter>(DATA_FILTER_INITIAL_VALUE);
    const [endpoint, setEndpoint] = useState<string>(COLLECTIVITY_TYPES_ENDPOINTS_MAP[collectivityTypes[0]]);

    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const getInitialCollectivityType = (): CollectivityType => {
        const DEFAULT_VALUE = collectivityTypes[0];
        const initialSearchParamValue = searchParams.get(COLLECTIVITY_TYPE_SEARCH_PARAM) || DEFAULT_VALUE;

        // @ts-expect-error types do not match
        if (collectivityTypes.includes(initialSearchParamValue)) {
            // @ts-expect-error types do not match
            return initialSearchParamValue;
        }

        return DEFAULT_VALUE;
    };
    const [collectivityTypeSelected, setCollectivityTypeSelected] =
        useState<CollectivityType>(getInitialCollectivityType());

    useEffect(() => {
        setSearchParams({
            collectivityType: collectivityTypeSelected,
        });
    }, [collectivityTypeSelected]);

    useEffect(() => {
        setEndpoint(COLLECTIVITY_TYPES_ENDPOINTS_MAP[collectivityTypeSelected]);
    }, [collectivityTypeSelected]);

    return (
        <LayoutAdminBase title={`Liste des collectivités`}>
            <Button.Group className={classes['collectivity-type-selection']}>
                {collectivityTypes.map((type) => (
                    <Button
                        key={type}
                        variant={collectivityTypeSelected === type ? 'filled' : 'outline'}
                        onClick={() => setCollectivityTypeSelected(type)}
                        className={classes['collectivity-type-selection-button']}
                    >
                        {COLLECTIVITY_TYPES_NAMES_MAP[type]}
                    </Button>
                ))}
            </Button.Group>
            <DataTable<GeoCollectivity, DataFilter>
                endpoint={endpoint}
                filter={filter}
                SoloAccordion={
                    <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                        <Input
                            placeholder={`Rechercher ${COLLECTIVITY_TYPES_NAMES_MAP[collectivityTypeSelected]}`}
                            leftSection={<IconSearch size={16} />}
                            value={filter.q}
                            onChange={(event) => {
                                const value = event.currentTarget.value;
                                setFilter((filter) => ({
                                    ...filter,
                                    q: value,
                                }));
                            }}
                        />
                    </SoloAccordion>
                }
                tableHeader={[<Table.Th key="code">Code</Table.Th>, <Table.Th key="name">Nom</Table.Th>]}
                tableBodyRenderFns={[(item: GeoCollectivity) => item.code, (item: GeoCollectivity) => item.name]}
                onItemClick={({ uuid }) => navigate(`/admin/collectivites/${collectivityTypeSelected}/form/${uuid}`)}
            />
        </LayoutAdminBase>
    );
};

export default Component;

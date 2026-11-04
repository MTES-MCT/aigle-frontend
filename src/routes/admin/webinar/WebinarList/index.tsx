import React from 'react';

import { webinarEndpoints } from '@/api/endpoints';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import DataTable from '@/components/DataTable';
import SoloAccordion from '@/components/SoloAccordion';
import { useFilterNavigation } from '@/hooks/useFilterNavigation';
import { useUrlFilter } from '@/hooks/useUrlFilter';
import { Webinar } from '@/models/help-center';
import { formatDateOnly } from '@/utils/format';
import { Badge, Button, Group, Input, Table } from '@mantine/core';
import { IconCalendarPlus, IconSearch } from '@tabler/icons-react';
import isEqual from 'lodash/isEqual';
import { Link } from 'react-router-dom';

interface DataFilter {
    q: string;
}

const DATA_FILTER_INITIAL_VALUE: DataFilter = {
    q: '',
};

const WEBINAR_LINKS: { key: keyof Pick<Webinar, 'registrationUrl' | 'visioUrl' | 'replayUrl'>; label: string }[] = [
    { key: 'registrationUrl', label: 'Inscription' },
    { key: 'visioUrl', label: 'Visio' },
    { key: 'replayUrl', label: 'Replay' },
];

const Component: React.FC = () => {
    const { navigate, buildPath } = useFilterNavigation();
    const [filter, setFilter] = useUrlFilter(DATA_FILTER_INITIAL_VALUE);

    return (
        <LayoutAdminBase
            title="Liste des webinaires"
            actions={
                <Button leftSection={<IconCalendarPlus />} component={Link} to={buildPath('/admin/webinars/form')}>
                    Ajouter un webinaire
                </Button>
            }
        >
            <DataTable<Webinar, DataFilter>
                endpoint={webinarEndpoints.list}
                showCopyUuidCol
                filter={filter}
                SoloAccordion={
                    <SoloAccordion indicatorShown={!isEqual(filter, DATA_FILTER_INITIAL_VALUE)}>
                        <Input
                            placeholder="Rechercher un webinaire"
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
                tableHeader={[
                    <Table.Th key="date">Date</Table.Th>,
                    <Table.Th key="timeSlot">Horaire (Paris)</Table.Th>,
                    <Table.Th key="title">Titre</Table.Th>,
                    <Table.Th key="links">Liens</Table.Th>,
                ]}
                tableBodyRenderFns={[
                    (item: Webinar) => formatDateOnly(item.date),
                    (item: Webinar) => (item.startTime && item.endTime ? `${item.startTime} – ${item.endTime}` : '-'),
                    (item: Webinar) => item.title,
                    (item: Webinar) => (
                        <Group gap={4} wrap="nowrap">
                            {WEBINAR_LINKS.filter(({ key }) => item[key]).map(({ key, label }) => (
                                <Badge key={key} variant="light" size="sm">
                                    {label}
                                </Badge>
                            ))}
                        </Group>
                    ),
                ]}
                onItemClick={({ uuid }) => navigate(`/admin/webinars/form/${uuid}`)}
            />
        </LayoutAdminBase>
    );
};

export default Component;

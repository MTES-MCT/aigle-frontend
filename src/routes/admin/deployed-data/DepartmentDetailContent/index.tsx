import React from 'react';

import SoloAccordion from '@/components/SoloAccordion';
import StatTile from '@/components/ui/StatTile';
import { DeployedDataDepartment, getDeployedDepartmentUsersCount } from '@/models/deployed-data';
import { Anchor, Badge, ColorSwatch, Group, Paper, SimpleGrid, Stack, Table, Text, ThemeIcon } from '@mantine/core';
import {
    IconBuildingCommunity,
    IconChartBar,
    IconFileCertificate,
    IconHexagons,
    IconMap2,
    IconRulerMeasure,
    IconUser,
    IconUsers,
    IconUsersGroup,
} from '@tabler/icons-react';
import { Link } from 'react-router-dom';
import classes from './index.module.scss';

const NEW_TAB_PROPS = { target: '_blank', rel: 'noopener noreferrer' } as const;

const DEFAULT_SWATCH_COLOR = 'var(--mantine-color-gray-3)';

interface SectionProps {
    icon: React.ReactNode;
    title: string;
    count: number;
    children: React.ReactNode;
}

const Section: React.FC<SectionProps> = ({ icon, title, count, children }) => (
    <div className={classes.section}>
        <Group gap="xs" mb="xs" className={classes['section-header']}>
            <ThemeIcon variant="transparent" size="sm" color="gray">
                {icon}
            </ThemeIcon>
            <Text fw={600}>{title}</Text>
            <Badge variant="light" size="sm" radius="sm">
                {count}
            </Badge>
        </Group>
        {children}
    </div>
);

interface ComponentProps {
    department: DeployedDataDepartment;
}

const Component: React.FC<ComponentProps> = ({ department }) => {
    const usersCount = getDeployedDepartmentUsersCount(department);

    return (
        <Stack gap="lg" className={classes.container}>
            <SimpleGrid cols={{ base: 2, sm: 3, lg: 6 }} spacing="sm">
                <StatTile icon={<IconRulerMeasure size={20} />} label="Parcelles" value={department.parcelsCount} />
                <StatTile
                    icon={<IconBuildingCommunity size={20} />}
                    label="Communes déployées"
                    value={department.communesWithDetectionsCount}
                />
                <StatTile
                    icon={<IconFileCertificate size={20} />}
                    label="Parcelles mises à jour via SITADEL"
                    value={department.sitadelUpdatedParcelsCount}
                />
                <StatTile icon={<IconUsersGroup size={20} />} label="Groupes" value={department.userGroups.length} />
                <StatTile icon={<IconUser size={20} />} label="Utilisateurs" value={usersCount} />
                <StatTile
                    icon={<IconMap2 size={20} />}
                    label="Fonds de carte"
                    value={department.detectionsByTileSet.length}
                />
            </SimpleGrid>

            <Section
                icon={<IconBuildingCommunity size={16} />}
                title="Communes avec détections"
                count={department.communes.length}
            >
                {department.communes.length ? (
                    <Table className={classes['communes-table']} highlightOnHover withTableBorder verticalSpacing="xs">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Commune</Table.Th>
                                <Table.Th className={classes['count-col']}>Nombre total d&apos;objets</Table.Th>
                                <Table.Th className={classes['count-col']}>
                                    Nombre de d&apos;objets incluses en ZAE
                                </Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {department.communes.map((commune) => (
                                <Table.Tr key={commune.uuid}>
                                    <Table.Td>{commune.name}</Table.Td>
                                    <Table.Td className={classes['count-col']}>
                                        <Badge variant="light" radius="sm">
                                            {commune.detectionObjectsCount}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td className={classes['count-col']}>
                                        <Badge variant="light" radius="sm" color="orange">
                                            {commune.detectionObjectsInCustomZoneCount}
                                        </Badge>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                ) : (
                    <Text c="dimmed" size="sm">
                        Aucune commune
                    </Text>
                )}
            </Section>

            <Section
                icon={<IconChartBar size={16} />}
                title="Détections par fond de carte"
                count={department.detectionsByTileSet.length}
            >
                {department.detectionsByTileSet.length ? (
                    <Table className={classes['communes-table']} highlightOnHover withTableBorder verticalSpacing="xs">
                        <Table.Thead>
                            <Table.Tr>
                                <Table.Th>Fond de carte</Table.Th>
                                <Table.Th className={classes['count-col']}>Nombre total de détections</Table.Th>
                                <Table.Th className={classes['count-col']}>
                                    Nombre de détections incluses en ZAE
                                </Table.Th>
                            </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                            {department.detectionsByTileSet.map((tileSet) => (
                                <Table.Tr key={tileSet.uuid}>
                                    <Table.Td>
                                        <Anchor
                                            component={Link}
                                            to={`/admin/tile-sets/form/${tileSet.uuid}`}
                                            {...NEW_TAB_PROPS}
                                        >
                                            {tileSet.name}
                                        </Anchor>
                                    </Table.Td>
                                    <Table.Td className={classes['count-col']}>
                                        <Badge variant="light" radius="sm">
                                            {tileSet.detectionsCount}
                                        </Badge>
                                    </Table.Td>
                                    <Table.Td className={classes['count-col']}>
                                        <Badge variant="light" radius="sm" color="orange">
                                            {tileSet.detectionsInCustomZoneCount}
                                        </Badge>
                                    </Table.Td>
                                </Table.Tr>
                            ))}
                        </Table.Tbody>
                    </Table>
                ) : (
                    <Text c="dimmed" size="sm">
                        Aucune détection
                    </Text>
                )}
            </Section>

            <Section
                icon={<IconUsersGroup size={16} />}
                title="Groupes utilisateurs"
                count={department.userGroups.length}
            >
                {department.userGroups.length ? (
                    <Stack gap="xs">
                        {department.userGroups.map((group) => (
                            <Paper key={group.uuid} withBorder p="sm" radius="md">
                                <Anchor
                                    component={Link}
                                    to={`/admin/user-groups/form/${group.uuid}`}
                                    fw={600}
                                    {...NEW_TAB_PROPS}
                                >
                                    {group.name}
                                </Anchor>
                                {group.users.length ? (
                                    <SoloAccordion
                                        className={classes['users-accordion']}
                                        icon={<IconUsers size={20} />}
                                        title={`${group.users.length} utilisateur${group.users.length > 1 ? 's' : ''}`}
                                    >
                                        <Stack gap={6}>
                                            {group.users.map((user) => (
                                                <Anchor
                                                    key={user.uuid}
                                                    component={Link}
                                                    to={`/admin/users/form/${user.uuid}`}
                                                    size="sm"
                                                    className={classes['user-link']}
                                                    {...NEW_TAB_PROPS}
                                                >
                                                    <Group gap={6} wrap="nowrap" align="center">
                                                        <IconUser size={14} />
                                                        {user.email}
                                                    </Group>
                                                </Anchor>
                                            ))}
                                        </Stack>
                                    </SoloAccordion>
                                ) : (
                                    <Text c="dimmed" size="sm" mt={4}>
                                        Aucun utilisateur
                                    </Text>
                                )}
                            </Paper>
                        ))}
                    </Stack>
                ) : (
                    <Text c="dimmed" size="sm">
                        Aucun groupe utilisateur
                    </Text>
                )}
            </Section>

            <Section icon={<IconHexagons size={16} />} title="Zones à enjeux" count={department.customZones.length}>
                {department.customZones.length ? (
                    <Stack gap="sm">
                        {department.customZones.map((zone) => (
                            <Group key={zone.uuid} gap={8} wrap="nowrap" align="center">
                                <ColorSwatch color={zone.color ?? DEFAULT_SWATCH_COLOR} size={14} />
                                <Anchor
                                    component={Link}
                                    to={`/admin/custom-zones/form/${zone.uuid}`}
                                    {...NEW_TAB_PROPS}
                                >
                                    {zone.categoryName ?? zone.name}
                                </Anchor>
                            </Group>
                        ))}
                    </Stack>
                ) : (
                    <Text c="dimmed" size="sm">
                        Aucune zone à enjeux
                    </Text>
                )}
            </Section>
        </Stack>
    );
};

export default Component;

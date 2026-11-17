import React from 'react';

import DateInfo from '@/components/ui/DateInfo';
import { DetectionTypeOverlapReport } from '@/models/detection-type-overlap-report';
import { formatBigInt } from '@/utils/format';
import { ColorSwatch, Table, Text } from '@mantine/core';

import classes from './index.module.scss';
import { formatOverlapRate, formatReportTileSets } from './utils';

interface Scope {
    label: string;
    detectionsCount: number;
    overlappingCount: number;
    overlappingPrescribableCount: number;
    overlappingCountByObjectType: Record<string, number>;
}

const getScopes = (report: DetectionTypeOverlapReport): Scope[] => {
    const all: Scope = {
        label: 'Toutes',
        detectionsCount: report.detectionsCount,
        overlappingCount: report.overlappingCount,
        overlappingPrescribableCount: report.overlappingPrescribableCount,
        overlappingCountByObjectType: Object.fromEntries(
            report.objectTypes.map((item) => [item.objectType.uuid, item.overlappingCount]),
        ),
    };
    const customZones: Scope = {
        label: 'En zone à enjeux',
        detectionsCount: report.customZonesDetectionsCount,
        overlappingCount: report.customZonesOverlappingCount,
        overlappingPrescribableCount: report.customZonesOverlappingPrescribableCount,
        overlappingCountByObjectType: Object.fromEntries(
            report.objectTypes.map((item) => [item.objectType.uuid, item.customZonesOverlappingCount]),
        ),
    };
    // the API stores the overall and in-zone figures only
    const outside: Scope = {
        label: 'Hors zone à enjeux',
        detectionsCount: all.detectionsCount - customZones.detectionsCount,
        overlappingCount: all.overlappingCount - customZones.overlappingCount,
        overlappingPrescribableCount: all.overlappingPrescribableCount - customZones.overlappingPrescribableCount,
        overlappingCountByObjectType: Object.fromEntries(
            report.objectTypes.map((item) => [
                item.objectType.uuid,
                item.overlappingCount - item.customZonesOverlappingCount,
            ]),
        ),
    };
    return [all, customZones, outside];
};

const RateCell: React.FC<{ count: number; total: number }> = ({ count, total }) => (
    <Table.Td>
        <Text size="sm" fw={600}>
            {formatOverlapRate(count, total)}
        </Text>
        <Text size="xs" c="dimmed">
            {formatBigInt(count)}
        </Text>
    </Table.Td>
);

interface ComponentProps {
    report: DetectionTypeOverlapReport;
}

const Component: React.FC<ComponentProps> = ({ report }) => {
    const scopes = getScopes(report);

    return (
        <div className={classes.container}>
            <Text size="sm">
                Millésime {formatReportTileSets(report)}, calculé le <DateInfo date={report.reportDate} />
            </Text>
            <Table className={classes.table} withTableBorder>
                <Table.Thead>
                    <Table.Tr>
                        <Table.Th />
                        {scopes.map((scope) => (
                            <Table.Th key={scope.label}>{scope.label}</Table.Th>
                        ))}
                    </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                    <Table.Tr>
                        <Table.Td>Détections</Table.Td>
                        {scopes.map((scope) => (
                            <Table.Td key={scope.label}>{formatBigInt(scope.detectionsCount)}</Table.Td>
                        ))}
                    </Table.Tr>
                    <Table.Tr>
                        <Table.Td>Superposées à un autre type</Table.Td>
                        {scopes.map((scope) => (
                            <RateCell key={scope.label} count={scope.overlappingCount} total={scope.detectionsCount} />
                        ))}
                    </Table.Tr>
                    <Table.Tr>
                        <Table.Td>… dont l&apos;un est prescriptible</Table.Td>
                        {scopes.map((scope) => (
                            <RateCell
                                key={scope.label}
                                count={scope.overlappingPrescribableCount}
                                total={scope.detectionsCount}
                            />
                        ))}
                    </Table.Tr>
                    {report.objectTypes.map(({ objectType }) => (
                        <Table.Tr key={objectType.uuid}>
                            <Table.Td>
                                … dont l&apos;un est{' '}
                                <span className={classes['object-type']}>
                                    <ColorSwatch color={objectType.color} size={10} />
                                    {objectType.name}
                                </span>
                            </Table.Td>
                            {scopes.map((scope) => (
                                <RateCell
                                    key={scope.label}
                                    count={scope.overlappingCountByObjectType[objectType.uuid] ?? 0}
                                    total={scope.detectionsCount}
                                />
                            ))}
                        </Table.Tr>
                    ))}
                </Table.Tbody>
            </Table>
            <Text size="xs" c="dimmed">
                Une détection est superposée quand elle recouvre une détection d&apos;un autre type du même millésime
                sur au moins 50 % de la surface de la plus petite des deux. Taux = détections superposées / détections
                de la colonne. Les types prescriptibles sont ceux qui avaient une durée de prescription au moment du
                calcul.
            </Text>
        </div>
    );
};

export default Component;

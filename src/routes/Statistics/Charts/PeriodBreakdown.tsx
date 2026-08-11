import SoloAccordion from '@/components/SoloAccordion';
import { DdtmActivityGroupsActivity } from '@/models/ddtm-activity';
import { downloadCsv, toFileSlug } from '@/utils/download';
import { ActionIcon, Anchor, CloseButton, Group, Paper, Stack, Text, Tooltip } from '@mantine/core';
import { IconDownload } from '@tabler/icons-react';
import React from 'react';
import {
    ACTIVITY_TIERS,
    NO_GROUP_DEPLOYED_MESSAGE,
    formatPeriod,
    groupsByTier,
    sumBy,
    tierSeriesName,
} from './activity';
import { SeriesToggle } from './chartConfig';
import classes from './index.module.scss';
import { TierSwatch } from './tierUi';

/**
 * The column clicked in the chart above, named: one collapsible section per activity
 * category, listing the groups it holds. Sections rather than four side-by-side columns
 * because the tiers are wildly uneven — a handful of pilots against dozens of actifs — and
 * columns left three of them empty next to one very long one.
 */
const PeriodBreakdown: React.FC<{
    activity: DdtmActivityGroupsActivity;
    period: string;
    selectedGroupUuid: string | null;
    onGroupSelected: (uuid: string) => void;
    onClose: () => void;
    /** Shared with the chart above: a category collapsed here is hidden there, and back. */
    seriesToggle: SeriesToggle;
}> = ({ activity, period, selectedGroupUuid, onGroupSelected, onClose, seriesToggle }) => {
    const tiers = groupsByTier(activity.groups, period);
    const totalCount = sumBy(tiers, (tier) => tier.groups.length);

    return (
        <Paper withBorder radius="md" p="md" className={classes['period-breakdown']}>
            <Group justify="space-between" wrap="nowrap" mb="sm">
                <Text fw={600} size="sm">
                    Groupes utilisateurs — {formatPeriod(period)}
                </Text>
                <Group gap={4} wrap="nowrap" className={classes['no-print']}>
                    <Tooltip label="Télécharger le détail (CSV)">
                        <ActionIcon
                            variant="subtle"
                            size="lg"
                            aria-label="Télécharger le détail (CSV)"
                            onClick={() =>
                                downloadCsv(`groupes-${toFileSlug(formatPeriod(period))}.csv`, [
                                    ['Période', 'Catégorie', 'Groupe utilisateur'],
                                    ...tiers.flatMap(({ tier, groups }) =>
                                        groups.map((group) => [
                                            formatPeriod(period),
                                            ACTIVITY_TIERS[tier].label,
                                            group.name,
                                        ]),
                                    ),
                                ])
                            }
                        >
                            <IconDownload size={18} />
                        </ActionIcon>
                    </Tooltip>
                    <CloseButton aria-label="Masquer le détail de la période" onClick={onClose} />
                </Group>
            </Group>

            {totalCount ? (
                <Stack gap="xs">
                    {tiers.map(({ tier, groups }) => (
                        <SoloAccordion
                            key={tier}
                            opened={!seriesToggle.hiddenSeries.has(tierSeriesName(tier))}
                            onOpenedChange={() => seriesToggle.toggle(tierSeriesName(tier))}
                            className={classes['tier-section']}
                            icon={<TierSwatch tier={tier} />}
                            title={
                                <Group gap="xs" wrap="nowrap">
                                    <Text size="sm" fw={600}>
                                        {ACTIVITY_TIERS[tier].label}
                                    </Text>
                                    <Text size="sm" c="dimmed">
                                        {groups.length}
                                    </Text>
                                </Group>
                            }
                        >
                            {groups.length ? (
                                // One name per line, styled like the links of the groups
                                // table: a wrapping row of names ran together and was
                                // unreadable past a handful of groups.
                                <Stack gap={2} align="flex-start">
                                    {groups.map((group) => (
                                        <Anchor
                                            key={group.uuid}
                                            component="button"
                                            type="button"
                                            ta="left"
                                            fw={group.uuid === selectedGroupUuid ? 600 : undefined}
                                            onClick={() => onGroupSelected(group.uuid)}
                                        >
                                            {group.name}
                                        </Anchor>
                                    ))}
                                </Stack>
                            ) : (
                                <Text size="sm" c="dimmed">
                                    Aucun groupe
                                </Text>
                            )}
                        </SoloAccordion>
                    ))}
                </Stack>
            ) : (
                <Text size="sm" c="dimmed">
                    {NO_GROUP_DEPLOYED_MESSAGE}
                </Text>
            )}
        </Paper>
    );
};

export default PeriodBreakdown;

import { userGroupEndpoints } from '@/api/endpoints';
import { UserGroupDetail } from '@/models/user-group';
import { useAuth } from '@/store/slices/auth';
import { useMap } from '@/store/slices/map';
import api from '@/utils/api';
import { Modal, Radio, Stack, Text, TextInput, Tooltip } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import classes from './index.module.scss';

const MAX_DISPLAYED = 10;

const fetchUserGroups = () => api<UserGroupDetail[]>(userGroupEndpoints.list);

interface Props {
    onGroupChange: () => void;
}

const UserGroupSelector: React.FC<Props> = ({ onGroupChange }) => {
    const [opened, { open, close }] = useDisclosure(false);
    const { selectedUserGroupUuid, setSelectedUserGroupUuid } = useAuth();
    const [search, setSearch] = useState('');

    const { data: userGroups, isLoading } = useQuery({
        queryKey: [userGroupEndpoints.list, 'super-admin-selector'],
        queryFn: fetchUserGroups,
    });

    useEffect(() => {
        if (!userGroups?.length) {
            return;
        }

        if (!selectedUserGroupUuid || !userGroups.find((g) => g.uuid === selectedUserGroupUuid)) {
            setSelectedUserGroupUuid(userGroups[0].uuid);
        }

        if (!useMap.getState().layers) {
            onGroupChange();
        }
    }, [userGroups]);

    const handleChange = useCallback(
        (uuid: string) => {
            setSelectedUserGroupUuid(uuid);
            close();
            onGroupChange();
        },
        [setSelectedUserGroupUuid, close, onGroupChange],
    );

    const selectedGroup = userGroups?.find((g) => g.uuid === selectedUserGroupUuid);

    const filteredGroups = useMemo(() => {
        if (!userGroups) {
            return [];
        }

        const normalizedSearch = search.toLowerCase().trim();
        const filtered = normalizedSearch
            ? userGroups.filter(
                  (g) =>
                      g.name.toLowerCase().includes(normalizedSearch) ||
                      g.geoZones?.some((z) => z.name.toLowerCase().includes(normalizedSearch)),
              )
            : userGroups;

        const selected: UserGroupDetail[] = [];
        const rest: UserGroupDetail[] = [];

        for (const group of filtered) {
            if (group.uuid === selectedUserGroupUuid) {
                selected.push(group);
            } else {
                rest.push(group);
            }
        }

        return [...selected, ...rest].slice(0, MAX_DISPLAYED);
    }, [userGroups, search, selectedUserGroupUuid]);

    return (
        <>
            <Tooltip
                label={selectedGroup ? `Groupe: ${selectedGroup.name}` : 'Sélectionner un groupe'}
                position="bottom"
            >
                <button
                    type="button"
                    className={`fr-btn fr-btn--tertiary-no-outline ${classes.button}`}
                    onClick={open}
                    aria-label={selectedGroup ? `Groupe: ${selectedGroup.name}` : 'Sélectionner un groupe'}
                >
                    <span className="fr-icon-settings-5-line" aria-hidden="true" />
                </button>
            </Tooltip>

            <Modal
                opened={opened}
                onClose={() => {
                    close();
                    setSearch('');
                }}
                title="Sélectionner un groupe utilisateur"
                size="md"
            >
                <TextInput
                    placeholder="Rechercher un groupe..."
                    value={search}
                    onChange={(e) => setSearch(e.currentTarget.value)}
                    mb="md"
                />
                {isLoading ? (
                    <Text>Chargement...</Text>
                ) : (
                    <Radio.Group value={selectedUserGroupUuid} onChange={handleChange}>
                        <Stack gap="sm">
                            {filteredGroups.map((group) => (
                                <Radio
                                    key={group.uuid}
                                    value={group.uuid}
                                    label={
                                        <div>
                                            <Text size="sm" fw={500}>
                                                {group.name}
                                            </Text>
                                            <Text size="xs" c="dimmed">
                                                {group.userGroupType}
                                                {group.geoZones?.length
                                                    ? ` — ${group.geoZones.map((z) => z.name).join(', ')}`
                                                    : ''}
                                            </Text>
                                        </div>
                                    }
                                />
                            ))}
                            {filteredGroups.length === 0 && (
                                <Text size="sm" c="dimmed">
                                    Aucun groupe trouvé
                                </Text>
                            )}
                        </Stack>
                    </Radio.Group>
                )}
            </Modal>
        </>
    );
};

export default UserGroupSelector;

import { RUN_COMMAND_LIST_ENDPOINT } from '@/api-endpoints';
import LayoutAdminBase from '@/components/admin/LayoutAdminBase';
import Loader from '@/components/ui/Loader';
import OptionalText from '@/components/ui/OptionalText';
import { CommandWithParameters } from '@/models/command';
import api from '@/utils/api';
import { Accordion, ActionIcon, Center } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import React, { useMemo } from 'react';
import classes from './index.module.scss';

const fetchCommands = async (): Promise<CommandWithParameters[]> => {
    const res = await api.get<CommandWithParameters[]>(RUN_COMMAND_LIST_ENDPOINT);
    return res.data;
};

const CommandParameters: React.FC<{ parameters: CommandWithParameters['parameters'] }> = ({ parameters }) => {
    const defaultValueColDisplayed = useMemo(() => parameters.some((param) => param.default), [parameters]);

    return (
        <table className={classes['command-parameters']}>
            <thead>
                <tr>
                    <th>Nom</th>
                    <th>Type</th>
                    {defaultValueColDisplayed ? <th>Valeur par défaut</th> : null}
                </tr>
            </thead>

            <tbody>
                {parameters.map((param) => (
                    <tr key={param.name}>
                        <td>{param.name}</td>
                        <td>{param.type}</td>
                        {defaultValueColDisplayed ? (
                            <td>
                                <OptionalText text={param.default} emptyText="Aucun" />
                            </td>
                        ) : null}
                    </tr>
                ))}
            </tbody>
        </table>
    );
};

interface CommandProps {
    command: CommandWithParameters;
}

const Command: React.FC<CommandProps> = ({ command }) => {
    return (
        <Accordion.Item value={command.name}>
            <Center>
                <ActionIcon variant="transparent" aria-label="Lancer une commande">
                    <IconPlayerPlay />
                </ActionIcon>
                <Accordion.Control>{command.name}</Accordion.Control>
            </Center>
            <Accordion.Panel>
                <CommandParameters parameters={command.parameters} />
            </Accordion.Panel>
        </Accordion.Item>
    );
};

const Component: React.FC = () => {
    const { data: commands, isLoading } = useQuery<CommandWithParameters[]>({
        queryKey: [RUN_COMMAND_LIST_ENDPOINT],
        queryFn: () => fetchCommands(),
    });

    return (
        <LayoutAdminBase title="Executer une commande">
            {isLoading || !commands ? (
                <Loader />
            ) : (
                <div className={classes.container}>
                    <Accordion>
                        {commands.map((command) => (
                            <Command key={command.name} command={command} />
                        ))}
                    </Accordion>
                </div>
            )}
        </LayoutAdminBase>
    );
};

export default Component;

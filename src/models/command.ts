import { Timestamped, Uuided } from '@/models/data';

type CommandParametersType = 'str' | 'int' | 'bool';

export interface CommandParameter {
    name: string;
    type: CommandParametersType;
    default: string;
    required: boolean;
    multiple: boolean;
}

export interface CommandWithParameters {
    name: string;
    help?: string;
    parameters: CommandParameter[];
}

export const commandRunStatuses = ['PENDING', 'RUNNING', 'SUCCESS', 'ERROR', 'CANCELED'] as const;
export type CommandRunStatus = (typeof commandRunStatuses)[number];

type CommandRunArgmentsType = string | number | boolean;

interface CommandRunArgments {
    kwargs: Record<string, CommandRunArgmentsType>;
    args: CommandRunArgmentsType[];
}

export interface CommandRun extends Uuided, Timestamped {
    taskId: string;
    commandName: string;
    arguments: CommandRunArgments;
    status: CommandRunStatus;
    error: string | null;
    output: string | null;
}

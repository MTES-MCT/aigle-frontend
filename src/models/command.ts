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

export const commandRunOrigins = ['API', 'CLI'] as const;
export type CommandRunOrigin = (typeof commandRunOrigins)[number];

type CommandRunArgmentsType = string | number | boolean;

interface CommandRunArgments {
    kwargs: Record<string, CommandRunArgmentsType>;
    args?: CommandRunArgmentsType[];
}

// The /api/run-command/ routes opt out of the camelCase renderer (see CommandAsyncViewSet)
// so a run's arguments round-trip verbatim — hence the snake_case keys here.
export interface CommandRun {
    uuid: string;
    created_at: string;
    updated_at: string;
    task_id: string;
    command_name: string;
    arguments: CommandRunArgments;
    run_origin: CommandRunOrigin;
    status: CommandRunStatus;
    run_started_at: string | null;
    run_ended_at: string | null;
    // Ephemeral (Redis-backed) progress while the command runs; null once finished/cleared.
    progress: { current: number; total: number } | null;
    error: string | null;
    output: string | null;
}

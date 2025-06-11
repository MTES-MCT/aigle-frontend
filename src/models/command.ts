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

export interface CommandTask {
    taskId: string;
    name: string;
    args: string;
    kwargs: Record<string, string | number | boolean>;
    worker: string;
    status: string;
    eta: string;
}

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

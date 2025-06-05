export interface CommandParameters {
    name: string;
    type: string;
    default: string;
}

export interface CommandWithParameters {
    name: string;
    parameters: CommandParameters[];
}

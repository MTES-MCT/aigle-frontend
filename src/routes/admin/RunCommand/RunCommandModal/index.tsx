import { CommandParameter, CommandWithParameters } from '@/models/command';
import { Checkbox, Modal, NumberInput, TextInput } from '@mantine/core';
import { useEffect, useState } from 'react';
import classes from './index.module.scss';

const MULTIPLE_DESCRIPTION = 'Séparer les valeurs par une virgule ","';

type CommandParameterType = string | boolean | number;

interface CommandParamProps {
    parameter: CommandParameter;
    value: CommandParameterType;
    setValue: (value: CommandParameterType) => void;
}

const CommandParam = ({ parameter, value, setValue }: CommandParamProps) => {
    if (parameter.type === 'int') {
        return (
            <NumberInput
                placeholder="123"
                allowDecimal={false}
                value={value as number}
                onChange={(value) => setValue(value)}
                description={parameter.multiple ? MULTIPLE_DESCRIPTION : undefined}
                label={parameter.name}
                mt="sm"
            />
        );
    }

    if (parameter.type === 'bool') {
        return (
            <Checkbox
                checked={value as boolean}
                onChange={(event) => setValue(event.currentTarget.checked)}
                description={parameter.multiple ? MULTIPLE_DESCRIPTION : undefined}
                label={parameter.name}
                mt="sm"
            />
        );
    }

    return (
        <TextInput
            placeholder="mon texte"
            value={value as string}
            onChange={(event) => setValue(event.currentTarget.value)}
            description={parameter.multiple ? MULTIPLE_DESCRIPTION : undefined}
            label={parameter.name}
            mt="sm"
        />
    );
};

interface ComponentProps {
    isShowed: boolean;
    hide: () => void;
    command?: CommandWithParameters;
}
const Component: React.FC<ComponentProps> = ({ isShowed, hide, command }) => {
    const [paramsValues, setParamsValues] = useState<Record<string, CommandParameterType>>({});
    useEffect(() => {
        if (!command) {
            setParamsValues({});
            return;
        }

        setParamsValues(
            command.parameters.reduce(
                (prev, curr) => ({
                    ...prev,
                    [curr.name]: curr.default,
                }),
                {},
            ),
        );
    }, [command]);

    return (
        <Modal opened={isShowed} onClose={hide} title={`Executer ${command ? command.name : null}`}>
            {command ? (
                <>
                    {command.help ? <p className={classes['command-help']}>{command.help}</p> : null}
                    {command.parameters.map((parameter) => (
                        <CommandParam
                            parameter={parameter}
                            value={paramsValues[parameter.name]}
                            setValue={(value: CommandParameterType) =>
                                setParamsValues((paramsValues) => ({
                                    ...paramsValues,
                                    [parameter.name]: value,
                                }))
                            }
                        />
                    ))}
                </>
            ) : null}
        </Modal>
    );
};

export default Component;

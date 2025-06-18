import { runCommandEndpoints } from '@/api/endpoints';
import ErrorCard from '@/components/ui/ErrorCard';
import { CommandParameter, CommandWithParameters } from '@/models/command';
import api from '@/utils/api';
import { Button, Checkbox, Modal, NumberInput, SegmentedControl, Textarea, TextInput } from '@mantine/core';
import { IconPlayerPlay } from '@tabler/icons-react';
import { useMutation, UseMutationResult } from '@tanstack/react-query';
import { AxiosError } from 'axios';
import { useEffect, useMemo, useState } from 'react';
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
type ParamsValues = Record<string, CommandParameterType>;

const postForm = async (command: string, values: ParamsValues) => {
    await api.post(runCommandEndpoints.run, {
        command,
        args: values,
    });
};

interface ComponentProps {
    isShowed: boolean;
    hide: () => void;
    command?: CommandWithParameters;
}
const Component: React.FC<ComponentProps> = ({ isShowed, hide, command }: ComponentProps) => {
    const [paramsValues, setParamsValues] = useState<ParamsValues>({});
    const [formMode, setFormMode] = useState<'normal' | 'json'>('normal');
    const [jsonValue, setJsonValue] = useState<string>('{}');

    useEffect(() => {
        if (!command) {
            setParamsValues({});
            setJsonValue('{}');
            return;
        }

        const initialValues = command.parameters.reduce(
            (prev, curr) => ({
                ...prev,
                [curr.name]: curr.default ? curr.default : curr.type === 'bool' ? false : undefined,
            }),
            {},
        );

        setParamsValues(initialValues);
        setJsonValue(JSON.stringify(initialValues, null, 2));
    }, [command]);

    useEffect(() => {
        if (formMode === 'json') {
            setJsonValue(JSON.stringify(paramsValues, null, 2));
        }
    }, [formMode, paramsValues]);

    const handleJsonChange = (value: string) => {
        setJsonValue(value);
        try {
            const parsed = JSON.parse(value);
            setParamsValues(parsed);
        } catch (error) {
            // Keep the invalid JSON in the textarea but don't update paramsValues
        }
    };

    const isValidJson = useMemo(() => {
        try {
            JSON.parse(jsonValue);
            return true;
        } catch {
            return false;
        }
    }, [jsonValue]);
    const paramsValid = useMemo(() => {
        if (!command) {
            return false;
        }

        if (formMode === 'json' && !isValidJson) {
            return false;
        }

        return command.parameters.every((param) => {
            const value = paramsValues[param.name];
            if (param.required && (value === undefined || value === null || value === '')) {
                return false;
            }
            return true;
        });
    }, [paramsValues, command, formMode, isValidJson]);

    const mutation: UseMutationResult<void, AxiosError, ParamsValues> = useMutation({
        mutationFn: (values: ParamsValues) => postForm(String(command?.name), values),
    });

    const handleSubmit = (values: ParamsValues) => {
        mutation.mutate(values);
    };

    return (
        <Modal opened={isShowed} onClose={hide} title={`Executer ${command ? command.name : null}`}>
            {mutation.error ? <ErrorCard>{mutation.error.message}</ErrorCard> : null}

            {command ? (
                <>
                    {command.help ? <p className={classes['command-help']}>{command.help}</p> : null}

                    <SegmentedControl
                        fullWidth
                        value={formMode}
                        onChange={(value) => setFormMode(value as 'normal' | 'json')}
                        data={[
                            { label: 'Formulaire', value: 'normal' },
                            { label: 'JSON', value: 'json' },
                        ]}
                        mt="md"
                    />

                    {formMode === 'normal' ? (
                        command.parameters.map((parameter) => (
                            <CommandParam
                                key={parameter.name}
                                parameter={parameter}
                                value={paramsValues[parameter.name]}
                                setValue={(value: CommandParameterType) =>
                                    setParamsValues((paramsValues) => ({
                                        ...paramsValues,
                                        [parameter.name]: value,
                                    }))
                                }
                            />
                        ))
                    ) : (
                        <Textarea
                            label="Paramètres JSON"
                            placeholder="Entrez les paramètres au format JSON"
                            value={jsonValue}
                            onChange={(event) => handleJsonChange(event.currentTarget.value)}
                            error={!isValidJson ? 'JSON invalide' : null}
                            minRows={6}
                            mt="sm"
                            autosize
                        />
                    )}

                    <div className="form-actions">
                        <Button type="button" variant="outline" onClick={() => hide()}>
                            Annuler
                        </Button>

                        <Button
                            type="button"
                            onClick={() => handleSubmit(paramsValues)}
                            leftSection={<IconPlayerPlay />}
                            disabled={!paramsValid || mutation.status === 'pending'}
                        >
                            Exécuter la commande
                        </Button>
                    </div>
                </>
            ) : null}
        </Modal>
    );
};

export default Component;

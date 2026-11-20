import React, { useId, useState } from 'react';

import { controlPlanEndpoints } from '@/api/endpoints';
import Checkbox from '@/components/dsfr/Checkbox';
import Modal from '@/components/dsfr/Modal';
import { ControlPlan, ControlPlanGroup, ControlPlanInput } from '@/models/control-plan';
import ErrorAlert from '@/routes/ControlPlan/ErrorAlert';
import {
    CONTROL_PLAN_QUERY_KEY,
    getDefaultPlanInput,
    trackControlPlanError,
    trackControlPlanEvent,
} from '@/routes/ControlPlan/utils';
import api, { ApiError } from '@/utils/api';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import classes from './index.module.scss';

type FieldName = keyof ControlPlanInput;
type FormErrors = Partial<Record<FieldName, string>>;
// the inputs hold '' when empty
type FormValues = Record<FieldName, string>;

const FIELD_NAMES: FieldName[] = ['name', 'startDate', 'endDate'];

const validate = ({ name, startDate, endDate }: FormValues, noEnd: boolean): FormErrors => {
    const errors: FormErrors = {};

    if (!name.trim()) {
        errors.name = 'Donnez un nom au plan.';
    }
    if (!startDate) {
        errors.startDate = 'Indiquez la date de début.';
    }
    if (noEnd) {
        return errors;
    }
    if (!endDate) {
        errors.endDate = 'Indiquez la date de fin, ou cochez « Sans date de fin ».';
    } else if (startDate && endDate < startDate) {
        // ISO dates compare as strings
        errors.endDate = 'La date de fin doit suivre la date de début.';
    }

    return errors;
};

const getApiFieldErrors = (error: unknown): FormErrors => {
    const body = error instanceof ApiError && typeof error.body === 'object' ? error.body : undefined;

    return FIELD_NAMES.reduce<FormErrors>((errors, field) => {
        const message = (body as Record<string, unknown> | undefined)?.[field];
        const text = Array.isArray(message) ? message.join(' ') : message;

        return typeof text === 'string' && text ? { ...errors, [field]: text } : errors;
    }, {});
};

interface FormProps {
    plan?: ControlPlan;
    group: ControlPlanGroup;
    onClose: () => void;
    onSaved: (plan: ControlPlan) => void;
}

const OpenedModal: React.FC<FormProps> = ({ plan, group, onClose, onSaved }: FormProps) => {
    const formId = `control-plan-form-${useId()}`;
    const queryClient = useQueryClient();
    const [values, setValues] = useState<FormValues>(() => {
        const input = plan
            ? { name: plan.name, startDate: plan.startDate, endDate: plan.endDate }
            : getDefaultPlanInput();
        return { ...input, endDate: input.endDate ?? '' };
    });
    const [noEnd, setNoEnd] = useState(() => !!plan && plan.endDate === null);
    const [errors, setErrors] = useState<FormErrors>({});

    const mutation = useMutation<ControlPlan, ApiError, ControlPlanInput>({
        mutationFn: (input) =>
            plan
                ? api<ControlPlan>(controlPlanEndpoints.detail(plan.uuid), { method: 'PATCH', body: input })
                : api<ControlPlan>(controlPlanEndpoints.create, {
                      method: 'POST',
                      body: { ...input, userGroupUuid: group.uuid },
                  }),
        onSuccess: (saved) => {
            trackControlPlanEvent(plan ? 'Plan modifié' : 'Plan créé', group.userGroupType);
            queryClient.invalidateQueries({ queryKey: [CONTROL_PLAN_QUERY_KEY] });
            onSaved(saved);
        },
        onError: (error) => {
            trackControlPlanError(plan ? 'Modification du plan' : 'Création du plan', error);
            setErrors(getApiFieldErrors(error));
        },
    });

    const setValue = (field: FieldName, value: string) => {
        setValues((previous) => ({ ...previous, [field]: value }));
        setErrors((previous) => ({ ...previous, [field]: undefined }));
    };

    const renderField = (
        field: FieldName,
        label: string,
        type: 'text' | 'date',
        { hint, disabled = false }: { hint?: string; disabled?: boolean } = {},
    ) => (
        <div
            className={clsx(
                'fr-input-group',
                errors[field] && 'fr-input-group--error',
                disabled && 'fr-input-group--disabled',
                classes.field,
            )}
        >
            <label className="fr-label" htmlFor={`${formId}-${field}`}>
                {label}
                {hint ? <span className="fr-hint-text">{hint}</span> : null}
            </label>
            <input
                className={clsx('fr-input', errors[field] && 'fr-input--error')}
                type={type}
                id={`${formId}-${field}`}
                value={disabled ? '' : values[field]}
                disabled={disabled}
                aria-describedby={`${formId}-${field}-messages`}
                onChange={(event) => setValue(field, event.currentTarget.value)}
            />
            <div className="fr-messages-group" id={`${formId}-${field}-messages`} aria-live="polite">
                {errors[field] ? <p className="fr-message fr-message--error">{errors[field]}</p> : null}
            </div>
        </div>
    );

    // the field errors are shown under their field, the rest (a conflict, a permission) here
    const hasFieldErrors = FIELD_NAMES.some((field) => !!errors[field]);

    return (
        <Modal
            opened
            gutters
            onClose={onClose}
            title={plan ? 'Modifier le plan de contrôle' : 'Créer un plan de contrôle'}
            footer={
                <div className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                    <button type="submit" form={formId} className="fr-btn" disabled={mutation.isPending}>
                        {plan ? 'Enregistrer' : 'Créer le plan'}
                    </button>
                    <button type="button" className="fr-btn fr-btn--secondary" onClick={onClose}>
                        Annuler
                    </button>
                </div>
            }
        >
            <form
                id={formId}
                noValidate
                onSubmit={(event) => {
                    event.preventDefault();
                    const nextErrors = validate(values, noEnd);
                    setErrors(nextErrors);

                    if (!Object.keys(nextErrors).length) {
                        mutation.mutate({
                            name: values.name.trim(),
                            startDate: values.startDate,
                            endDate: noEnd ? null : values.endDate,
                        });
                    }
                }}
            >
                {plan ? null : (
                    <div className={classes.intro}>
                        <p>
                            Les membres du groupe <b>{group.name}</b> verront ce plan, et ceux qui ont le droit
                            d’écriture pourront le modifier. Les autres utilisateurs du territoire, communes comprises,
                            ne voient pas le plan&nbsp;: seulement le statut «&nbsp;À&nbsp;contrôler&nbsp;» que prennent
                            les objets des parcelles retenues, sur la carte et dans le suivi.
                        </p>
                        <p>
                            Votre groupe peut mener plusieurs plans à la fois. Choisissez la période de celui-ci&nbsp;:
                            l’année pour un plan annuel, quelques semaines pour une opération ponctuelle, ou sans date
                            de fin pour suivre des parcelles dans la durée.
                        </p>
                    </div>
                )}
                {renderField('name', 'Nom du plan', 'text', {
                    hint: 'Par exemple : Plan annuel 2027, Opération littoral, Parcelles préemptées',
                })}
                <div className={classes.dates}>
                    {renderField('startDate', 'Début de la période', 'date')}
                    {renderField('endDate', 'Fin de la période', 'date', { disabled: noEnd })}
                </div>
                <Checkbox
                    className={classes['no-end']}
                    label={
                        <>
                            Sans date de fin
                            <span className="fr-hint-text">Pour suivre des parcelles dans la durée</span>
                        </>
                    }
                    checked={noEnd}
                    onChange={(checked) => {
                        setNoEnd(checked);
                        setErrors((previous) => ({ ...previous, endDate: undefined }));
                    }}
                />
                {mutation.isError && !hasFieldErrors ? (
                    <ErrorAlert error={mutation.error} fallback="Le plan n’a pas été enregistré, veuillez réessayer." />
                ) : null}
            </form>
        </Modal>
    );
};

interface ComponentProps extends FormProps {
    opened: boolean;
}

// mounted on opening, so that the form starts again from the plan each time
const Component: React.FC<ComponentProps> = ({ opened, ...props }: ComponentProps) =>
    opened ? <OpenedModal {...props} /> : null;

export default Component;

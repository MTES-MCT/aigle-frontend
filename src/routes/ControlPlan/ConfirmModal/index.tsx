import React, { PropsWithChildren } from 'react';

import Modal from '@/components/dsfr/Modal';
import ErrorAlert from '@/routes/ControlPlan/ErrorAlert';

interface ComponentProps extends PropsWithChildren {
    opened: boolean;
    title: string;
    confirmLabel: string;
    pending: boolean;
    error: unknown;
    errorFallback: string;
    onConfirm: () => void;
    onClose: () => void;
}

const Component: React.FC<ComponentProps> = ({
    opened,
    title,
    confirmLabel,
    pending,
    error,
    errorFallback,
    onConfirm,
    onClose,
    children,
}: ComponentProps) => (
    <Modal
        opened={opened}
        gutters
        onClose={onClose}
        title={title}
        footer={
            // the DSFR modal footer: primary action first, shown on the right
            <div className="fr-btns-group fr-btns-group--right fr-btns-group--inline-reverse fr-btns-group--inline-lg">
                <button type="button" className="fr-btn" disabled={pending} onClick={onConfirm}>
                    {pending ? 'En cours…' : confirmLabel}
                </button>
                <button type="button" className="fr-btn fr-btn--secondary" onClick={onClose}>
                    Annuler
                </button>
            </div>
        }
    >
        {children}
        {error ? <ErrorAlert className="fr-mt-2w" error={error} fallback={errorFallback} /> : null}
    </Modal>
);

export default Component;

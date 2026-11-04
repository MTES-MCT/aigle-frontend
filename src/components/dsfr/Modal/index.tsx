import { isEscapeKeptByFocusedField, lockPageScroll } from '@/utils/html';
import clsx from 'clsx';
import React, { PropsWithChildren, ReactNode, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import classes from './index.module.scss';

interface ComponentProps extends PropsWithChildren {
    opened: boolean;
    onClose: () => void;
    title: ReactNode;
    footer?: ReactNode;
    closeTitle?: string;
    // DSFR grid classes of the column that holds the modal body: they set its width.
    colClassName?: string;
    // the modal of the DSFR design kit: a gutter narrower, the close button 1rem from the edge
    gutters?: boolean;
    bodyClassName?: string;
}

/**
 * DSFR modal driven from React instead of the DSFR JS runtime.
 *
 * The <dialog> is opened with `showModal()`, which gives natively what the DSFR JS emulates: focus
 * kept inside, Escape to close, the page behind made inert, and focus handed back to the opener on
 * close. The page scroll is locked the DSFR way (`data-fr-scrolling` fixes the body in place), and
 * a click on the overlay closes the modal, as it does with the DSFR JS.
 */
const Component: React.FC<ComponentProps> = ({
    opened,
    onClose,
    title,
    footer,
    closeTitle = 'Fermer la fenêtre modale',
    colClassName = 'fr-col-12 fr-col-md-8 fr-col-lg-6',
    gutters = false,
    bodyClassName,
    children,
}: ComponentProps) => {
    const id = `modal-${useId()}`;
    const dialogRef = useRef<HTMLDialogElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const pointerDownOnOverlayRef = useRef(false);
    const [scrollDivided, setScrollDivided] = useState(false);

    useEffect(() => {
        const dialog = dialogRef.current;

        if (!dialog || !opened) {
            return;
        }

        const unlockPageScroll = lockPageScroll();

        dialog.showModal();
        if (!dialog.contains(document.activeElement)) {
            closeButtonRef.current?.focus();
        }

        return () => {
            // Closed while the body is still fixed, so handing focus back cannot scroll the page.
            dialog.close();
            unlockPageScroll();
        };
    }, [opened]);

    // The footer stays in view over scrolling content: a divider marks the edge while content
    // runs underneath it, as `fr-scroll-divider` does with the DSFR JS.
    useLayoutEffect(() => {
        const body = bodyRef.current;

        if (!body) {
            return;
        }

        const update = () =>
            setScrollDivided(
                body.scrollHeight > body.clientHeight && body.scrollTop + body.clientHeight < body.scrollHeight - 1,
            );
        const observer = new ResizeObserver(update);
        observer.observe(body);
        body.addEventListener('scroll', update);

        return () => {
            observer.disconnect();
            body.removeEventListener('scroll', update);
        };
    }, []);

    return (
        <dialog
            ref={dialogRef}
            id={id}
            className={clsx('fr-modal', opened && 'fr-modal--opened', classes.dialog)}
            aria-labelledby={`${id}-title`}
            // Escape in a field belongs to the field, as with the DSFR JS
            onKeyDown={(event) => {
                if (event.key === 'Escape' && isEscapeKeptByFocusedField()) {
                    event.preventDefault();
                }
            }}
            onCancel={(event) => {
                event.preventDefault();
                onClose();
            }}
            // A press that starts in the body and ends on the overlay (selecting text) is not a close.
            onPointerDown={(event) => {
                pointerDownOnOverlayRef.current = event.target === event.currentTarget;
            }}
            onClick={(event) => {
                if (event.target === event.currentTarget && pointerDownOnOverlayRef.current) {
                    onClose();
                }
            }}
        >
            <div className="fr-container fr-container--fluid fr-container-md">
                <div className={clsx('fr-grid-row fr-grid-row--center', gutters && 'fr-grid-row--gutters')}>
                    <div className={colClassName}>
                        <div
                            ref={bodyRef}
                            className={clsx(
                                'fr-modal__body',
                                scrollDivided && 'fr-scroll-divider',
                                gutters && classes['body-kit'],
                                bodyClassName,
                            )}
                        >
                            <div className="fr-modal__header">
                                <button
                                    ref={closeButtonRef}
                                    type="button"
                                    className="fr-btn--close fr-btn"
                                    title={closeTitle}
                                    aria-controls={id}
                                    onClick={onClose}
                                >
                                    Fermer
                                </button>
                            </div>
                            <div className="fr-modal__content">
                                <h2 id={`${id}-title`} className="fr-modal__title">
                                    {title}
                                </h2>
                                {children}
                            </div>
                            {footer ? <div className="fr-modal__footer">{footer}</div> : null}
                        </div>
                    </div>
                </div>
            </div>
        </dialog>
    );
};

export default Component;

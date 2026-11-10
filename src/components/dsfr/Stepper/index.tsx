import { scrollBelowHeader } from '@/utils/html';
import clsx from 'clsx';
import React, { useEffect, useRef } from 'react';

interface ComponentProps {
    // the titles of every step, in order
    steps: string[];
    // 1-based
    currentStep: number;
    // the DSFR example uses h2; lower it under a page section that already has one
    titleAs?: 'h2' | 'h3' | 'h4';
    // put before « Étape 2 sur 4 », e.g. « Vague 2 »
    statePrefix?: string;
    // a step change moves the focus (and the page) to the new title, as a page change would
    focusOnStepChange?: boolean;
    // the same on mount, for a stepper the user has just opened
    focusOnMount?: boolean;
    className?: string;
}

// The DSFR stepper (`fr-stepper`): its bar is drawn by the DSFR CSS from the two data attributes.
const Component: React.FC<ComponentProps> = ({
    steps,
    currentStep,
    titleAs = 'h2',
    statePrefix,
    focusOnStepChange = false,
    focusOnMount = false,
    className,
}: ComponentProps) => {
    const nextStep = steps[currentStep];
    const Title = titleAs;
    const titleRef = useRef<HTMLHeadingElement>(null);
    // null until mounted: the first render focuses only when asked, the page may just have opened on it
    const previousStepRef = useRef<number | null>(null);

    useEffect(() => {
        const mounting = previousStepRef.current === null;
        if (previousStepRef.current === currentStep) {
            return;
        }

        previousStepRef.current = currentStep;
        if ((mounting ? focusOnMount : focusOnStepChange) && titleRef.current) {
            titleRef.current.focus({ preventScroll: true });
            scrollBelowHeader(titleRef.current);
        }
        // focusOnMount only counts on the first render
    }, [currentStep, focusOnStepChange]);

    return (
        <div className={clsx('fr-stepper', className)}>
            <Title ref={titleRef} className="fr-stepper__title" tabIndex={-1}>
                {steps[currentStep - 1]}
                <span className="fr-stepper__state">
                    {statePrefix ? `${statePrefix} · ` : ''}Étape {currentStep} sur {steps.length}
                </span>
            </Title>
            <div className="fr-stepper__steps" data-fr-current-step={currentStep} data-fr-steps={steps.length} />
            {nextStep ? (
                <p className="fr-stepper__details">
                    <span className="fr-text--bold">Étape suivante :</span> {nextStep}
                </p>
            ) : null}
        </div>
    );
};

export default Component;

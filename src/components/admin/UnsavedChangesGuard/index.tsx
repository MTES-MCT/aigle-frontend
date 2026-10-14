import React, { useCallback, useEffect } from 'react';

import { Button, Group, Modal, Text } from '@mantine/core';
import { BlockerFunction, useBlocker } from 'react-router-dom';

interface ComponentProps {
    // Called when leaving, not at render: a form saved right before navigating away calls resetDirty() first.
    isDirty: () => boolean;
}

/** Asks for a confirmation before leaving a form with unsaved changes (link, back button, tab close, reload). */
const Component: React.FC<ComponentProps> = ({ isDirty }) => {
    const shouldBlock = useCallback<BlockerFunction>(
        ({ currentLocation, nextLocation }) => currentLocation.pathname !== nextLocation.pathname && isDirty(),
        [isDirty],
    );
    const blocker = useBlocker(shouldBlock);

    // Closing or reloading the tab: only the browser's own dialog can be shown.
    useEffect(() => {
        const warn = (event: BeforeUnloadEvent) => {
            if (isDirty()) {
                event.preventDefault();
                // Safari ignores preventDefault() here
                event.returnValue = '';
            }
        };

        window.addEventListener('beforeunload', warn);
        return () => window.removeEventListener('beforeunload', warn);
    }, [isDirty]);

    return (
        <Modal
            opened={blocker.state === 'blocked'}
            onClose={() => blocker.reset?.()}
            title="Modifications non enregistrées"
            centered
        >
            <Text size="sm">
                Les modifications de ce formulaire n’ont pas été enregistrées : elles seront perdues si vous quittez la
                page.
            </Text>
            <Group mt="lg" justify="flex-end">
                <Button variant="outline" onClick={() => blocker.reset?.()}>
                    Rester sur la page
                </Button>
                <Button color="red" onClick={() => blocker.proceed?.()}>
                    Quitter sans enregistrer
                </Button>
            </Group>
        </Modal>
    );
};

export default Component;

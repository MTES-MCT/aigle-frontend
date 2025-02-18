import React, { PropsWithChildren, useState } from 'react';

import { Alert } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';

interface ComponentProps {
    title?: string;
    className?: string;
    withCloseButton?: boolean;
}

const Component: React.FC<PropsWithChildren<ComponentProps>> = ({
    children,
    title,
    className,
    withCloseButton = true,
}: PropsWithChildren<ComponentProps>) => {
    const [alertShowed, setAlertShowed] = useState(true);

    return (
        <>
            {alertShowed ? (
                <Alert
                    mb="md"
                    variant="light"
                    color="blue"
                    title={title}
                    className={className}
                    icon={<IconInfoCircle />}
                    withCloseButton={withCloseButton}
                    onClose={() => setAlertShowed(false)}
                >
                    {children}
                </Alert>
            ) : null}
        </>
    );
};

export default Component;

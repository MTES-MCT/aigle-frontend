import { FloatingPosition, Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import React, { PropsWithChildren } from 'react';

interface ComponentProps {
    tooltipPosition?: FloatingPosition;
    size?: number;
}
const Component: React.FC<PropsWithChildren<ComponentProps>> = ({
    children,
    tooltipPosition,
    size = 16,
}: PropsWithChildren<ComponentProps>) => {
    return (
        <Tooltip label={children} position={tooltipPosition}>
            <IconInfoCircle size={size} />
        </Tooltip>
    );
};

export default Component;

import { FloatingPosition, Tooltip } from '@mantine/core';
import { IconInfoCircle } from '@tabler/icons-react';
import React, { PropsWithChildren } from 'react';

interface ComponentProps {
    tooltipPosition?: FloatingPosition;
    className?: string;
    size?: number;
}
const Component: React.FC<PropsWithChildren<ComponentProps>> = ({
    children,
    tooltipPosition,
    className,
    size = 16,
}: PropsWithChildren<ComponentProps>) => {
    return (
        <Tooltip label={children} position={tooltipPosition}>
            <IconInfoCircle size={size} className={className} />
        </Tooltip>
    );
};

export default Component;

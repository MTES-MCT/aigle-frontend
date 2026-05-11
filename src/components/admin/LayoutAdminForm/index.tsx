import React, { PropsWithChildren } from 'react';

import LayoutAdmin from '@/components/admin/LayoutAdmin';
import { Button } from '@mantine/core';
import { IconChevronLeft } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

interface AdminSubheaderProps {
    backText: string;
    backUrl: string;
    title?: string;
}

interface ComponentProps extends AdminSubheaderProps {}

const Component: React.FC<PropsWithChildren<ComponentProps>> = ({ backText, backUrl, title, children }) => {
    const navigate = useNavigate();

    return (
        <LayoutAdmin title={title}>
            <Button
                p={0}
                variant="transparent"
                leftSection={<IconChevronLeft />}
                onClick={() => navigate(`${backUrl}${window.location.search}`)}
            >
                {backText}
            </Button>
            {children}
        </LayoutAdmin>
    );
};

export default Component;

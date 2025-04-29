import React, { PropsWithChildren } from 'react';

import LayoutAdmin from '@/components/admin/LayoutAdmin';
import { Button } from '@mantine/core';
import { IconChevronLeft } from '@tabler/icons-react';
import { Link } from 'react-router-dom';

interface AdminSubheaderProps {
    backText: string;
    backUrl: string;
    title?: string;
}

interface ComponentProps extends AdminSubheaderProps {}

const Component: React.FC<PropsWithChildren<ComponentProps>> = ({ backText, backUrl, title, children }) => {
    return (
        <LayoutAdmin title={title}>
            <Button p={0} component={Link} to={backUrl} variant="transparent" leftSection={<IconChevronLeft />}>
                {backText}
            </Button>
            {children}
        </LayoutAdmin>
    );
};

export default Component;

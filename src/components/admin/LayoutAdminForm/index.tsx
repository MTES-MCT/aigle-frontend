import React, { PropsWithChildren } from 'react';

import LayoutAdmin from '@/components/admin/LayoutAdmin';
import { useFilterNavigation } from '@/hooks/useFilterNavigation';
import { Button } from '@mantine/core';
import { IconChevronLeft } from '@tabler/icons-react';

interface AdminSubheaderProps {
    backText: string;
    backUrl: string;
    title?: string;
}

interface ComponentProps extends AdminSubheaderProps {}

const Component: React.FC<PropsWithChildren<ComponentProps>> = ({ backText, backUrl, title, children }) => {
    const { navigate } = useFilterNavigation();

    return (
        <LayoutAdmin title={title}>
            <Button p={0} variant="transparent" leftSection={<IconChevronLeft />} onClick={() => navigate(backUrl)}>
                {backText}
            </Button>
            {children}
        </LayoutAdmin>
    );
};

export default Component;

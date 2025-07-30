import { UserRole } from '@/models/user';
import { useAuth } from '@/store/slices/auth';
import React, { PropsWithChildren } from 'react';
import { Navigate } from 'react-router-dom';

interface ComponentProps {
    roles?: UserRole[];
}

const Component: React.FC<PropsWithChildren<ComponentProps>> = ({ children, roles }) => {
    const { isAuthenticated, userMe } = useAuth();

    if (!isAuthenticated()) {
        return <Navigate to="/login" />;
    }

    if (roles && userMe && !roles.includes(userMe.userRole)) {
        return <Navigate to="/" />;
    }

    return <>{children}</>;
};

export default Component;

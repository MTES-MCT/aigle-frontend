import LayoutBase from '@/components/LayoutBase';
import { useAuth } from '@/store/slices/auth';
import React from 'react';
import { Navigate } from 'react-router-dom';

const Component: React.FC = () => {
    const { getCanViewStatistics } = useAuth();

    if (!getCanViewStatistics()) {
        return <Navigate to="/" />;
    }

    return (
        <LayoutBase title="Statistiques">
            <p>Les statistiques DDTM seront affichées ici.</p>
        </LayoutBase>
    );
};

export default Component;

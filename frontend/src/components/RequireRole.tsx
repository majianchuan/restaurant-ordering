import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ROLE_HOME } from '../constants';
import type { Role } from '../types';
import { PageLoading } from './PageLoading';

export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
    const { user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <PageLoading />;
    }

    if (!user) {
        return (
            <Navigate
                to="/login"
                state={{ from: location.pathname + location.search }}
                replace
            />
        );
    }

    if (user.role !== role) {
        return <Navigate to={ROLE_HOME[user.role]} replace />;
    }

    return <>{children}</>;
}

import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate } from 'react-router-dom';

export default function AuthCallbackPage() {
    const { loading, isLoggedIn, user } = useAuth();

    if (loading) {
        return (
            <div className="state-box">
                <div className="spinner"></div> Completing login...
            </div>
        );
    }

    if (isLoggedIn()) {
        const urlParams = new URLSearchParams(window.location.search);
        const urlRole = urlParams.get('role');
        
        // If the URL has a role but the user object doesn't have it yet, 
        // we might want to wait for the /me call to finish or force a re-fetch.
        // But for now, simple redirect should work once AuthContext updates.
        
        const redirectTo = sessionStorage.getItem('wecode_redirect_after_login') || "/";
        sessionStorage.removeItem('wecode_redirect_after_login');
        return <Navigate to={redirectTo} replace />;
    }

    return <Navigate to="/login" replace />;
}
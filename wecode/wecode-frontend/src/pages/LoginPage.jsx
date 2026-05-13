import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

export default function LoginPage() {
    const { isLoggedIn, login, loading } = useAuth();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";

    if (loading) {
        return (
            <div className="state-box">
                <div className="spinner"></div> Completing login...
            </div>
        );
    }

    if (isLoggedIn()) {
        return <Navigate to="/" replace />;
    }

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-header">
                    <div className="login-logo">
                        <span className="brand-logo">&lt;/&gt;</span>
                        <span className="brand-name">WeCode</span>
                    </div>
                    <h2>Welcome back</h2>
                    <p>Sign in to continue to WeCode</p>
                </div>
                
                <button className="google-login-btn" onClick={() => login(from)}>
                    <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                        <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
                            <path fill="#4285F4" d="M -3.264,51.509 C -3.264,50.719 -3.334,49.969 -3.454,49.239 L -14.754,49.239 L -14.754,53.749 L -8.284,53.749 C -8.574,55.229 -9.424,56.479 -10.684,57.329 L -10.684,60.329 L -6.824,60.329 C -4.564,58.239 -3.264,55.159 -3.264,51.509 z"/>
                            <path fill="#34A853" d="M -14.754,63.239 C -11.514,63.239 -8.804,62.159 -6.824,60.329 L -10.684,57.329 C -11.764,58.049 -13.134,58.489 -14.754,58.489 C -17.884,58.489 -20.534,56.379 -21.484,53.529 L -25.464,53.529 L -25.464,56.619 C -23.494,60.539 -19.444,63.239 -14.754,63.239 z"/>
                            <path fill="#FBBC05" d="M -21.484,53.529 C -21.734,52.809 -21.864,52.039 -21.864,51.239 C -21.864,50.439 -21.724,49.669 -21.484,48.949 L -21.484,45.859 L -25.464,45.859 C -26.284,47.479 -26.754,49.299 -26.754,51.239 C -26.754,53.179 -26.284,54.999 -25.464,56.619 L -21.484,53.529 z"/>
                            <path fill="#EA4335" d="M -14.754,43.989 C -12.984,43.989 -11.404,44.599 -10.154,45.789 L -6.734,41.939 C -8.804,39.869 -11.514,38.739 -14.754,38.739 C -19.444,38.739 -23.494,41.439 -25.464,45.859 L -21.484,48.949 C -20.534,46.099 -17.884,43.989 -14.754,43.989 z"/>
                        </g>
                    </svg>
                    Continue with Google
                </button>

                <div className="login-footer">
                    <div className="login-divider">
                        <span>Why join WeCode?</span>
                    </div>
                    <ul className="login-features">
                        <li><span>🚀</span> Master algorithms with real-time judging</li>
                        <li><span>🎯</span> Ace your next big technical interview</li>
                        <li><span>💻</span> Support for C++, Python, and Java</li>
                        <li><span>🌟</span> Join a community of elite developers</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

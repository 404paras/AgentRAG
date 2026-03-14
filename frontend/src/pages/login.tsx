import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { loginUser } from '../services/api';
import { saveUser, saveToken } from '../utils/userStorage';
import { ArrowLeft, Check, AlertCircle } from 'lucide-react';
import '../styles/auth.css';

const Login = () => {
    const navigate = useNavigate();
    const [emailId, setEmailId] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!emailId || !password) {
            setError('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        try {
            const data = await loginUser(emailId, password);
            saveToken(data.token);
            saveUser({ _id: data.user.id, emailId: data.user.emailId });
            navigate('/option');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-page">
            {/* Left Side - Branding */}
            <div className="auth-branding">
                <div className="branding-content">
                    <div className="branding-logo">
                        <img src="/docpal.svg" alt="DocPal" className="branding-logo-img" />
                        <span className="branding-logo-text">DocPal</span>
                    </div>
                    <h1 className="branding-title">Welcome back!</h1>
                    <p className="branding-subtitle">
                        Sign in to continue chatting with your documents using AI-powered insights.
                    </p>
                    <div className="branding-features">
                        <div className="branding-feature">
                            <div className="branding-feature-icon">
                                <Check size={14} />
                            </div>
                            <span>Access all your uploaded documents</span>
                        </div>
                        <div className="branding-feature">
                            <div className="branding-feature-icon">
                                <Check size={14} />
                            </div>
                            <span>Continue your AI conversations</span>
                        </div>
                        <div className="branding-feature">
                            <div className="branding-feature-icon">
                                <Check size={14} />
                            </div>
                            <span>Secure and private access</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="auth-form-container">
                <div className="auth-form-wrapper">
                    <Link to="/" className="auth-back-link">
                        <ArrowLeft />
                        Back to home
                    </Link>

                    <div className="auth-card">
                        <div className="auth-card-header">
                            <img src="/docpal.svg" alt="DocPal" className="auth-logo-img" />
                            <h1 className="auth-title">Sign in</h1>
                            <p className="auth-subtitle">
                                Enter your credentials to access your account
                            </p>
                        </div>

                        <div className="auth-card-content">
                            <form onSubmit={handleSubmit} className="auth-form">
                                {error && (
                                    <div className="auth-error">
                                        <AlertCircle />
                                        {error}
                                    </div>
                                )}
                                
                                <div className="form-group">
                                    <Label htmlFor="email">Email address</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder="you@example.com"
                                        value={emailId}
                                        onChange={(e) => setEmailId(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        type="password"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="auth-submit-btn cursor-pointer"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Signing in...' : 'Sign in'}
                                </Button>
                            </form>
                        </div>

                        <div className="auth-card-footer">
                            <p className="auth-footer-text">
                                Don't have an account?{' '}
                                <Link to="/register" className="auth-link">
                                    Create one
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
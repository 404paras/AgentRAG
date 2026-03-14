import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { registerUser } from '../services/api';
import { ArrowLeft, Check, AlertCircle, Sparkles } from 'lucide-react';
import '../styles/auth.css';

const Register = () => {
    const navigate = useNavigate();
    const [emailId, setEmailId] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const passwordStrength = useMemo(() => {
        if (!password) return { level: '', text: '' };
        if (password.length < 6) return { level: 'weak', text: 'Weak - at least 6 characters' };
        if (password.length < 10) return { level: 'medium', text: 'Medium - add more characters' };
        return { level: 'strong', text: 'Strong password' };
    }, [password]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!emailId || !password || !confirmPassword) {
            setError('Please fill in all fields');
            return;
        }

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);
        try {
            await registerUser(emailId, password);
            navigate('/login');
        } catch (err: any) {
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
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
                    <h1 className="branding-title">Start your journey</h1>
                    <p className="branding-subtitle">
                        Create an account to unlock AI-powered document conversations.
                    </p>
                    <div className="branding-features">
                        <div className="branding-feature">
                            <div className="branding-feature-icon">
                                <Check size={14} />
                            </div>
                            <span>Upload PDFs, Word docs & text files</span>
                        </div>
                        <div className="branding-feature">
                            <div className="branding-feature-icon">
                                <Check size={14} />
                            </div>
                            <span>AI-powered Q&A with your documents</span>
                        </div>
                        <div className="branding-feature">
                            <div className="branding-feature-icon">
                                <Check size={14} />
                            </div>
                            <span>Web-enhanced intelligent answers</span>
                        </div>
                        <div className="branding-feature">
                            <div className="branding-feature-icon">
                                <Sparkles size={14} />
                            </div>
                            <span>100% free to use</span>
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
                            <h1 className="auth-title">Create account</h1>
                            <p className="auth-subtitle">
                                Get started with your free account today
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
                                        placeholder="Create a strong password"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                    />
                                    {password && (
                                        <div className="password-strength">
                                            <div className="password-strength-bar">
                                                <div className={`password-strength-fill ${passwordStrength.level}`}></div>
                                            </div>
                                            <span className="password-strength-text">{passwordStrength.text}</span>
                                        </div>
                                    )}
                                </div>

                                <div className="form-group">
                                    <Label htmlFor="confirm-password">Confirm password</Label>
                                    <Input
                                        id="confirm-password"
                                        type="password"
                                        placeholder="Confirm your password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        required
                                    />
                                </div>

                                <Button
                                    type="submit"
                                    className="auth-submit-btn cursor-pointer"
                                    disabled={isLoading}
                                >
                                    {isLoading ? 'Creating account...' : 'Create account'}
                                </Button>
                            </form>
                        </div>

                        <div className="auth-card-footer">
                            <p className="auth-footer-text">
                                Already have an account?{' '}
                                <Link to="/login" className="auth-link">
                                    Sign in
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Register;
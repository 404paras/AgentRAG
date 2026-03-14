import { useNavigate, useLocation } from 'react-router-dom';
import { getToken, getUser, clearAll } from '../../utils/userStorage';
import { Button } from '../ui/button';
import { Home, FileText, LogOut, User, Menu, X, Settings } from 'lucide-react';
import { useState } from 'react';
import '../../styles/navbar.css';

const Navbar = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    const isAuthenticated = !!getToken();
    const user = getUser();
    
    const isActive = (path: string) => location.pathname === path;
    
    const handleLogout = () => {
        clearAll();
        navigate('/');
    };
    
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    return (
        <nav className="navbar">
            <div className="navbar-container">
                {/* Logo */}
                <div className="navbar-logo" onClick={() => navigate(isAuthenticated ? '/option' : '/')}>
                    <img src="/docpal.svg" alt="DocPal" className="logo-icon-img" />
                    <span className="logo-text">DocPal</span>
                </div>

                {/* Desktop Navigation */}
                <div className="navbar-links">
                    {isAuthenticated ? (
                        <>
                            <button
                                className={`nav-link ${isActive('/option') ? 'active' : ''}`}
                                onClick={() => navigate('/option')}
                            >
                                <Home className="nav-icon" />
                                <span>Dashboard</span>
                            </button>
                            <button
                                className={`nav-link ${isActive('/notes') ? 'active' : ''}`}
                                onClick={() => navigate('/notes')}
                            >
                                <FileText className="nav-icon" />
                                <span>My Notes</span>
                            </button>
                            <button
                                className={`nav-link ${isActive('/settings') ? 'active' : ''}`}
                                onClick={() => navigate('/settings')}
                            >
                                <Settings className="nav-icon" />
                                <span>Settings</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className={`nav-link ${isActive('/') ? 'active' : ''}`}
                                onClick={() => navigate('/')}
                            >
                                <Home className="nav-icon" />
                                <span>Home</span>
                            </button>
                        </>
                    )}
                </div>

                {/* User Actions */}
                <div className="navbar-actions">
                    {isAuthenticated ? (
                        <>
                            <div className="user-info">
                                <User className="user-icon" />
                                <span className="user-email">{user?.emailId}</span>
                            </div>
                            <Button
                                variant="ghost"
                                className="logout-btn"
                                onClick={handleLogout}
                            >
                                <LogOut className="w-4 h-4" />
                                <span>Logout</span>
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="ghost"
                                className="nav-auth-btn"
                                onClick={() => navigate('/login')}
                            >
                                Sign In
                            </Button>
                            <Button
                                className="nav-auth-btn-primary"
                                onClick={() => navigate('/register')}
                            >
                                Get Started
                            </Button>
                        </>
                    )}
                </div>

                {/* Mobile Menu Toggle */}
                <button className="mobile-menu-toggle" onClick={toggleMobileMenu}>
                    {isMobileMenuOpen ? <X /> : <Menu />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="mobile-menu">
                    {isAuthenticated ? (
                        <>
                            <button
                                className={`mobile-nav-link ${isActive('/option') ? 'active' : ''}`}
                                onClick={() => { navigate('/option'); toggleMobileMenu(); }}
                            >
                                <Home className="nav-icon" />
                                <span>Dashboard</span>
                            </button>
                            <button
                                className={`mobile-nav-link ${isActive('/notes') ? 'active' : ''}`}
                                onClick={() => { navigate('/notes'); toggleMobileMenu(); }}
                            >
                                <FileText className="nav-icon" />
                                <span>My Notes</span>
                            </button>
                            <button
                                className={`mobile-nav-link ${isActive('/settings') ? 'active' : ''}`}
                                onClick={() => { navigate('/settings'); toggleMobileMenu(); }}
                            >
                                <Settings className="nav-icon" />
                                <span>Settings</span>
                            </button>
                            <div className="mobile-user-info">
                                <User className="user-icon" />
                                <span>{user?.emailId}</span>
                            </div>
                            <button className="mobile-logout-btn" onClick={handleLogout}>
                                <LogOut className="w-4 h-4" />
                                <span>Logout</span>
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className={`mobile-nav-link ${isActive('/') ? 'active' : ''}`}
                                onClick={() => { navigate('/'); toggleMobileMenu(); }}
                            >
                                <Home className="nav-icon" />
                                <span>Home</span>
                            </button>
                            <button
                                className="mobile-nav-link"
                                onClick={() => { navigate('/login'); toggleMobileMenu(); }}
                            >
                                Sign In
                            </button>
                            <button
                                className="mobile-nav-link-primary"
                                onClick={() => { navigate('/register'); toggleMobileMenu(); }}
                            >
                                Get Started
                            </button>
                        </>
                    )}
                </div>
            )}
        </nav>
    );
};

export default Navbar;
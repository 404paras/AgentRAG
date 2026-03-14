import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { type ReactNode } from 'react';
import Option from './pages/option';
import NotesPage from './pages/notesPage';
import Chat from './pages/chat';
import EditNote from './pages/editNote';
import Login from './pages/login';
import Register from './pages/register';
import Landing from './pages/landing';
import Settings from './pages/settings';
import Navbar from './components/layout/Navbar';
import { ToastProvider } from './components/ui/toast';
import { getToken } from './utils/userStorage';
import './styles/colors.css';

// Layout component that includes Navbar
const Layout = ({ children, showNavbar = true }: { children: ReactNode; showNavbar?: boolean }) => {
    return (
        <>
            {showNavbar && <Navbar />}
            <main className={showNavbar ? 'main-content' : ''}>
                {children}
            </main>
        </>
    );
};

// Protected Route component - redirects to login if not authenticated
const ProtectedRoute = ({ children }: { children: ReactNode }) => {
    const token = getToken();
    const location = useLocation();
    
    if (!token) {
        // Save the attempted URL for redirecting after login
        return <Navigate to="/login" state={{ from: location }} replace />;
    }
    
    return <>{children}</>;
};

// Public Route component - redirects to dashboard if already authenticated
const PublicRoute = ({ children }: { children: ReactNode }) => {
    const token = getToken();
    
    if (token) {
        return <Navigate to="/option" replace />;
    }
    
    return <>{children}</>;
};

// Auth Route - for login/register pages, shows navbar but redirects if logged in
const AuthRoute = ({ children }: { children: ReactNode }) => {
    const token = getToken();
    
    if (token) {
        return <Navigate to="/option" replace />;
    }
    
    return (
        <Layout showNavbar={false}>
            {children}
        </Layout>
    );
};

const App = () => {
    return (
        <ToastProvider>
            <Router>
                <Routes>
                {/* Public Landing Page */}
                <Route
                    path="/"
                    element={
                        <PublicRoute>
                            <Layout>
                                <Landing />
                            </Layout>
                        </PublicRoute>
                    }
                />
                
                {/* Auth Routes (Login/Register) - No navbar, redirect if logged in */}
                <Route
                    path="/login"
                    element={
                        <AuthRoute>
                            <Login />
                        </AuthRoute>
                    }
                />
                <Route
                    path="/register"
                    element={
                        <AuthRoute>
                            <Register />
                        </AuthRoute>
                    }
                />
                
                {/* Protected Routes - Require authentication */}
                <Route
                    path="/option"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <Option />
                            </Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/notes"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <NotesPage />
                            </Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/notes/chat/:noteId"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <Chat />
                            </Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/notes/:noteId"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <EditNote />
                            </Layout>
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/settings"
                    element={
                        <ProtectedRoute>
                            <Layout>
                                <Settings />
                            </Layout>
                        </ProtectedRoute>
                    }
                />
                
                    {/* Catch-all redirect */}
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </Router>
        </ToastProvider>
    );
};

export default App;

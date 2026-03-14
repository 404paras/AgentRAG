import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { 
    Upload, 
    Shield, 
    Brain,
    ArrowRight,
    FileText,
    Sparkles,
    Globe,
    Zap,
    Layers
} from 'lucide-react';
import '../styles/landing.css';

const Landing = () => {
    const navigate = useNavigate();

    const features = [
        {
            icon: <Upload className="feature-icon" />,
            title: 'Upload Documents',
            description: 'Upload PDFs, Word documents, or text files. Our system processes and indexes your content automatically.'
        },
        {
            icon: <Brain className="feature-icon" />,
            title: 'AI-Powered RAG',
            description: 'Retrieval-Augmented Generation combines your documents with advanced AI to provide accurate, contextual answers.'
        },
        {
            icon: <Zap className="feature-icon" />,
            title: 'Intelligent AI Agent',
            description: 'Our AI agent first searches your local documents. If the information isn\'t sufficient, it automatically searches the web for additional context.'
        },
        {
            icon: <Layers className="feature-icon" />,
            title: 'Combined Context',
            description: 'The agent intelligently combines local document knowledge with global web context to deliver the most comprehensive and accurate answers.'
        },
        {
            icon: <Globe className="feature-icon" />,
            title: 'Web-Enhanced Answers',
            description: 'When your documents don\'t have all the answers, our agent seamlessly fetches relevant information from the web and merges it with your content.'
        },
        {
            icon: <Shield className="feature-icon" />,
            title: 'Secure & Private',
            description: 'Your documents are processed securely. Only you have access to your notes and conversations.'
        }
    ];

    const steps = [
        {
            number: '01',
            title: 'Create an Account',
            description: 'Sign up in seconds with just your email and password.'
        },
        {
            number: '02',
            title: 'Upload Your Documents',
            description: 'Upload PDFs, Word docs, or text files containing your notes, research, or any content.'
        },
        {
            number: '03',
            title: 'Start Chatting',
            description: 'Ask questions about your documents and get AI-powered answers instantly.'
        }
    ];

    return (
        <div className="landing-page">
            {/* Hero Section */}
            <section className="hero-section">
                <div className="hero-content">
                    <div className="hero-badge">
                        <Sparkles className="badge-icon" />
                        <span>Powered by Advanced AI</span>
                    </div>
                    <h1 className="hero-title">
                        Chat with Your Documents
                        <span className="hero-title-gradient"> Using AI</span>
                    </h1>
                    <p className="hero-subtitle">
                        Upload your notes, research papers, or any documents and have intelligent conversations with them. 
                        DocPal's AI agent first searches your local content, and when that's not enough, 
                        automatically fetches information from the web to combine both local and global context for the best possible answers.
                    </p>
                    <div className="hero-actions">
                        <Button 
                            className="hero-btn-primary"
                            onClick={() => navigate('/register')}
                        >
                            Get Started Free
                            <ArrowRight className="btn-icon" />
                        </Button>
                        <Button 
                            variant="outline"
                            className="hero-btn-secondary"
                            onClick={() => navigate('/login')}
                        >
                            Sign In
                        </Button>
                    </div>
                    <div className="hero-stats">
                        <div className="stat">
                            <span className="stat-value">100%</span>
                            <span className="stat-label">Free to Use</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat">
                            <span className="stat-value">PDF, DOCX, TXT</span>
                            <span className="stat-label">Supported Formats</span>
                        </div>
                        <div className="stat-divider"></div>
                        <div className="stat">
                            <span className="stat-value">AI-Powered</span>
                            <span className="stat-label">Smart Responses</span>
                        </div>
                    </div>
                </div>
                <div className="hero-visual">
                    <div className="hero-card">
                        <div className="hero-card-header">
                            <FileText className="hero-card-icon" />
                            <span>Research Notes.pdf</span>
                        </div>
                        <div className="hero-card-chat">
                            <div className="chat-bubble user">
                                What are the latest developments related to my research topic?
                            </div>
                            <div className="chat-bubble assistant">
                                <Sparkles className="sparkle-icon" />
                                Based on your document and web search, the key developments include...
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="features-section">
                <div className="section-header">
                    <h2 className="section-title">Powerful Features</h2>
                    <p className="section-subtitle">
                        Everything you need to interact with your documents intelligently
                    </p>
                </div>
                <div className="features-grid">
                    {features.map((feature, index) => (
                        <div key={index} className="feature-card">
                            <div className="feature-icon-wrapper">
                                {feature.icon}
                            </div>
                            <h3 className="feature-title">{feature.title}</h3>
                            <p className="feature-description">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* How It Works Section */}
            <section className="how-it-works-section">
                <div className="section-header">
                    <h2 className="section-title">How It Works</h2>
                    <p className="section-subtitle">
                        Get started in three simple steps
                    </p>
                </div>
                <div className="steps-container">
                    {steps.map((step, index) => (
                        <div key={index} className="step-card">
                            <div className="step-number">{step.number}</div>
                            <h3 className="step-title">{step.title}</h3>
                            <p className="step-description">{step.description}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="cta-section">
                <div className="cta-content">
                    <h2 className="cta-title">Ready to Get Started?</h2>
                    <p className="cta-subtitle">
                        Join now and start having intelligent conversations with your documents.
                    </p>
                    <Button 
                        className="cta-btn"
                        onClick={() => navigate('/register')}
                    >
                        Create Free Account
                        <ArrowRight className="btn-icon" />
                    </Button>
                </div>
            </section>

          
        </div>
    );
};

export default Landing;
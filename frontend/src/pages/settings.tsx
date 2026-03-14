import { useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { getApiKeys, saveApiKeys, deleteApiKeys } from '../services/api';
import { getUserId } from '../utils/userStorage';
import { useToast } from '../components/ui/toast';
import { ConfirmModal } from '../components/ui/confirm-modal';
import { Eye, EyeOff, Trash2, Save, CheckCircle, Circle, Server } from 'lucide-react';
import '../styles/settings.css';

const Settings = () => {
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [hasApiKeys, setHasApiKeys] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const [groqKey, setGroqKey] = useState('');
    const [showGroqKey, setShowGroqKey] = useState(false);

    const [geminiKey, setGeminiKey] = useState('');
    const [showGeminiKey, setShowGeminiKey] = useState(false);

    const [serperKey, setSerperKey] = useState('');
    const [showSerperKey, setShowSerperKey] = useState(false);

    const [pineconeKey, setPineconeKey] = useState('');
    const [showPineconeKey, setShowPineconeKey] = useState(false);
    const [pineconeIndex, setPineconeIndex] = useState('');

    const [status, setStatus] = useState({
        hasGroq: false,
        hasGemini: false,
        hasSerper: false,
        hasPinecone: false,
        serverHasGroq: false,
        serverHasGemini: false,
        serverHasSerper: false,
    });

    useEffect(() => { fetchSettings(); }, []);

    const fetchSettings = async () => {
        try {
            const userId = getUserId();
            const response = await getApiKeys(userId);
            const k = response.apiKeys;
            setHasApiKeys(response.hasApiKeys);
            setStatus({
                hasGroq: k.hasGroq,
                hasGemini: k.hasGemini,
                hasSerper: k.hasSerper,
                hasPinecone: k.hasPinecone,
                serverHasGroq: k.serverHasGroq,
                serverHasGemini: k.serverHasGemini,
                serverHasSerper: k.serverHasSerper,
            });
            if (k.pineconeIndex) setPineconeIndex(k.pineconeIndex);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        const serverCoversLlm = status.serverHasGroq || status.serverHasGemini;
        const serverCoversSerper = status.serverHasSerper;
        if (!groqKey && !geminiKey && !serperKey && !pineconeKey && !pineconeIndex) {
            if (!serverCoversLlm && !serverCoversSerper) {
                toast.warning('Enter at least one value to save');
                return;
            }
            // Server already covers LLM/Serper — nothing to save
            toast.warning('Nothing new to save — server already provides the AI keys');
            return;
        }
        setSaving(true);
        try {
            const userId = getUserId();
            await saveApiKeys(userId, {
                groqKey:      groqKey      || undefined,
                geminiKey:    geminiKey    || undefined,
                serperKey:    serperKey    || undefined,
                pineconeKey:  pineconeKey  || undefined,
                pineconeIndex: pineconeIndex || undefined,
            });
            toast.success('Settings saved');
            setGroqKey('');
            setGeminiKey('');
            setSerperKey('');
            setPineconeKey('');
            fetchSettings();
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to save');
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            await deleteApiKeys(getUserId());
            toast.success('All keys deleted');
            setHasApiKeys(false);
            setStatus(s => ({ ...s, hasGroq: false, hasGemini: false, hasSerper: false, hasPinecone: false }));
            setPineconeIndex('');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to delete');
        } finally {
            setShowDeleteModal(false);
        }
    };

    if (loading) {
        return (
            <div className="settings-page">
                <div className="settings-loading">
                    <div className="loading-spinner" />
                    <p>Loading…</p>
                </div>
            </div>
        );
    }

    return (
        <div className="settings-page">
            <div className="settings-container">

                <div className="settings-header">
                    <h1 className="settings-title">Settings</h1>
                    <p className="settings-subtitle">Manage your API keys</p>
                </div>

                {/* Status row */}
                <div className="status-row">
                    <StatusDot label="Groq"     active={status.hasGroq || status.serverHasGroq}     note={status.serverHasGroq ? 'Server key' : status.hasGroq ? 'Your key' : 'Not set'} />
                    <StatusDot label="Gemini"   active={status.hasGemini || status.serverHasGemini}   note={status.serverHasGemini ? 'Server key' : status.hasGemini ? 'Your key' : 'Not set'} />
                    <StatusDot label="Serper"   active={status.hasSerper || status.serverHasSerper}   note={status.serverHasSerper ? 'Server key' : status.hasSerper ? 'Your key' : 'Not set'} />
                    <StatusDot label="Pinecone" active={status.hasPinecone} note={status.hasPinecone ? 'Configured' : 'Not set'} />
                </div>

                {/* LLM keys */}
                <section className="settings-section">
                    <h2 className="section-title">AI Model Keys</h2>
                    <p className="section-desc">
                        {(status.serverHasGroq || status.serverHasGemini)
                            ? 'The server already has AI keys configured — chat works without adding your own. You can still override with your own keys below.'
                            : 'Add one or both. Groq is used first when available; Gemini is the fallback.'}
                    </p>
                    <div className="settings-row">
                        <div className="settings-field">
                            <label className="field-label">
                                Groq API Key
                                {status.serverHasGroq
                                    ? <span className="server-badge"><Server size={11} /> Server key</span>
                                    : status.hasGroq && <span className="saved-badge"><CheckCircle size={11} /> Saved</span>}
                            </label>
                            <div className="field-input-wrap">
                                <Input
                                    type={showGroqKey ? 'text' : 'password'}
                                    placeholder={status.serverHasGroq ? 'Override server key (optional)' : status.hasGroq ? '••••••••  (leave blank to keep)' : 'gsk_...'}
                                    value={groqKey}
                                    onChange={e => setGroqKey(e.target.value)}
                                />
                                <button className="eye-btn" type="button" onClick={() => setShowGroqKey(v => !v)}>
                                    {showGroqKey ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            <p className="field-hint">
                                <a href="https://console.groq.com/keys" target="_blank" rel="noopener noreferrer">console.groq.com →</a> Free tier available
                            </p>
                        </div>
                        <div className="settings-field">
                            <label className="field-label">
                                Gemini API Key
                                {status.serverHasGemini
                                    ? <span className="server-badge"><Server size={11} /> Server key</span>
                                    : status.hasGemini && <span className="saved-badge"><CheckCircle size={11} /> Saved</span>}
                            </label>
                            <div className="field-input-wrap">
                                <Input
                                    type={showGeminiKey ? 'text' : 'password'}
                                    placeholder={status.serverHasGemini ? 'Override server key (optional)' : status.hasGemini ? '••••••••  (leave blank to keep)' : 'AIza...'}
                                    value={geminiKey}
                                    onChange={e => setGeminiKey(e.target.value)}
                                />
                                <button className="eye-btn" type="button" onClick={() => setShowGeminiKey(v => !v)}>
                                    {showGeminiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            <p className="field-hint">
                                <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">aistudio.google.com →</a> Free tier available
                            </p>
                        </div>
                    </div>
                </section>

                {/* Tooling section */}
                <section className="settings-section">
                    <h2 className="section-title">Web Search &amp; Vector Store</h2>
                    <div className="settings-field">
                        <label className="field-label">
                            Serper API Key
                            {status.serverHasSerper
                                ? <span className="server-badge"><Server size={11} /> Server key</span>
                                : status.hasSerper && <span className="saved-badge"><CheckCircle size={11} /> Saved</span>}
                        </label>
                        <div className="field-input-wrap">
                            <Input
                                type={showSerperKey ? 'text' : 'password'}
                                placeholder={status.serverHasSerper ? 'Override server key (optional)' : status.hasSerper ? '••••••••  (leave blank to keep)' : 'Your Serper key'}
                                value={serperKey}
                                onChange={e => setSerperKey(e.target.value)}
                            />
                            <button className="eye-btn" type="button" onClick={() => setShowSerperKey(v => !v)}>
                                {showSerperKey ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                        </div>
                        <p className="field-hint"><a href="https://serper.dev" target="_blank" rel="noopener noreferrer">serper.dev →</a> 2 500 free searches/month</p>
                    </div>

                    <div className="settings-row mt-5">
                        <div className="settings-field">
                            <label className="field-label">
                                Pinecone API Key
                                {status.hasPinecone && <span className="saved-badge"><CheckCircle size={11} /> Saved</span>}
                            </label>
                            <div className="field-input-wrap">
                                <Input
                                    type={showPineconeKey ? 'text' : 'password'}
                                    placeholder={status.hasPinecone ? '••••••••  (leave blank to keep)' : 'Your Pinecone key'}
                                    value={pineconeKey}
                                    onChange={e => setPineconeKey(e.target.value)}
                                />
                                <button className="eye-btn" type="button" onClick={() => setShowPineconeKey(v => !v)}>
                                    {showPineconeKey ? <EyeOff size={15} /> : <Eye size={15} />}
                                </button>
                            </div>
                            <p className="field-hint"><a href="https://app.pinecone.io" target="_blank" rel="noopener noreferrer">app.pinecone.io →</a></p>
                        </div>
                        <div className="settings-field">
                            <label className="field-label">Pinecone Index Name</label>
                            <Input
                                type="text"
                                placeholder="e.g., docpal-index"
                                value={pineconeIndex}
                                onChange={e => setPineconeIndex(e.target.value)}
                            />
                            <p className="field-hint">The index where your document embeddings are stored</p>
                        </div>
                    </div>
                </section>

                {/* Actions */}
                <div className="settings-actions">
                    <Button className="save-btn cursor-pointer" onClick={handleSave} disabled={saving}>
                        {saving
                            ? <><span className="loading-spinner-sm" />Saving…</>
                            : <><Save size={15} />Save</>}
                    </Button>
                    {hasApiKeys && (
                        <Button variant="outline" className="delete-keys-btn cursor-pointer" onClick={() => setShowDeleteModal(true)}>
                            <Trash2 size={15} />
                            Delete all keys
                        </Button>
                    )}
                </div>

            </div>

            <ConfirmModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={handleDelete}
                title="Delete All API Keys"
                message="This will remove all stored keys. You won't be able to chat until you add new ones."
                confirmText="Delete"
                cancelText="Cancel"
                variant="danger"
            />
        </div>
    );
};

function StatusDot({ label, active, note }: { label: string; active: boolean; note?: string }) {
    return (
        <div className={`status-dot-item ${active ? 'status-dot-active' : 'status-dot-missing'}`}>
            {active ? <CheckCircle size={14} /> : <Circle size={14} />}
            <span className="status-dot-label">{label}</span>
            {note && <span className="status-dot-note">{note}</span>}
        </div>
    );
}

export default Settings;

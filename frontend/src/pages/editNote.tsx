import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router"
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { ArrowLeft, Save, X, FileText } from "lucide-react";
import useStore from "../store/store";
import "../styles/editNote.css";

interface noteData {
    title: string;
    content: string;
}

const EditNote = () => {
    const { noteId } = useParams<{ noteId: string }>();
    const navigate = useNavigate();
    const { isEditEnabled, disableEdit } = useStore();
    const [noteData, setNoteData] = useState<noteData>({ title: "", content: "" });
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    useEffect(() => {
        fetchData();
        if (isEditEnabled) {
            setIsEditing(true);
        }
    }, [noteId, isEditEnabled]);

    const fetchData = async () => {
        try {
            const simulatedData = {
                title: `Note ${noteId}`,
                content: "This is the content of your note. Click Edit to modify it."
            };
            setNoteData(simulatedData);
        } catch (error) {
            console.error("Error fetching note data:", error);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            console.log("Saving note:", noteData);
            await new Promise(resolve => setTimeout(resolve, 500));
            setIsEditing(false);
            setHasChanges(false);
        } catch (error) {
            console.error("Error saving note:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        disableEdit();
        fetchData();
        setHasChanges(false);
    };

    const handleChange = (field: keyof noteData, value: string) => {
        setNoteData(prev => ({ ...prev, [field]: value }));
        setHasChanges(true);
    };

    return (
        <div className="edit-note-container">
            <div className="edit-note-header">
                <Button
                    variant="ghost"
                    className="back-button cursor-pointer"
                    onClick={() => navigate('/notes')}
                >
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div className="header-content">
                    <div className="header-title-section">
                        <FileText className="header-icon" />
                        <h1 className="edit-note-title">
                            {isEditing ? 'Edit Note' : 'View Note'}
                        </h1>
                    </div>
                    {hasChanges && (
                        <span className="unsaved-badge">Unsaved changes</span>
                    )}
                </div>
                <div className="header-actions">
                    {!isEditing ? (
                        <Button
                            className="edit-button cursor-pointer"
                            onClick={() => setIsEditing(true)}
                        >
                            <FileText className="w-4 h-4 mr-2" />
                            Edit
                        </Button>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                className="cancel-button cursor-pointer"
                                onClick={handleCancel}
                                disabled={isSaving}
                            >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                            </Button>
                            <Button
                                className="save-button cursor-pointer"
                                onClick={handleSave}
                                disabled={!hasChanges || isSaving}
                            >
                                <Save className="w-4 h-4 mr-2" />
                                {isSaving ? 'Saving...' : 'Save'}
                            </Button>
                        </>
                    )}
                </div>
            </div>

            <div className={`edit-note-content ${isEditing ? 'editing-mode' : ''}`}>
                <div className="note-form">
                    <div className="form-group title-section">
                        <div className="title-wrapper">
                            <div className="title-field">
                                <Label htmlFor="title" className="form-label">
                                    Title
                                </Label>
                                {isEditing ? (
                                    <Input
                                        id="title"
                                        type="text"
                                        value={noteData.title}
                                        onChange={(e) => handleChange('title', e.target.value)}
                                        className="title-input"
                                        placeholder="Enter note title..."
                                    />
                                ) : (
                                    <div className="title-display">{noteData.title}</div>
                                )}
                            </div>
                            <div className="title-meta">
                                <div className="meta-item">
                                    <span className="meta-label">ID:</span>
                                    <span className="meta-value">{noteId}</span>
                                </div>
                                <div className="meta-item">
                                    <span className="meta-label">Status:</span>
                                    <span className="meta-value status-active">Active</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="form-group">
                        <Label htmlFor="content" className="form-label">
                            Content
                        </Label>
                        {isEditing ? (
                            <textarea
                                id="content"
                                value={noteData.content}
                                onChange={(e) => handleChange('content', e.target.value)}
                                className="content-textarea"
                                placeholder="Enter note content..."
                            />
                        ) : (
                            <div className="content-display">{noteData.content}</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EditNote;
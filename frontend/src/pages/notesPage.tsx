import { Button } from "../components/ui/button";
import { ChevronDown, ChevronUp, Eye, MessageCircleMore, SquarePen, Trash2, Plus, FileText, AlertCircle, Loader2, Calendar, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import "../styles/notes.css"
import { useNavigate } from "react-router";
import useStore from "../store/store";
import { getNotes, deleteNote, type Note } from "../services/api";
import { getUserId } from "../utils/userStorage";
import { useToast } from "../components/ui/toast";
import { ConfirmModal } from "../components/ui/confirm-modal";

function NotesPage() {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; noteId: string; noteTitle: string }>({
    isOpen: false,
    noteId: '',
    noteTitle: ''
  });
  const navigate = useNavigate();
  const { enableEdit, disableEdit } = useStore();
  const toast = useToast();

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      const userId = getUserId();
      const fetchedNotes = await getNotes(userId);
      setNotes(fetchedNotes);
      setError(null);
    } catch (err: any) {
      console.error('Error fetching notes:', err);
      setError(err.response?.data?.message || 'Failed to load notes');
    } finally {
      setLoading(false);
    }
  };

  const openDeleteModal = (noteId: string, noteTitle: string) => {
    setDeleteModal({ isOpen: true, noteId, noteTitle });
  };

  const closeDeleteModal = () => {
    setDeleteModal({ isOpen: false, noteId: '', noteTitle: '' });
  };

  const handleDelete = async () => {
    const { noteId, noteTitle } = deleteModal;
    
    setDeletingNoteId(noteId);
    closeDeleteModal();

    try {
      const userId = getUserId();
      await deleteNote(noteId, userId);
      setNotes(notes.filter(note => note._id !== noteId));
      toast.success(`"${noteTitle}" has been deleted successfully`);
    } catch (err: any) {
      console.error('Error deleting note:', err);
      toast.error(err.response?.data?.message || 'Failed to delete note');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const toggleDetails = (id: string) => {
    setExpandedNotes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="notes-page">
      <div className="page-header">
        <div className="page-header-content">
          <h1 className="page-title">Your Notes</h1>
          <p className="page-subtitle">Manage and organize your documents</p>
        </div>
        <div className="page-header-actions">
          <button 
            className="add-note-btn"
            onClick={() => navigate('/option')}
          >
            <Plus className="w-5 h-5" />
            Add Note
          </button>
        </div>
      </div>
      
      {loading && (
        <div className="loading-state">
          <div className="loading-spinner"></div>
          <p style={{ marginTop: '1rem', color: 'var(--color-text-secondary)' }}>Loading notes...</p>
        </div>
      )}

      {error && (
        <div className="error-state">
          <AlertCircle className="error-state-icon" />
          <p className="error-state-text">Error: {error}</p>
          <Button onClick={fetchNotes}>Retry</Button>
        </div>
      )}

      {!loading && !error && notes.length === 0 && (
        <div className="empty-state">
          <FileText className="empty-state-icon" />
          <h3 className="empty-state-title">No notes yet</h3>
          <p className="empty-state-text">Upload your first document to get started</p>
          <Button onClick={() => navigate('/option')} className="add-note-btn">
            <Plus className="w-5 h-5" />
            Upload Note
          </Button>
        </div>
      )}
      
      {!loading && !error && notes.length > 0 && (
        <div className="notes">
          {notes.map((note) => {
            const isExpanded = expandedNotes.has(note._id);
            const isDeleting = deletingNoteId === note._id;
            
            return (
              <div key={note._id} className={`note-card ${isDeleting ? 'note-card-deleting' : ''}`}>
                <div className="note-card-content">
                  <h2 className="text-xl font-semibold mb-2">{note.title}</h2>
                  
                  {/* Creation Date/Time */}
                  <div className="note-card-meta">
                    <span className="note-meta-item">
                      <Calendar className="w-4 h-4" />
                      {formatDate(note.metaData.uploadedOn)}
                    </span>
                    <span className="note-meta-item">
                      <Clock className="w-4 h-4" />
                      {formatTime(note.metaData.uploadedOn)}
                    </span>
                  </div>
                  
                  {isExpanded && (
                    <ul className="metadata-list">
                      <li><strong>File Pages:</strong> {note.metaData.filePages}</li>
                      <li><strong>File Size:</strong> {note.metaData.fileSize}</li>
                      <li><strong>File Type:</strong> {note.metaData.fileType.toUpperCase()}</li>
                      <li><strong>Uploaded On:</strong> {new Date(note.metaData.uploadedOn).toLocaleDateString()}</li>
                      <li><strong>Text Length:</strong> {note.metaData.textLength.toLocaleString()} characters</li>
                    </ul>
                  )}
                </div>
                
                <div className="note-card-actions">
                  <Button 
                    className="cursor-pointer details-btn"
                    onClick={() => toggleDetails(note._id)}
                    variant="outline"
                    title={isExpanded ? "Hide note details" : "Show note details"}
                  >
                    {isExpanded ? (
                      <>
                        <ChevronUp className="h-4 w-4" />
                        <span className="ml-2">Hide</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="h-4 w-4" />
                        <span className="ml-2">Details</span>
                      </>
                    )}
                  </Button>
                  <Button 
                    className="icon-button view-btn cursor-pointer"
                    variant="outline"
                    title="View note content"
                    onClick={() => {
                      disableEdit();
                      navigate(`${note._id}`);
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button 
                    className="icon-button delete-btn cursor-pointer" 
                    variant="outline"
                    title="Delete this note"
                    onClick={() => openDeleteModal(note._id, note.title)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                  <Button 
                    onClick={() => {
                      enableEdit();
                      navigate(`${note._id}`);
                    }}
                    className="icon-button edit-btn cursor-pointer" 
                    variant="outline"
                    title="Edit note details"
                  >
                    <SquarePen className="h-4 w-4" />
                  </Button>
                  <Button 
                    className="icon-button chat-btn cursor-pointer" 
                    variant="outline"
                    title="Start a chat with this note"
                    onClick={()=>navigate(`chat/${note._id}`)}
                  >
                    <MessageCircleMore className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={closeDeleteModal}
        onConfirm={handleDelete}
        title="Delete Note"
        message={
          <>
            Are you sure you want to delete <strong>"{deleteModal.noteTitle}"</strong>? 
            This action cannot be undone and all associated data will be permanently removed.
          </>
        }
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
      />
    </div>
  )
}

export default NotesPage;
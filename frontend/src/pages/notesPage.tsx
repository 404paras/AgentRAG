import { Button } from "../components/ui/button";
import { ChevronDown, ChevronUp, Eye, MessageCircleMore, SquarePen, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import "../styles/notes.css"
import { useNavigate } from "react-router";
import useStore from "../store/store";
import { getNotes, deleteNote, type Note } from "../services/api";
import { getUserId } from "../utils/userStorage";

function NotesPage() {
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { enableEdit, disableEdit } = useStore();

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

  const handleDelete = async (noteId: string, noteTitle: string) => {
    if (!confirm(`Are you sure you want to delete "${noteTitle}"?`)) {
      return;
    }

    try {
      const userId = getUserId();
      await deleteNote(noteId, userId);
      // Remove note from local state
      setNotes(notes.filter(note => note._id !== noteId));
      alert('Note deleted successfully');
    } catch (err: any) {
      console.error('Error deleting note:', err);
      alert(err.response?.data?.message || 'Failed to delete note');
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Your Notes</h1>
        <p className="page-subtitle">Manage and organize your documents</p>
      </div>
      
      {loading && (
        <div className="text-center py-10">
          <p>Loading notes...</p>
        </div>
      )}

      {error && (
        <div className="text-center py-10 text-red-600">
          <p>Error: {error}</p>
          <Button onClick={fetchNotes} className="mt-4">Retry</Button>
        </div>
      )}

      {!loading && !error && notes.length === 0 && (
        <div className="text-center py-10">
          <p>No notes yet. Upload your first document!</p>
          <Button onClick={() => navigate('/option')} className="mt-4">Upload Note</Button>
        </div>
      )}
      
      <div className="notes">
        {notes.map((note) => {
          const isExpanded = expandedNotes.has(note._id);
          
          return (
            <div key={note._id} className="note-card">
              <div className="note-card-content">
                <h2 className="text-xl font-semibold mb-2">{note.title}</h2>
                
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
                  onClick={() => handleDelete(note._id, note.title)}
                >
                  <Trash2 className="h-4 w-4" />
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
    </div>
  )
}

export default NotesPage;
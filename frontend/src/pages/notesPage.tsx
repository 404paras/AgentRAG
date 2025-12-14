import { Button } from "../components/ui/button";
import { ChevronDown, ChevronUp, Eye, MessageCircleMore, SquarePen, Trash2 } from "lucide-react";
import { useState } from "react";
import "../styles/notes.css"
import { useNavigate } from "react-router";
import useStore from "../store/store";

function NotesPage() {
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());
  const navigate = useNavigate();
  const { enableEdit, disableEdit } = useStore();
  
  const notes = [
    {id:1,title:"Note1",metadata:{
      filePages:10,
      fileSize:"2MB",
      fileType:"pdf",
      uploadedOn:"2024-06-01",
      textLength:5000
    }
  },
    {id:2,title:"Note2",metadata:{
      filePages:5,
      fileSize:"1MB",
      fileType:"docx",
      uploadedOn:"2024-06-05",
      textLength:2500
    }
  } ,
    {
      id:3,title:"Note3",metadata:{
        filePages:20,
        fileSize:"3MB",
        fileType:"txt",
        uploadedOn:"2024-06-10",
        textLength:8000
      }
    },
    { id:4,title:"Note4",metadata:{
      filePages:15,
      fileSize:"2.5MB",
      fileType:"pdf",
      uploadedOn:"2024-06-12",
      textLength:6000
    }
  },
  {
    id:5,title:"Note5",metadata:{
      filePages:8,
      fileSize:"1.5MB",
      fileType:"doc",
      uploadedOn:"2024-06-15",
      textLength:4000
    }
  }
  ]

  const toggleDetails = (id: number) => {
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
      
      <div className="notes">
        {notes.map((note) => {
          const isExpanded = expandedNotes.has(note.id);
          
          return (
            <div key={note.id} className="note-card">
              <div className="note-card-content">
                <h2 className="text-xl font-semibold mb-2">{note.title}</h2>
                
                {isExpanded && (
                  <ul className="metadata-list">
                    <li><strong>File Pages:</strong> {note.metadata.filePages}</li>
                    <li><strong>File Size:</strong> {note.metadata.fileSize}</li>
                    <li><strong>File Type:</strong> {note.metadata.fileType.toUpperCase()}</li>
                    <li><strong>Uploaded On:</strong> {note.metadata.uploadedOn}</li>
                    <li><strong>Text Length:</strong> {note.metadata.textLength.toLocaleString()} characters</li>
                  </ul>
                )}
              </div>
              
              <div className="note-card-actions">
                <Button 
                  className="cursor-pointer details-btn"
                  onClick={() => toggleDetails(note.id)}
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
                    navigate(`${note.id}`);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button 
                  className="icon-button delete-btn cursor-pointer" 
                  variant="outline"
                  title="Delete this note"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <Button 
                  onClick={() => {
                    enableEdit();
                    navigate(`${note.id}`);
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
                  onClick={()=>navigate(`chat/${note.id}`)}
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
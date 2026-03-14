import { useNavigate } from "react-router-dom";
import { uploadNoteFile } from "../services/api";
import { getUserId } from "../utils/userStorage";
import { useToast } from "../components/ui/toast";
import { Input } from "../components/ui/input";
import { UploadCloud, MessageSquare, FileText, ArrowRight, Loader2 } from "lucide-react";
import "../styles/option.css";
import { useState } from "react";

const Option = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [noteTitle, setNoteTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setSelectedFile(file);
  };

  const handleFileUpload = async () => {
    if (!noteTitle.trim()) {
      toast.warning("Please enter a note title");
      return;
    }
    if (!selectedFile) {
      toast.warning("Please select a file to upload");
      return;
    }
    setIsUploading(true);
    try {
      const userId = getUserId();
      const response = await uploadNoteFile(userId, noteTitle, selectedFile);
      toast.success(`"${response.note?.title ?? noteTitle}" created successfully`);
      setNoteTitle("");
      setSelectedFile(null);
      const fileInput = document.getElementById("file-upload") as HTMLInputElement;
      if (fileInput) fileInput.value = "";
      navigate("/notes");
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Failed to create note. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="dashboard-inner">

        {/* Hero */}
        <div className="dashboard-hero">
          <h1 className="dashboard-title">DocPal</h1>
          <p className="dashboard-subtitle">Upload documents and chat with your notes using AI</p>
        </div>

        <div className="dashboard-grid">

          {/* Upload card */}
          <div className="dash-card">
            <div className="dash-card-icon dash-card-icon--blue">
              <UploadCloud size={22} />
            </div>
            <h2 className="dash-card-title">Upload a Document</h2>
            <p className="dash-card-desc">
              Turn a PDF, Word doc, or text file into a searchable note collection.
            </p>

            <div className="dash-fields">
              <div className="dash-field">
                <label className="dash-label">Note title</label>
                <Input
                  type="text"
                  placeholder="e.g., Machine Learning Notes"
                  value={noteTitle}
                  onChange={(e) => setNoteTitle(e.target.value)}
                  className="dash-input"
                />
              </div>

              <div className="dash-field">
                <label className="dash-label">File</label>
                <label className="file-drop-zone" htmlFor="file-upload">
                  {selectedFile ? (
                    <span className="file-drop-selected">
                      <FileText size={15} />
                      {selectedFile.name}
                      <span className="file-drop-size">
                        ({(selectedFile.size / 1024).toFixed(0)} KB)
                      </span>
                    </span>
                  ) : (
                    <span className="file-drop-placeholder">
                      <UploadCloud size={18} />
                      Click to choose a file
                      <span className="file-drop-hint">PDF, DOCX, TXT up to 10 MB</span>
                    </span>
                  )}
                  <input
                    id="file-upload"
                    type="file"
                    accept=".txt,.pdf,.doc,.docx"
                    className="file-input-hidden"
                    onChange={handleFileChange}
                  />
                </label>
              </div>
            </div>

            <button
              className="dash-btn dash-btn--blue"
              onClick={handleFileUpload}
              disabled={isUploading || !noteTitle.trim() || !selectedFile}
            >
              {isUploading ? (
                <><Loader2 size={16} className="spin" /> Uploading…</>
              ) : (
                <>Upload &amp; Create Note <ArrowRight size={16} /></>
              )}
            </button>
          </div>

          {/* Chat card */}
          <div className="dash-card">
            <div className="dash-card-icon dash-card-icon--indigo">
              <MessageSquare size={22} />
            </div>
            <h2 className="dash-card-title">Chat with Notes</h2>
            <p className="dash-card-desc">
              Pick an existing note collection and ask the AI anything about it.
            </p>

            <ul className="dash-feature-list">
              <li><span className="dash-feature-dot" /> Context-aware answers from your documents</li>
              <li><span className="dash-feature-dot" /> Web search fallback when docs don't have the answer</li>
              <li><span className="dash-feature-dot" /> Full chat history saved per session</li>
            </ul>

            <button
              className="dash-btn dash-btn--indigo"
              onClick={() => navigate("/notes")}
            >
              Browse Notes <ArrowRight size={16} />
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Option;

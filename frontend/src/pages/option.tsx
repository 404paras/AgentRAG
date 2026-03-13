import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
import { uploadNoteFile } from "../services/api";
import { getUserId } from "../utils/userStorage";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import "../styles/option.css";
import { useState } from "react";
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

const Option = () => {
  const navigate = useNavigate();
  const [noteTitle, setNoteTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [extractedText, setExtractedText] = useState("");
   
  const startChatHandler = () => {
    navigate("/notes");
  }

  const extractTextFromPDF = async (file: File): Promise<string> => {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ');
        fullText += pageText + '\n';
      }

      console.log(fullText);
      
      return fullText;
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      throw new Error('Failed to extract text from PDF');
    }
  };

  const extractTextFromTXT = async (file: File): Promise<string> => {
    return await file.text();
  };

  const extractTextFromDOC = async (file: File): Promise<string> => {
    // For DOC/DOCX, we'll send to backend for processing
    // Client-side DOC parsing is complex and requires large libraries
    return `[DOC file: ${file.name} - will be processed by backend]`;
  };

  const extractTextFromFile = async (file: File): Promise<string> => {
    const fileType = file.type;
    const fileName = file.name.toLowerCase();

    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) {
      return await extractTextFromPDF(file);
    } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
      return await extractTextFromTXT(file);
    } else if (
      fileName.endsWith('.doc') || 
      fileName.endsWith('.docx') ||
      fileType === 'application/msword' ||
      fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ) {
      return await extractTextFromDOC(file);
    } else {
      throw new Error('Unsupported file type');
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      console.log("Selected file:", file);
      console.log("File name:", file.name);
      console.log("File size:", file.size);
      console.log("File type:", file.type);

      // Extract text immediately on file selection
      try {
        setIsUploading(true);
        const text = await extractTextFromFile(file);
        setExtractedText(text);
        console.log("Extracted text length:", text.length);
        console.log("Preview:", text.substring(0, 200));
      } catch (error) {
        console.error("Error extracting text:", error);
        alert("Failed to extract text from file. Please try another file.");
        setSelectedFile(null);
        setExtractedText("");
        e.target.value = '';
      } finally {
        setIsUploading(false);
      }
    }
  }

  const handleFileUpload = async () => {
    if (!noteTitle.trim()) {
      alert("Please enter a note title");
      return;
    }

    if (!selectedFile) {
      alert("Please select a file to upload");
      return;
    }

    if (!extractedText) {
      alert("No text could be extracted from the file");
      return;
    }

    setIsUploading(true);

    try {
      const userId = getUserId();
      
      // Upload file via API
      const response = await uploadNoteFile(userId, noteTitle, selectedFile);
      
      console.log("Note created successfully!", response);
      alert(`Note "${noteTitle}" created successfully!`);
      
      // Reset form
      setNoteTitle("");
      setSelectedFile(null);
      setExtractedText("");
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      // Navigate to notes page
      navigate("/notes");
      
    } catch (error: any) {
      console.error("Upload error:", error);
      alert(error.response?.data?.message || "Failed to create note. Please try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="page-background">
      <div className="w-full max-w-6xl">
     
        <div className="title text-center">
          <h1 className="page-title-text">
            Welcome to AgentRAG
          </h1>
          <p className="page-subtitle-text">
            Upload your notes or chat with existing collections
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 max-w-6xl mx-auto">
          
          <Card className="card upload-card w-full hover:shadow-2xl transition-all duration-300">
            <CardHeader className="space-y-2 pb-6 pt-8 px-8">
             <div className="header">
                
                <div className="icon-container-blue">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                </div>
              <CardTitle className="card-title text-2xl font-bold pt-2">Upload Notes</CardTitle>
            </div>

              <CardDescription className="text-base pt-2">
                Upload your documents to create a new searchable note collection
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-6">
              <div className="flex flex-col gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="note-title" className="input-label">
                    Note Title
                  </Label>
                  <Input
                    id="note-title"
                    type="text"
                    placeholder="e.g., Machine Learning Notes"
                    className="card-input styled-input h-12 px-4"
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="file-upload" className="input-label">
                    Upload Document
                  </Label>
                  <div className="relative">
                    <Input
                      id="file-upload"
                      type="file"
                      accept=".txt,.pdf,.doc,.docx"
                      className="card-input file-input h-12 cursor-pointer file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold px-4"
                      onChange={handleFileChange}
                      required
                    />
                  </div>
                  {selectedFile && (
                    <div className="text-sm">
                      <p className="text-gray-700 font-medium">
                        Selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
                      </p>
                      {extractedText && (
                        <p className="text-green-600 mt-1">
                          ✓ Extracted {extractedText.length} characters
                        </p>
                      )}
                    </div>
                  )}
                  <p className="helper-text">
                    Supported formats: TXT, PDF, DOC, DOCX
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-6 px-8 pb-8">
              <Button 
                className="upload-button cursor-pointer" 
                onClick={handleFileUpload}
                disabled={isUploading || !noteTitle.trim() || !selectedFile}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                {isUploading ? 'Uploading...' : 'Upload & Create Note'}
              </Button>
            </CardFooter>
          </Card>

          {/* Chat with Notes Card */}
          <Card className="card chat-card w-full hover:shadow-2xl transition-all duration-300">
            <CardHeader className="space-y-2 pb-6 pt-8 px-8">
                 <div className="header">
              <div className="icon-container-purple">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <CardTitle className="card-title text-2xl font-bold">Chat with Notes</CardTitle>
              </div>
              <CardDescription className="text-base pt-2">
                Start an AI-powered conversation with your existing note collection
              </CardDescription>
            </CardHeader>
            <CardContent className="px-8 pb-6">
              <div className="flex flex-col gap-6">
                <div className="info-box">
                  <div className="flex items-start gap-4 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 icon-purple shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h4 className="info-box-title">AI-Powered Insights</h4>
                      <p className="info-box-text">
                        Choose from your existing note collections to start asking questions and get intelligent, context-aware answers powered by AI.
                      </p>
                    </div>
                  </div>
                  <div className="info-box-badge">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    Fast & Accurate Responses
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-6 px-8 pb-8">
              <Button onClick={startChatHandler} className="chat-button cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                Start Chatting
              </Button>
            </CardFooter>
          </Card>

        </div>
      </div>
    </div>
  )
}

export default Option;
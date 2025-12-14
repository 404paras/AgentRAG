import { useNavigate } from "react-router-dom";
import { Button } from "../components/ui/button";
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

const Option = () => {
  const navigate = useNavigate();
   
  const startChatHandler = () => {
    navigate("/notes");
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
                      required
                    />
                  </div>
                  <p className="helper-text">
                    Supported formats: TXT, PDF, DOC, DOCX
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-6 px-8 pb-8">
              <Button className="upload-button cursor-pointer">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                </svg>
                Upload & Create Note
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
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 icon-purple flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
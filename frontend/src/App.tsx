import { BrowserRouter as Router , Routes, Route, Navigate } from "react-router"
import Option from "./pages/option"
import NotesPage from "./pages/notesPage"
import Chat from "./pages/chat"
import EditNote from "./pages/editNote"

const App = () => {
  return (
    <Router>

<Routes>
  <Route path="/" element={<Navigate to="/option" replace />} />
  <Route path="/option" element={ <Option/>}/>
  <Route path="/notes" element={<NotesPage/>}/>
  <Route path="/notes/chat/:noteId" element={<Chat/>}/>
  <Route path="/notes/:noteId/" element={<EditNote/>}/>
</Routes>

    </Router>
  )
}

export default App
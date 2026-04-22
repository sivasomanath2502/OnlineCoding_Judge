import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import ProblemsPage from './pages/ProblemsPage'
import ProblemDetailPage from './pages/ProblemDetailPage'
import AdminPage from './pages/AdminPage'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/"               element={<ProblemsPage />} />
          <Route path="/problems/:id"   element={<ProblemDetailPage />} />
          <Route path="/admin"          element={<AdminPage />} />
        </Routes>
      </main>
    </div>
  )
}

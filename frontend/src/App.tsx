import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './pages/Home'
import TeamRegistration from './pages/TeamRegistration'
import IndividualRegistration from './pages/IndividualRegistration'
import ProjectSubmission from './pages/ProjectSubmission'
import AdminLogin from './pages/admin/AdminLogin'
import AdminDashboard from './pages/admin/AdminDashboard'
import AdminTeams from './pages/admin/AdminTeams'
import AdminIndividuals from './pages/admin/AdminIndividuals'
import AdminProjects from './pages/admin/AdminProjects'
import AdminEvaluations from './pages/admin/AdminEvaluations'
import AdminManagement from './pages/admin/AdminManagement'
import TopTeams from './pages/TopTeams'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <div className="min-h-screen">
      <div className="stars-bg"></div>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="register/team" element={<TeamRegistration />} />
          <Route path="register/individual" element={<IndividualRegistration />} />
          <Route path="project/submit" element={<ProjectSubmission />} />
          <Route path="top-teams" element={<TopTeams />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin" element={<ProtectedRoute />}>
          <Route index element={<AdminDashboard />} />
          <Route path="teams" element={<AdminTeams />} />
          <Route path="individuals" element={<AdminIndividuals />} />
          <Route path="projects" element={<AdminProjects />} />
          <Route path="evaluations" element={<AdminEvaluations />} />
          <Route path="management" element={<AdminManagement />} />
        </Route>
      </Routes>
    </div>
  )
}

export default App

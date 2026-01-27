import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  User,
  FileText,
  Star,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Shield,
} from 'lucide-react'
import Logo from './Logo'
import { adminService } from '../services/api'

const sidebarLinks = [
  { to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard },
  { to: '/admin/teams', label: 'الفرق', icon: Users },
  { to: '/admin/individuals', label: 'الأفراد', icon: User },
  { to: '/admin/projects', label: 'المشاريع', icon: FileText },
  { to: '/admin/evaluations', label: 'التقييمات', icon: Star },
]

const superAdminLink = { to: '/admin/management', label: 'إدارة الإداريين', icon: Shield }

interface AdminLayoutProps {
  children: React.ReactNode
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [isSuperAdmin, setIsSuperAdmin] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const checkSuperAdmin = async () => {
      try {
        const response = await adminService.checkSuperAdmin()
        setIsSuperAdmin(response.is_super_admin)
      } catch (error) {
        setIsSuperAdmin(false)
      }
    }
    checkSuperAdmin()
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    navigate('/admin/login')
  }

  const SidebarContent = () => (
    <>
      {/* Logo */}
      <div className="p-6 border-b border-teknofest-light-blue/20">
        <Link to="/admin" className="flex items-center gap-3">
          <Logo size="sm" />
          {sidebarOpen && (
            <div>
              <h1 className="text-lg font-bold text-white">تكنوفيست</h1>
              <p className="text-xs text-teknofest-cyan">لوحة الإدارة</p>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {sidebarLinks.map((link) => {
            const Icon = link.icon
            const isActive = location.pathname === link.to
            return (
              <li key={link.to}>
                <Link
                  to={link.to}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                    isActive
                      ? 'bg-teknofest-orange text-white'
                      : 'text-gray-300 hover:bg-teknofest-medium-blue'
                  }`}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="font-medium">{link.label}</span>}
                </Link>
              </li>
            )
          })}
          {/* Super Admin Link */}
          {isSuperAdmin && (
            <li>
              <Link
                to={superAdminLink.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  location.pathname === superAdminLink.to
                    ? 'bg-teknofest-orange text-white'
                    : 'text-gray-300 hover:bg-teknofest-medium-blue'
                }`}
              >
                <superAdminLink.icon className="w-5 h-5 flex-shrink-0" />
                {sidebarOpen && <span className="font-medium">{superAdminLink.label}</span>}
              </Link>
            </li>
          )}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-teknofest-light-blue/20">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-4 py-3 text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span className="font-medium">تسجيل الخروج</span>}
        </button>
        <Link
          to="/"
          className="flex items-center gap-3 w-full px-4 py-3 mt-2 text-teknofest-cyan hover:bg-teknofest-cyan/10 rounded-lg transition-all"
        >
          <ChevronLeft className="w-5 h-5 flex-shrink-0" />
          {sidebarOpen && <span className="font-medium">العودة للموقع</span>}
        </Link>
      </div>
    </>
  )

  return (
    <div className="min-h-screen bg-teknofest-dark-blue flex">
      {/* Desktop Sidebar */}
      <aside
        className={`hidden lg:flex flex-col bg-teknofest-blue border-l border-teknofest-light-blue/20 transition-all duration-300 ${
          sidebarOpen ? 'w-64' : 'w-20'
        }`}
      >
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute right-0 top-0 h-full w-64 bg-teknofest-blue flex flex-col">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="bg-teknofest-blue/50 backdrop-blur-md border-b border-teknofest-light-blue/20 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setMobileOpen(true)}
                className="lg:hidden p-2 rounded-lg text-gray-300 hover:bg-teknofest-medium-blue"
              >
                <Menu className="w-6 h-6" />
              </button>
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="hidden lg:block p-2 rounded-lg text-gray-300 hover:bg-teknofest-medium-blue"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <h2 className="text-xl font-bold text-white">
                {sidebarLinks.find((l) => l.to === location.pathname)?.label ||
                 (location.pathname === superAdminLink.to ? superAdminLink.label : 'لوحة التحكم')}
              </h2>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}

import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  FileText,
  Search,
  Download,
  Eye,
  Loader2,
  X,
  Star,
  CheckCircle,
  AlertCircle,
  Award,
  Image,
  FileImage,
  Paperclip,
  ExternalLink,
} from 'lucide-react'
import { projectsService, evaluationsService } from '../../services/api'
import type { ProjectSubmission } from '../../types'

export default function AdminProjects() {
  const [projects, setProjects] = useState<ProjectSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState<ProjectSubmission | null>(null)
  const [downloading, setDownloading] = useState<number | null>(null)
  const [togglingFeature, setTogglingFeature] = useState<number | null>(null)

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const data = await projectsService.getAll()
        setProjects(data)
      } catch (error) {
        toast.error('حدث خطأ في تحميل المشاريع')
      } finally {
        setLoading(false)
      }
    }

    fetchProjects()
  }, [])

  const handleToggleFeatured = async (projectId: number) => {
    setTogglingFeature(projectId)
    try {
      const result = await evaluationsService.toggleFeatured(projectId)

      // Update projects list
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId ? { ...p, is_featured: result.is_featured } : p
        )
      )

      // Update selected project if it's the same
      if (selectedProject?.id === projectId) {
        setSelectedProject((prev) =>
          prev ? { ...prev, is_featured: result.is_featured } : null
        )
      }

      toast.success(result.message)
    } catch (error) {
      toast.error('حدث خطأ في تغيير حالة التميز')
    } finally {
      setTogglingFeature(null)
    }
  }

  const filteredProjects = projects.filter(
    (project) =>
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.field.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleDownloadPdf = async (projectId: number) => {
    setDownloading(projectId)
    try {
      const blob = await projectsService.exportPdf(projectId)
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `project-${projectId}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
      toast.success('تم تحميل الملف')
    } catch (error) {
      toast.error('حدث خطأ في تحميل الملف')
    } finally {
      setDownloading(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 text-teknofest-orange animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">إدارة المشاريع</h1>
          <p className="text-gray-400">عرض ومراجعة المشاريع المقدمة</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/20 text-orange-400 rounded-lg">
          <FileText className="w-5 h-5" />
          <span className="font-medium">{projects.length} مشروع</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="البحث عن مشروع..."
          className="input-field pr-12"
        />
      </div>

      {/* Projects Grid */}
      {filteredProjects.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">لا توجد مشاريع للعرض</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProjects.map((project) => (
            <div key={project.id} className="card hover:border-teknofest-orange/50 transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      project.is_complete
                        ? 'bg-green-500/20'
                        : 'bg-gradient-to-br from-orange-500 to-red-500'
                    }`}
                  >
                    {project.is_complete ? (
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    ) : (
                      <FileText className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-bold line-clamp-1">{project.title}</h3>
                    <p className="text-gray-400 text-sm">{project.team?.team_name || `فريق ${project.team_id}`}</p>
                  </div>
                </div>
                {project.total_score && (
                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 rounded-lg">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 font-bold text-sm">
                      {project.total_score.toFixed(1)}
                    </span>
                  </div>
                )}
              </div>

              <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                {project.problem_statement}
              </p>

              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="px-2 py-1 bg-teknofest-orange/20 text-teknofest-orange rounded text-xs">
                  {project.field}
                </span>
                <span className="px-2 py-1 bg-teknofest-cyan/20 text-teknofest-cyan rounded text-xs">
                  {project.character_count} حرف
                </span>
                {project.has_attachments && (
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 rounded text-xs">
                    يحتوي مرفقات
                  </span>
                )}
                {project.is_featured && (
                  <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded text-xs flex items-center gap-1">
                    <Award className="w-3 h-3" />
                    مميز
                  </span>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <button
                  onClick={() => handleToggleFeatured(project.id!)}
                  disabled={togglingFeature === project.id}
                  className={`p-2 rounded-lg transition-colors disabled:opacity-50 ${
                    project.is_featured
                      ? 'text-yellow-400 bg-yellow-500/20 hover:bg-yellow-500/30'
                      : 'text-gray-400 hover:text-yellow-400 hover:bg-teknofest-medium-blue'
                  }`}
                  title={project.is_featured ? 'إزالة من أفضل الفرق' : 'إضافة لأفضل الفرق'}
                >
                  {togglingFeature === project.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Award className="w-5 h-5" />
                  )}
                </button>
                <button
                  onClick={() => setSelectedProject(project)}
                  className="p-2 text-gray-400 hover:text-white hover:bg-teknofest-medium-blue rounded-lg transition-colors"
                  title="عرض التفاصيل"
                >
                  <Eye className="w-5 h-5" />
                </button>
                <button
                  onClick={() => handleDownloadPdf(project.id!)}
                  disabled={downloading === project.id}
                  className="p-2 text-gray-400 hover:text-white hover:bg-teknofest-medium-blue rounded-lg transition-colors disabled:opacity-50"
                  title="تحميل PDF"
                >
                  {downloading === project.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Project Detail Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6 sticky top-0 bg-teknofest-blue py-2">
              <h2 className="text-xl font-bold text-white">{selectedProject.title}</h2>
              <button
                onClick={() => setSelectedProject(null)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Meta Info */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-3 bg-teknofest-dark-blue/50 rounded-xl text-center">
                  <p className="text-gray-400 text-xs mb-1">الفريق</p>
                  <p className="text-white font-medium text-sm">
                    {selectedProject.team?.team_name || `#${selectedProject.team_id}`}
                  </p>
                </div>
                <div className="p-3 bg-teknofest-dark-blue/50 rounded-xl text-center">
                  <p className="text-gray-400 text-xs mb-1">المجال</p>
                  <p className="text-white font-medium text-sm truncate" title={selectedProject.field}>
                    {selectedProject.field}
                  </p>
                </div>
                <div className="p-3 bg-teknofest-dark-blue/50 rounded-xl text-center">
                  <p className="text-gray-400 text-xs mb-1">عدد الأحرف</p>
                  <p className="text-white font-medium text-sm">{selectedProject.character_count}</p>
                </div>
                <div className="p-3 bg-teknofest-dark-blue/50 rounded-xl text-center">
                  <p className="text-gray-400 text-xs mb-1">الحالة</p>
                  <p
                    className={`font-medium text-sm ${
                      selectedProject.is_complete ? 'text-green-400' : 'text-yellow-400'
                    }`}
                  >
                    {selectedProject.is_complete ? 'مكتمل' : 'غير مكتمل'}
                  </p>
                </div>
              </div>

              {/* Problem Statement */}
              <div>
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-400" />
                  المشكلة
                </h3>
                <p className="text-gray-300 bg-teknofest-dark-blue/50 p-4 rounded-xl">
                  {selectedProject.problem_statement}
                </p>
              </div>

              {/* Technical Description */}
              <div>
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-teknofest-cyan" />
                  الوصف التقني
                </h3>
                <p className="text-gray-300 bg-teknofest-dark-blue/50 p-4 rounded-xl whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {selectedProject.technical_description}
                </p>
              </div>

              {/* Scientific Reference */}
              <div>
                <h3 className="text-white font-medium mb-2 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-purple-400" />
                  المرجع العلمي
                </h3>
                <p className="text-gray-300 bg-teknofest-dark-blue/50 p-4 rounded-xl">
                  {selectedProject.scientific_reference}
                </p>
              </div>

              {/* Scores */}
              {(selectedProject.admin_score || selectedProject.ai_score) && (
                <div className="grid grid-cols-3 gap-4">
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl text-center">
                    <Star className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
                    <p className="text-gray-400 text-xs mb-1">المجموع</p>
                    <p className="text-2xl font-bold text-yellow-400">
                      {selectedProject.total_score?.toFixed(1) || '-'}
                    </p>
                  </div>
                  <div className="p-4 bg-teknofest-dark-blue/50 rounded-xl text-center">
                    <p className="text-gray-400 text-xs mb-1">تقييم الإداريين</p>
                    <p className="text-xl font-bold text-white">
                      {selectedProject.admin_score?.toFixed(1) || '-'}
                    </p>
                  </div>
                  <div className="p-4 bg-teknofest-dark-blue/50 rounded-xl text-center">
                    <p className="text-gray-400 text-xs mb-1">تقييم AI</p>
                    <p className="text-xl font-bold text-white">
                      {selectedProject.ai_score?.toFixed(1) || '-'}
                    </p>
                  </div>
                </div>
              )}

              {/* Attachments */}
              {selectedProject.has_attachments && (
                <div>
                  <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                    <Paperclip className="w-4 h-4 text-green-400" />
                    المرفقات
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {selectedProject.image_path && (
                      <div className="bg-teknofest-dark-blue/50 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                            <Image className="w-5 h-5 text-blue-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">صورة المشروع</p>
                            <p className="text-gray-500 text-xs">{selectedProject.image_path}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`/api/projects/attachment/${selectedProject.image_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors text-sm"
                          >
                            <ExternalLink className="w-4 h-4" />
                            عرض
                          </a>
                          <a
                            href={`/api/projects/attachment/${selectedProject.image_path}`}
                            download
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                          >
                            <Download className="w-4 h-4" />
                            تحميل
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedProject.diagram_path && (
                      <div className="bg-teknofest-dark-blue/50 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                            <FileImage className="w-5 h-5 text-purple-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">المخطط</p>
                            <p className="text-gray-500 text-xs">{selectedProject.diagram_path}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`/api/projects/attachment/${selectedProject.diagram_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                          >
                            <ExternalLink className="w-4 h-4" />
                            عرض
                          </a>
                          <a
                            href={`/api/projects/attachment/${selectedProject.diagram_path}`}
                            download
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                          >
                            <Download className="w-4 h-4" />
                            تحميل
                          </a>
                        </div>
                      </div>
                    )}

                    {selectedProject.design_path && (
                      <div className="bg-teknofest-dark-blue/50 rounded-xl p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-orange-400" />
                          </div>
                          <div>
                            <p className="text-white font-medium text-sm">التصميم المبدئي</p>
                            <p className="text-gray-500 text-xs">{selectedProject.design_path}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <a
                            href={`/api/projects/attachment/${selectedProject.design_path}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-orange-500/20 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors text-sm"
                          >
                            <ExternalLink className="w-4 h-4" />
                            عرض
                          </a>
                          <a
                            href={`/api/projects/attachment/${selectedProject.design_path}`}
                            download
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-500/20 text-green-400 rounded-lg hover:bg-green-500/30 transition-colors text-sm"
                          >
                            <Download className="w-4 h-4" />
                            تحميل
                          </a>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4 border-t border-teknofest-light-blue/20">
                <button
                  onClick={() => handleToggleFeatured(selectedProject.id!)}
                  disabled={togglingFeature === selectedProject.id}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                    selectedProject.is_featured
                      ? 'bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30'
                      : 'btn-secondary'
                  }`}
                >
                  {togglingFeature === selectedProject.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Award className="w-4 h-4" />
                  )}
                  {selectedProject.is_featured ? 'إزالة من أفضل الفرق' : 'إضافة لأفضل الفرق'}
                </button>
                <button
                  onClick={() => handleDownloadPdf(selectedProject.id!)}
                  disabled={downloading === selectedProject.id}
                  className="btn-secondary flex items-center gap-2 disabled:opacity-50"
                >
                  {downloading === selectedProject.id ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Download className="w-4 h-4" />
                  )}
                  تحميل PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

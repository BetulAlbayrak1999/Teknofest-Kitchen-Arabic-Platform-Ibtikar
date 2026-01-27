import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  Star,
  Search,
  Loader2,
  Bot,
  User,
  Save,
  Eye,
  Edit3,
  Users,
  X,
} from 'lucide-react'
import { projectsService, evaluationsService, type ProjectEvaluationsDetails, type EvaluationWithAdmin } from '../../services/api'
import type { ProjectSubmission } from '../../types'

interface EvaluationForm {
  score: number
  notes: string
}

export default function AdminEvaluations() {
  const [projects, setProjects] = useState<ProjectSubmission[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedProject, setSelectedProject] = useState<ProjectSubmission | null>(null)
  const [evaluating, setEvaluating] = useState(false)
  const [requestingAI, setRequestingAI] = useState<number | null>(null)
  const [form, setForm] = useState<EvaluationForm>({ score: 25, notes: '' })
  const [viewingEvaluations, setViewingEvaluations] = useState<ProjectEvaluationsDetails | null>(null)
  const [loadingEvaluations, setLoadingEvaluations] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)

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

  const filteredProjects = projects.filter(
    (project) =>
      project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.field.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleViewEvaluations = async (project: ProjectSubmission) => {
    setLoadingEvaluations(true)
    try {
      const data = await evaluationsService.getProjectEvaluationsWithDetails(project.id!)
      setViewingEvaluations(data)
    } catch (error) {
      toast.error('حدث خطأ في تحميل التقييمات')
    } finally {
      setLoadingEvaluations(false)
    }
  }

  const handleOpenEvaluateModal = (project: ProjectSubmission, existingEval?: EvaluationWithAdmin) => {
    setSelectedProject(project)
    if (existingEval) {
      setIsUpdating(true)
      setForm({
        score: existingEval.score,
        notes: existingEval.notes || ''
      })
    } else {
      setIsUpdating(false)
      setForm({ score: 25, notes: '' })
    }
    setViewingEvaluations(null)
  }

  const handleEvaluate = async () => {
    if (!selectedProject) return

    if (form.score < 0 || form.score > 75) {
      toast.error('التقييم يجب أن يكون بين 0 و 75')
      return
    }

    setEvaluating(true)
    try {
      await evaluationsService.create({
        project_id: selectedProject.id!,
        score: form.score,
        notes: form.notes,
        is_ai_evaluation: false,
      })
      toast.success(isUpdating ? 'تم تحديث التقييم بنجاح' : 'تم حفظ التقييم بنجاح')

      // Refresh projects
      const data = await projectsService.getAll()
      setProjects(data)

      setSelectedProject(null)
      setForm({ score: 25, notes: '' })
      setIsUpdating(false)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'حدث خطأ في حفظ التقييم')
    } finally {
      setEvaluating(false)
    }
  }

  const handleRequestAIEvaluation = async (projectId: number) => {
    setRequestingAI(projectId)
    try {
      await evaluationsService.requestAIEvaluation(projectId)
      toast.success('تم طلب تقييم الذكاء الاصطناعي')

      // Refresh projects
      const data = await projectsService.getAll()
      setProjects(data)
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'حدث خطأ في طلب التقييم')
    } finally {
      setRequestingAI(null)
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
          <h1 className="text-2xl font-bold text-white">تقييم المشاريع</h1>
          <p className="text-gray-400">تقييم المشاريع المقدمة (75% إداريين + 25% AI)</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg">
          <Star className="w-5 h-5" />
          <span className="font-medium">{projects.length} مشروع</span>
        </div>
      </div>

      {/* Info Box */}
      <div className="card bg-teknofest-dark-blue/50 border border-teknofest-light-blue/20">
        <div className="flex items-start gap-3">
          <Users className="w-5 h-5 text-teknofest-cyan mt-1" />
          <div className="text-sm">
            <p className="text-white font-medium mb-1">نظام التقييم الجماعي</p>
            <ul className="text-gray-400 space-y-1">
              <li>• يمكنك تقييم المشاريع وتحديث تقييمك في أي وقت</li>
              <li>• يمكنك رؤية تقييمات جميع الإداريين الآخرين</li>
              <li>• جميع تقييمات الإداريين تشكل مجتمعة 75% من التقييم النهائي</li>
            </ul>
          </div>
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

      {/* Projects List */}
      {filteredProjects.length === 0 ? (
        <div className="card text-center py-12">
          <Star className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">لا توجد مشاريع للتقييم</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredProjects.map((project) => (
            <div key={project.id} className="card">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1">{project.title}</h3>
                  <p className="text-gray-400 text-sm mb-2">
                    {project.team?.team_name || `فريق ${project.team_id}`} | {project.field}
                  </p>
                  <p className="text-gray-300 text-sm line-clamp-2">
                    {project.problem_statement}
                  </p>
                </div>

                {/* Scores */}
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-6">
                    {/* Admin Score */}
                    <div className="text-center">
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center mb-1 ${
                          project.admin_score
                            ? 'bg-green-500/20'
                            : 'bg-teknofest-medium-blue'
                        }`}
                      >
                        {project.admin_score ? (
                          <span className="text-lg font-bold text-green-400">
                            {project.admin_score.toFixed(0)}
                          </span>
                        ) : (
                          <User className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400">إداري</p>
                    </div>

                    {/* AI Score */}
                    <div className="text-center">
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center mb-1 ${
                          project.ai_score
                            ? 'bg-teknofest-cyan/20'
                            : 'bg-teknofest-medium-blue'
                        }`}
                      >
                        {project.ai_score ? (
                          <span className="text-lg font-bold text-teknofest-cyan">
                            {project.ai_score.toFixed(0)}
                          </span>
                        ) : (
                          <Bot className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400">AI</p>
                    </div>

                    {/* Total Score */}
                    <div className="text-center">
                      <div
                        className={`w-14 h-14 rounded-xl flex items-center justify-center mb-1 ${
                          project.total_score
                            ? 'bg-yellow-500/20'
                            : 'bg-teknofest-medium-blue'
                        }`}
                      >
                        {project.total_score ? (
                          <span className="text-lg font-bold text-yellow-400">
                            {project.total_score.toFixed(0)}
                          </span>
                        ) : (
                          <Star className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                      <p className="text-xs text-gray-400">المجموع</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => handleOpenEvaluateModal(project)}
                      className="btn-primary text-sm py-2 flex items-center gap-1"
                    >
                      {project.admin_score ? (
                        <>
                          <Edit3 className="w-4 h-4" />
                          تعديل تقييمي
                        </>
                      ) : (
                        <>
                          <Star className="w-4 h-4" />
                          تقييم
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => handleViewEvaluations(project)}
                      disabled={loadingEvaluations}
                      className="btn-secondary text-sm py-2 flex items-center gap-1"
                    >
                      <Eye className="w-4 h-4" />
                      عرض التقييمات
                    </button>
                    {!project.ai_score && (
                      <button
                        onClick={() => handleRequestAIEvaluation(project.id!)}
                        disabled={requestingAI === project.id}
                        className="btn-secondary text-sm py-2 flex items-center gap-1 disabled:opacity-50"
                      >
                        {requestingAI === project.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                        AI
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Evaluations Modal */}
      {viewingEvaluations && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">
                تقييمات: {viewingEvaluations.project_title}
              </h2>
              <button
                onClick={() => setViewingEvaluations(null)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-green-500/10 rounded-xl text-center">
                <p className="text-2xl font-bold text-green-400">
                  {viewingEvaluations.total_admin_evaluations}
                </p>
                <p className="text-sm text-gray-400">تقييمات الإداريين</p>
              </div>
              <div className="p-4 bg-teknofest-cyan/10 rounded-xl text-center">
                <p className="text-2xl font-bold text-teknofest-cyan">
                  {viewingEvaluations.has_ai_evaluation ? 'نعم' : 'لا'}
                </p>
                <p className="text-sm text-gray-400">تقييم AI</p>
              </div>
            </div>

            {/* Evaluations List */}
            <div className="space-y-4">
              {viewingEvaluations.evaluations.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Star className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>لا توجد تقييمات بعد</p>
                </div>
              ) : (
                viewingEvaluations.evaluations.map((evalItem) => (
                  <div
                    key={evalItem.id}
                    className={`p-4 rounded-xl border ${
                      evalItem.is_current_admin
                        ? 'bg-teknofest-orange/10 border-teknofest-orange/30'
                        : evalItem.is_ai_evaluation
                        ? 'bg-teknofest-cyan/10 border-teknofest-cyan/30'
                        : 'bg-teknofest-dark-blue/50 border-teknofest-light-blue/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                            evalItem.is_ai_evaluation
                              ? 'bg-teknofest-cyan/20'
                              : 'bg-green-500/20'
                          }`}
                        >
                          {evalItem.is_ai_evaluation ? (
                            <Bot className="w-6 h-6 text-teknofest-cyan" />
                          ) : (
                            <User className="w-6 h-6 text-green-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-white font-medium">
                            {evalItem.is_ai_evaluation
                              ? 'تقييم الذكاء الاصطناعي'
                              : evalItem.admin_name || 'إداري'}
                            {evalItem.is_current_admin && (
                              <span className="text-teknofest-orange text-sm mr-2">(أنت)</span>
                            )}
                          </p>
                          {!evalItem.is_ai_evaluation && evalItem.admin_weight && (
                            <p className="text-gray-400 text-sm">
                              وزن التقييم: {evalItem.admin_weight}%
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="text-left">
                        <p className="text-2xl font-bold text-white">{evalItem.score}</p>
                        <p className="text-xs text-gray-400">من 75 </p>
                      </div>
                    </div>
                    {evalItem.notes && (
                      <div className="mt-3 p-3 bg-black/20 rounded-lg">
                        <p className="text-gray-300 text-sm">{evalItem.notes}</p>
                      </div>
                    )}
                    {evalItem.is_current_admin && (
                      <button
                        onClick={() => {
                          const project = projects.find(p => p.id === viewingEvaluations.project_id)
                          if (project) {
                            handleOpenEvaluateModal(project, evalItem)
                          }
                        }}
                        className="mt-3 text-sm text-teknofest-orange hover:text-teknofest-orange/80 flex items-center gap-1"
                      >
                        <Edit3 className="w-4 h-4" />
                        تعديل تقييمي
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Action Button */}
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingEvaluations(null)}
                className="btn-secondary"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full">
            <h2 className="text-xl font-bold text-white mb-6">
              {isUpdating ? 'تعديل التقييم' : 'تقييم'}: {selectedProject.title}
            </h2>

            {/* Project Info */}
            <div className="p-4 bg-teknofest-dark-blue/50 rounded-xl mb-6">
              <p className="text-gray-400 text-sm mb-2">المشكلة:</p>
              <p className="text-white text-sm">{selectedProject.problem_statement}</p>
            </div>

            {/* Score Slider */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <label className="text-white font-medium">التقييم (من 75)</label>
                <span className="text-2xl font-bold text-teknofest-orange">{form.score}</span>
              </div>
              <input
                type="range"
                min="0"
                max="75"
                value={form.score}
                onChange={(e) => setForm({ ...form, score: Number(e.target.value) })}
                className="w-full h-3 bg-teknofest-medium-blue rounded-lg appearance-none cursor-pointer accent-teknofest-orange"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>0</span>
                <span>10</span>
                <span>20</span>
                <span>30</span>
                <span>40</span>
                <span>50</span>
                <span>60</span>
                <span>70</span>
                <span>75</span>
              </div>
            </div>

            {/* Notes */}
            <div className="mb-6">
              <label className="block text-white font-medium mb-2">ملاحظات</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="أضف ملاحظاتك حول المشروع..."
                className="input-field min-h-[100px]"
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setSelectedProject(null)
                  setForm({ score: 25, notes: '' })
                  setIsUpdating(false)
                }}
                className="px-6 py-2 text-gray-300 hover:text-white transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleEvaluate}
                disabled={evaluating}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {evaluating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Save className="w-5 h-5" />
                )}
                {isUpdating ? 'تحديث التقييم' : 'حفظ التقييم'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

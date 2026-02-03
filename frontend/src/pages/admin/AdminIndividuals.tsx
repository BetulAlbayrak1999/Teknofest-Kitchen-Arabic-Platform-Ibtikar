import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import {
  User,
  Search,
  Users,
  Loader2,
  Check,
  X,
  UserPlus,
  Eye,
  Mail,
  Phone,
  Briefcase,
  Target,
  Lightbulb,
  Calendar,
  UserCheck,
} from 'lucide-react'
import { individualsService } from '../../services/api'
import { PROJECT_FIELDS, type Individual, type TeamWithSpace } from '../../types'

type AssignMode = 'new' | 'existing'
const GENDER_LABELS = {
  male: 'ذكر',
  female: 'أنثى',
}
export default function AdminIndividuals() {
  const [individuals, setIndividuals] = useState<Individual[]>([])
  const [teamsWithSpace, setTeamsWithSpace] = useState<TeamWithSpace[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIndividuals, setSelectedIndividuals] = useState<number[]>([])
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedIndividualDetail, setSelectedIndividualDetail] = useState<Individual | null>(null)
  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamField, setNewTeamField] = useState('')
  const [selectedExistingTeam, setSelectedExistingTeam] = useState<number | null>(null)
  const [assignMode, setAssignMode] = useState<AssignMode>('new')
  const [assigning, setAssigning] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unassigned' | 'assigned'>('all')
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all')

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [individualsData, teamsData] = await Promise.all([
          individualsService.getAll(),
          individualsService.getTeamsWithSpace(),
        ])
        setIndividuals(individualsData)
        setTeamsWithSpace(teamsData)
      } catch (error) {
        toast.error('حدث خطأ في تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])
  
  useEffect(() => {
    setSelectedIndividuals([])
  }, [genderFilter])
  
  const filteredIndividuals = individuals.filter((ind) => {
    const matchesSearch =
      ind.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ind.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesAssignFilter =
      filter === 'all' ||
      (filter === 'unassigned' && !ind.is_assigned) ||
      (filter === 'assigned' && ind.is_assigned)

    const matchesGender =
      genderFilter === 'all' || ind.gender === genderFilter

    return matchesSearch && matchesAssignFilter && matchesGender
  })


  const toggleSelect = (id: number) => {
    const ind = individuals.find((i) => i.id === id)
    if (!ind) return

    setSelectedIndividuals((prev) => {
      // if selecting (not removing)
      if (!prev.includes(id)) {
        const selected = individuals.filter((i) => prev.includes(i.id!))
        const genders = new Set(selected.map((i) => i.gender))
        // if there is already a gender selected and new one differs -> block
        if (genders.size === 1 && Array.from(genders)[0] !== ind.gender) {
          toast.error('لا يمكن اختيار أفراد من جنسين مختلفين')
          return prev
        }
      }
      return prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    })
  }

  const openDetailModal = (individual: Individual) => {
    setSelectedIndividualDetail(individual)
    setShowDetailModal(true)
  }

  const openAssignModal = () => {
    setAssignMode('new')
    setSelectedExistingTeam(null)
    setNewTeamName('')
    setNewTeamField('')
    setShowAssignModal(true)
  }

  const handleAssign = async () => {
    if (assignMode === 'new') {
      // Create new team
      if (selectedIndividuals.length < 3) {
        toast.error('يجب اختيار 3 أفراد على الأقل')
        return
      }
      if (selectedIndividuals.length > 6) {
        toast.error('الحد الأقصى 6 أفراد')
        return
      }
      if (!newTeamName.trim()) {
        toast.error('يرجى إدخال اسم الفريق')
        return
      }
      if (!newTeamField) {
        toast.error('يرجى اختيار مجال المسابقة')
        return
      }

      setAssigning(true)
      try {
        await individualsService.assignToTeam(
          selectedIndividuals,
          newTeamName,
          newTeamField
        )
        toast.success('تم إنشاء الفريق وفرز الأفراد بنجاح')

        // Refresh data
        const [individualsData, teamsData] = await Promise.all([
          individualsService.getAll(),
          individualsService.getTeamsWithSpace(),
        ])
        setIndividuals(individualsData)
        setTeamsWithSpace(teamsData)

        // Reset state
        setSelectedIndividuals([])
        setShowAssignModal(false)
        setNewTeamName('')
        setNewTeamField('')
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'حدث خطأ في فرز الأفراد')
      } finally {
        setAssigning(false)
      }
    } else {
      // Add to existing team
      if (!selectedExistingTeam) {
        toast.error('يرجى اختيار فريق')
        return
      }

      const team = teamsWithSpace.find((t) => t.id === selectedExistingTeam)
      if (!team) {
        toast.error('الفريق غير موجود')
        return
      }

      if (selectedIndividuals.length > team.available_slots) {
        toast.error(`لا يمكن إضافة ${selectedIndividuals.length} أفراد. المتاح: ${team.available_slots} فقط`)
        return
      }

      setAssigning(true)
      try {
        await individualsService.addToExistingTeam(selectedExistingTeam, selectedIndividuals)
        toast.success('تم إضافة الأفراد إلى الفريق بنجاح')

        // Refresh data
        const [individualsData, teamsData] = await Promise.all([
          individualsService.getAll(),
          individualsService.getTeamsWithSpace(),
        ])
        setIndividuals(individualsData)
        setTeamsWithSpace(teamsData)

        // Reset state
        setSelectedIndividuals([])
        setShowAssignModal(false)
        setSelectedExistingTeam(null)
      } catch (error: any) {
        toast.error(error.response?.data?.detail || 'حدث خطأ في إضافة الأفراد')
      } finally {
        setAssigning(false)
      }
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
          <h1 className="text-2xl font-bold text-white">إدارة الأفراد</h1>
          <p className="text-gray-400">فرز الأفراد إلى فرق</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg">
            <User className="w-5 h-5" />
            <span className="font-medium">{individuals.length} فرد</span>
          </div>
          {selectedIndividuals.length > 0 && (
            <button
              onClick={openAssignModal}
              className="btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              فرز المحددين ({selectedIndividuals.length})
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="البحث عن فرد..."
            className="input-field pr-12"
          />
        </div>
        <div className="flex gap-2">
          {[
            { value: 'all', label: 'الكل' },
            { value: 'unassigned', label: 'غير مفرز' },
            { value: 'assigned', label: 'مفرز' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value as typeof filter)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                filter === f.value
                  ? 'bg-teknofest-orange text-white'
                  : 'bg-teknofest-medium-blue text-gray-300 hover:bg-teknofest-light-blue'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
              <div>
        <select
          value={genderFilter}
          onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
          className="input-field"
        >
          <option value="all">كلا الجنسين</option>
          <option value="male">ذكور فقط</option>
          <option value="female">إناث فقط</option>
        </select>
      </div>
      </div>


      {/* Teams with space info */}
      {teamsWithSpace.length > 0 && (
        <div className="card bg-blue-500/10 border-blue-500/30">
          <div className="flex items-center gap-2 text-blue-400 mb-2">
            <Users className="w-5 h-5" />
            <span className="font-medium">فرق متاحة للإضافة</span>
          </div>
          <p className="text-gray-400 text-sm">
            يوجد {teamsWithSpace.length} فريق لديهم مساحة لأعضاء إضافيين
          </p>
        </div>
      )}

      {/* Individuals Grid */}
      {filteredIndividuals.length === 0 ? (
        <div className="card text-center py-12">
          <User className="w-16 h-16 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">لا يوجد أفراد للعرض</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredIndividuals.map((individual) => (
            <div
              key={individual.id}
              className={`card transition-all ${
                selectedIndividuals.includes(individual.id!)
                  ? 'border-teknofest-orange bg-teknofest-orange/10'
                  : individual.is_assigned
                  ? 'border-green-500/30 opacity-60'
                  : 'hover:border-teknofest-orange/50'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      individual.is_assigned
                        ? 'bg-green-500/20'
                        : individual.gender == 'male' ? 'bg-gradient-to-br from-green-500 to-blue-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'
                    }`}
                  >
                    {individual.is_assigned ? (
                      <Check className="w-6 h-6 text-green-400" />
                    ) : (
                      <User className="w-6 h-6 text-white" />
                    )}
                  </div>
                  <div>
                    <h3 className="text-white font-bold">{individual.full_name} - {GENDER_LABELS[individual.gender]}</h3>
                    <p className="text-gray-400 text-sm">{individual.experience_level}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      openDetailModal(individual)
                    }}
                    className="p-2 text-gray-400 hover:text-teknofest-orange transition-colors"
                    title="عرض التفاصيل"
                  >
                    <Eye className="w-5 h-5" />
                  </button>
                  {!individual.is_assigned && (
                    <div
                      onClick={() => toggleSelect(individual.id!)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center cursor-pointer ${
                        selectedIndividuals.includes(individual.id!)
                          ? 'border-teknofest-orange bg-teknofest-orange'
                          : 'border-gray-500'
                      }`}
                    >
                      {selectedIndividuals.includes(individual.id!) && (
                        <Check className="w-4 h-4 text-white" />
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <p className="text-gray-400">
                  <span className="text-gray-500">البريد:</span> {individual.email}
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">المجال:</span> {individual.preferred_field}
                </p>
                <p className="text-gray-400">
                  <span className="text-gray-500">المهارات:</span>{' '}
                  {individual.technical_skills.substring(0, 50)}...
                </p>
              </div>

              {individual.is_assigned && (
                <div className="mt-4 pt-4 border-t border-teknofest-light-blue/20">
                  <span className="text-green-400 text-sm flex items-center gap-1">
                    <Check className="w-4 h-4" />
                    تم الفرز
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedIndividualDetail && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">معلومات الفرد</h2>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Header Info */}
              <div className="flex items-center gap-4 p-4 bg-teknofest-dark-blue/50 rounded-xl">
                <div
                  className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                    selectedIndividualDetail.is_assigned
                      ? 'bg-green-500/20'
                      : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}
                >
                  <User className="w-8 h-8 text-white" />
                </div>
                <div>
                  <h3 className="text-xl text-white font-bold">
                    {selectedIndividualDetail.full_name}
                  </h3>
                  <p className="text-gray-400">{selectedIndividualDetail.experience_level}</p>
                  {selectedIndividualDetail.is_assigned && (
                    <span className="inline-flex items-center gap-1 mt-1 px-2 py-1 bg-green-500/20 text-green-400 rounded-full text-xs">
                      <UserCheck className="w-3 h-3" />
                      تم الفرز
                    </span>
                  )}
                </div>
              </div>

              {/* Contact Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-teknofest-dark-blue/30 rounded-lg">
                  <Mail className="w-5 h-5 text-teknofest-orange" />
                  <div>
                    <p className="text-gray-500 text-xs">البريد الإلكتروني</p>
                    <p className="text-white">{selectedIndividualDetail.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-teknofest-dark-blue/30 rounded-lg">
                  <Phone className="w-5 h-5 text-teknofest-orange" />
                  <div>
                    <p className="text-gray-500 text-xs">رقم الهاتف</p>
                    <p className="text-white">{selectedIndividualDetail.phone}</p>
                  </div>
                </div>
              </div>

              {/* Skills & Interests */}
              <div className="space-y-4">
                <div className="p-4 bg-teknofest-dark-blue/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Briefcase className="w-5 h-5 text-teknofest-orange" />
                    <span className="text-white font-medium">المهارات التقنية</span>
                  </div>
                  <p className="text-gray-300">{selectedIndividualDetail.technical_skills}</p>
                </div>

                <div className="p-4 bg-teknofest-dark-blue/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="w-5 h-5 text-teknofest-orange" />
                    <span className="text-white font-medium">الاهتمامات</span>
                  </div>
                  <p className="text-gray-300">{selectedIndividualDetail.interests}</p>
                </div>

                <div className="p-4 bg-teknofest-dark-blue/30 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-teknofest-orange" />
                    <span className="text-white font-medium">المجال المفضل</span>
                  </div>
                  <p className="text-gray-300">{selectedIndividualDetail.preferred_field}</p>
                </div>

                {selectedIndividualDetail.project_idea && (
                  <div className="p-4 bg-teknofest-dark-blue/30 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Lightbulb className="w-5 h-5 text-teknofest-orange" />
                      <span className="text-white font-medium">فكرة المشروع</span>
                    </div>
                    <p className="text-gray-300">{selectedIndividualDetail.project_idea}</p>
                  </div>
                )}
              </div>

              {/* Registration Info */}
              <div className="flex items-center gap-3 p-3 bg-teknofest-dark-blue/30 rounded-lg">
                <Calendar className="w-5 h-5 text-gray-500" />
                <div>
                  <p className="text-gray-500 text-xs">تاريخ التسجيل</p>
                  <p className="text-gray-300">
                    {selectedIndividualDetail.created_at
                      ? new Date(selectedIndividualDetail.created_at).toLocaleDateString('ar-SA')
                      : 'غير محدد'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-6 py-2 bg-teknofest-medium-blue text-white rounded-lg hover:bg-teknofest-light-blue transition-colors"
              >
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="card max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">فرز الأفراد</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mode Selection */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setAssignMode('new')}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  assignMode === 'new'
                    ? 'bg-teknofest-orange text-white'
                    : 'bg-teknofest-dark-blue text-gray-400 hover:text-white'
                }`}
              >
                فريق جديد
              </button>
              <button
                onClick={() => setAssignMode('existing')}
                disabled={teamsWithSpace.length === 0}
                className={`flex-1 py-3 rounded-lg font-medium transition-all ${
                  assignMode === 'existing'
                    ? 'bg-teknofest-orange text-white'
                    : 'bg-teknofest-dark-blue text-gray-400 hover:text-white'
                } ${teamsWithSpace.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                فريق موجود ({teamsWithSpace.length})
              </button>
            </div>

            <div className="space-y-4">
              {assignMode === 'new' ? (
                <>
                  <div>
                    <label className="block text-white font-medium mb-2">اسم الفريق</label>
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      placeholder="أدخل اسم الفريق"
                      className="input-field"
                    />
                  </div>

                  <div>
                    <label className="block text-white font-medium mb-2">مجال المسابقة</label>
                    <select
                      value={newTeamField}
                      onChange={(e) => setNewTeamField(e.target.value)}
                      className="input-field"
                    >
                      <option value="">اختر المسابقة</option>
                      {PROJECT_FIELDS.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <p className="text-gray-500 text-sm">
                    يجب اختيار 3-6 أفراد لإنشاء فريق جديد
                  </p>
                </>
              ) : (
                <>
                  <div>
                    <label className="block text-white font-medium mb-2">اختر الفريق</label>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {teamsWithSpace.map((team) => (
                        <div
                          key={team.id}
                          onClick={() => setSelectedExistingTeam(team.id)}
                          className={`p-4 rounded-lg cursor-pointer transition-all ${
                            selectedExistingTeam === team.id
                              ? 'bg-teknofest-orange/20 border border-teknofest-orange'
                              : 'bg-teknofest-dark-blue/50 border border-transparent hover:border-teknofest-light-blue'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-white font-medium">{team.team_name}</h4>
                            <span className="text-xs px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full">
                              {team.available_slots} متاح
                            </span>
                          </div>
                          <p className="text-gray-400 text-sm mb-2">{team.field}</p>
                          <div className="flex flex-wrap gap-1">
                            {team.members.map((member) => (
                              <span
                                key={member.id}
                                className={`text-xs px-2 py-1 rounded-full ${
                                  member.is_leader
                                    ? 'bg-yellow-500/20 text-yellow-400'
                                    : 'bg-gray-500/20 text-gray-400'
                                }`}
                              >
                                {member.full_name}
                              </span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {selectedExistingTeam && (
                    <p className="text-gray-500 text-sm">
                      الفريق المحدد لديه{' '}
                      {teamsWithSpace.find((t) => t.id === selectedExistingTeam)?.available_slots}{' '}
                      مقاعد متاحة
                    </p>
                  )}
                </>
              )}

              <div className="p-4 bg-teknofest-dark-blue/50 rounded-xl">
                <p className="text-gray-400 text-sm mb-2">الأفراد المحددين ({selectedIndividuals.length}):</p>
                <div className="flex flex-wrap gap-2">
                  {selectedIndividuals.map((id) => {
                    const ind = individuals.find((i) => i.id === id)
                    return (
                      <span
                        key={id}
                        className="px-3 py-1 bg-teknofest-orange/20 text-teknofest-orange rounded-full text-sm"
                      >
                        {ind?.full_name}
                      </span>
                    )
                  })}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-6 py-2 text-gray-300 hover:text-white transition-colors"
              >
                إلغاء
              </button>
              <button
                onClick={handleAssign}
                disabled={assigning}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {assigning ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Users className="w-5 h-5" />
                )}
                {assignMode === 'new' ? 'إنشاء الفريق' : 'إضافة للفريق'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

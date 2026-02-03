import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  Users,
  UserPlus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  Lightbulb,
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import { PROJECT_FIELDS, type TeamMember, type RegistrationType, type Gender} from '../types'
import api, { iForgotService, teamsService } from '../services/api'

interface TeamFormData {
  team_name: string
  registration_type: RegistrationType
  field: string
  initial_idea?: string
  members: TeamMember[]
  gender: Gender
}

const GENDER_LABELS: Record<Gender, string> = {
  male: 'ذكور',
  female: 'إناث',
}

export default function TeamRegistration() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [hasIdea, setHasIdea] = useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [leaderIndex, setLeaderIndex] = useState(0) // Track leader by index
  const [verifyingMembership, setVerifyingMembership] = useState<{[key: number]: boolean}>({})
  const [membershipStatus, setMembershipStatus] = useState<{[key: number]: 'valid' | 'invalid' | null}>({})
  const [memberData, setMemberData] = useState<{[key: number]: {full_name: string, email: string, phone: string} | null}>({})
  const [memberGenders, setMemberGenders] = useState<{[key: number]: Gender | null}>({})
  
  const {
    register,
    handleSubmit,
    control,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<TeamFormData>({
    defaultValues: {
      members: [
        { full_name: '', membership_number: '', email: '', phone: '', is_leader: true },
        { full_name: '', membership_number: '', email: '', phone: '', is_leader: false },
        { full_name: '', membership_number: '', email: '', phone: '', is_leader: false },
      ],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'members',
  })

  const onSubmit = async (data: TeamFormData) => {
    const { isValid, teamGender } = validateTeamGender()
    
    if (!isValid || !teamGender) {
      toast.error('جميع أعضاء الفريق يجب أن يكونوا من نفس الجنس')
      return
    }

    setIsSubmitting(true)
    try {
      // Transform members to ensure is_leader is properly set
      const membersWithLeader = data.members.map((member, index) => ({
        full_name: member.full_name,
        email: member.email,
        phone: member.phone,
        is_leader: index === leaderIndex,
      }))

      const teamData = {
        team_name: data.team_name,
        registration_type: hasIdea ? 'team_with_idea' : 'team_no_idea',
        field: data.field,
        initial_idea: hasIdea ? data.initial_idea : null,
        members: membersWithLeader,
        gender: teamGender,
      }
      await teamsService.create(teamData as any)
      toast.success('تم تسجيل الفريق بنجاح!')
      navigate('/')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'حدث خطأ أثناء التسجيل')
    } finally {
      setIsSubmitting(false)
    }
  }

  const addMember = () => {
    if (fields.length < 6) {
      append({ full_name: '', membership_number: '', email: '', phone: '', is_leader: false })
    }
  }

  const handleRemoveMember = (index: number) => {
    remove(index)
    
    // Clear member data and status for this index
    setMemberData(prev => {
      const newData = { ...prev }
      delete newData[index]
      return newData
    })
    setMembershipStatus(prev => {
      const newStatus = { ...prev }
      delete newStatus[index]
      return newStatus
    })
    setMemberGenders(prev => {
      const newGenders = { ...prev }
      delete newGenders[index]
      return newGenders
    })
    // Adjust leader index if needed
    if (leaderIndex === index) {
      setLeaderIndex(0)
    } else if (leaderIndex > index) {
      setLeaderIndex(leaderIndex - 1)
    }
  }

  const validateTeamGender = (): { isValid: boolean; teamGender: Gender | null } => {
    const genders = Object.values(memberGenders).filter(g => g !== null) as Gender[]
    
    if (genders.length === 0) {
      return { isValid: false, teamGender: null }
    }
    
    const firstGender = genders[0]
    const allSameGender = genders.every(g => g === firstGender)
    
    return { 
      isValid: allSameGender, 
      teamGender: allSameGender ? firstGender : null 
    }
  }

  const handleNextStep = async () => {
    // Validate step 2 fields before proceeding
    const fieldsToValidate: ('team_name' | 'field' | 'initial_idea')[] = ['team_name', 'field']
    if (hasIdea) {
      fieldsToValidate.push('initial_idea')
    }

    const isValid = await trigger(fieldsToValidate)
    if (isValid) {
      setStep(3)
    }
  }

  const verifyMembershipNumber = async (membershipNumber: string, index: number) => {
    if (!membershipNumber) {
      setMembershipStatus(prev => ({ ...prev, [index]: null }))
      setMemberData(prev => ({ ...prev, [index]: null }))
      setMemberGenders(prev => ({ ...prev, [index]: null }))
      return
    }

    if (membershipNumber.length < 7) {
      setMembershipStatus(prev => ({ ...prev, [index]: 'invalid' }))
      setVerifyingMembership(prev => ({ ...prev, [index]: false }))
      setMemberData(prev => ({ ...prev, [index]: null }))
      setMemberGenders(prev => ({ ...prev, [index]: null }))
      return
    }

    setVerifyingMembership(prev => ({ ...prev, [index]: true }))
    
    try {
      const memberResponse = await iForgotService.verifyMembershipNumber(membershipNumber)
      
      if (memberResponse.success) {
        setMembershipStatus(prev => ({ ...prev, [index]: 'valid' }))
        setMemberData(prev => ({ 
          ...prev, 
          [index]: {
            full_name: memberResponse.member.ar_name,
            email: memberResponse.member.email,
            phone: memberResponse.member.phone
          }
        }))

        setMemberGenders(prev => ({ 
          ...prev, 
          [index]: memberResponse.member.sex 
        }))

      } else {
        setMembershipStatus(prev => ({ ...prev, [index]: 'invalid' }))
        setMemberData(prev => ({ ...prev, [index]: null }))
        setMemberGenders(prev => ({ ...prev, [index]: null }))
      }
    } catch (error) {
      setMembershipStatus(prev => ({ ...prev, [index]: 'invalid' }))
      setMemberData(prev => ({ ...prev, [index]: null }))
      setMemberGenders(prev => ({ ...prev, [index]: null }))
    } finally {
      setVerifyingMembership(prev => ({ ...prev, [index]: false }))
    }
  }

  // Debounce function
  const useDebounce = (callback: Function, delay: number) => {
    const timeoutRef = useRef<number>()
    
    return (...args: any[]) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => callback(...args), delay)
    }
  }

  const debouncedVerify = useDebounce(verifyMembershipNumber, 800)

  // Auto-fill member data when verified
  useEffect(() => {
    Object.entries(memberData).forEach(([indexStr, data]) => {
      const index = parseInt(indexStr)
      if (data) {
        setValue(`members.${index}.full_name`, data.full_name)
        setValue(`members.${index}.email`, data.email)
        setValue(`members.${index}.phone`, data.phone)
      }
    })
  }, [memberData, setValue])

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teknofest-orange to-teknofest-red rounded-2xl mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">تسجيل فريق جديد</h1>
          <p className="text-gray-400">أنشئ فريقك وشارك في مسابقات تكنوفيست</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                  step >= s
                    ? 'bg-teknofest-orange text-white'
                    : 'bg-teknofest-medium-blue text-gray-400'
                }`}
              >
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 sm:w-24 h-1 mx-2 rounded ${
                    step > s ? 'bg-teknofest-orange' : 'bg-teknofest-medium-blue'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Do you have an idea? */}
          {step === 1 && (
            <div className="card fade-in">
              <h2 className="text-2xl font-bold text-white mb-6 text-center">
                هل لديك فكرة مشروع؟
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setHasIdea(true)
                    setStep(2)
                  }}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    hasIdea === true
                      ? 'border-teknofest-orange bg-teknofest-orange/10'
                      : 'border-teknofest-light-blue/30 hover:border-teknofest-orange/50'
                  }`}
                >
                  <Lightbulb className="w-12 h-12 text-teknofest-orange mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">نعم، لدينا فكرة</h3>
                  <p className="text-gray-400 text-sm">
                    لدينا فكرة مشروع جاهزة ونريد المشاركة بها
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setHasIdea(false)
                    setStep(2)
                  }}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    hasIdea === false
                      ? 'border-teknofest-cyan bg-teknofest-cyan/10'
                      : 'border-teknofest-light-blue/30 hover:border-teknofest-cyan/50'
                  }`}
                >
                  <Users className="w-12 h-12 text-teknofest-cyan mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">لا، نبحث عن فكرة</h3>
                  <p className="text-gray-400 text-sm">
                    نريد المشاركة ونبحث عن فكرة مشروع مناسبة
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Team Info */}
          {step === 2 && (
            <div className="card fade-in">
              <h2 className="text-2xl font-bold text-white mb-6">معلومات الفريق</h2>

              <div className="space-y-6">
                {/* Team Name */}
                <div>
                  <label className="block text-white font-medium mb-2">اسم الفريق *</label>
                  <input
                    {...register('team_name', {
                      required: 'اسم الفريق مطلوب',
                      minLength: { value: 2, message: 'الاسم قصير جداً' },
                    })}
                    type="text"
                    className="input-field"
                    placeholder="أدخل اسم فريقك"
                  />
                  {errors.team_name && (
                    <p className="text-red-400 text-sm mt-1">{errors.team_name.message}</p>
                  )}
                </div>

                {/* Competition Field */}
                <div>
                  <label className="block text-white font-medium mb-2">مجال المسابقة *</label>
                  <select
                    {...register('field', { required: 'يرجى اختيار مجال المسابقة' })}
                    className="input-field"
                  >
                    <option value="">اختر المسابقة</option>
                    {PROJECT_FIELDS.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  {errors.field && (
                    <p className="text-red-400 text-sm mt-1">{errors.field.message}</p>
                  )}
                </div>

                {/* Project Idea (if hasIdea) */}
                {hasIdea && (
                  <div>
                    <label className="block text-white font-medium mb-2">فكرة المشروع *</label>
                    <textarea
                      {...register('initial_idea', {
                        required: hasIdea ? 'يرجى وصف فكرة المشروع' : false,
                      })}
                      className="input-field min-h-[150px]"
                      placeholder="صف فكرة مشروعك بشكل موجز..."
                    />
                    {errors.initial_idea && (
                      <p className="text-red-400 text-sm mt-1">{errors.initial_idea.message}</p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex items-center gap-2 px-6 py-3 text-gray-300 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                  السابق
                </button>
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="btn-primary flex items-center gap-2"
                >
                  التالي
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Team Members */}
          {step === 3 && (
            <div className="card fade-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">أعضاء الفريق</h2>
                <span className="text-gray-400">{fields.length}/6 أعضاء</span>
              </div>

              <p className="text-gray-400 mb-6">
                يجب أن يتكون الفريق من 3 إلى 6 أعضاء. حدد مشرف الفريق (القائد).
              </p>

              {/* Gender validation warning */}
              {(() => {
                const { isValid, teamGender } = validateTeamGender()
                const hasMembers = Object.values(memberGenders).some(g => g !== null)
                
                if (hasMembers && !isValid) {
                  return (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                      <div className="flex items-center gap-2 text-red-400">
                        <XCircle className="w-5 h-5" />
                        <p className="text-sm font-medium">
                          تحذير: جميع أعضاء الفريق يجب أن يكونوا من نفس الجنس
                        </p>
                      </div>
                    </div>
                  )
                }
                
                // if (hasMembers && isValid && teamGender) {
                //   return (
                //     <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                //       <div className="flex items-center gap-2 text-green-400">
                //         <CheckCircle2 className="w-5 h-5" />
                //         <p className="text-sm font-medium">
                //           جنس الفريق: {GENDER_LABELS[teamGender]}
                //         </p>
                //       </div>
                //     </div>
                //   )
                // }
                
                return null
              })()}     

              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div
                    key={field.id}
                    className="p-4 bg-teknofest-dark-blue/50 rounded-xl border border-teknofest-light-blue/20"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-teknofest-medium-blue flex items-center justify-center text-white font-bold">
                          {index + 1}
                        </span>
                        <span className="text-white font-medium">
                          {`عضو ${index + 1}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="radio"
                            name="team_leader"
                            checked={leaderIndex === index}
                            onChange={() => setLeaderIndex(index)}
                            className="accent-teknofest-orange"
                          />
                          <span className="text-sm text-gray-300">مشرف</span>
                        </label>
                        {fields.length > 3 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(index)}
                            className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                                            <div>
                        <div className="relative">
                          <input
                            {...register(`members.${index}.membership_number`, {
                              required: 'رقم العضوية مطلوب',
                              minLength: { value: 7, message: 'رقم العضوية يجب أن يكون 7 أرقام ' },
                            })}
                            type="text"
                            className="input-field"
                            placeholder="رقم العضوية"
                            dir="rtl"
                            onChange={(e) => {
                              register(`members.${index}.membership_number`).onChange(e)
                              debouncedVerify(e.target.value, index)
                            }}
                          />
                        </div>
                        
                        {/* Verification status */}
                        <div className="mt-2 flex items-center gap-2">
                          {verifyingMembership[index] && (
                            <div className="flex items-center gap-2 text-blue-400 text-xs">
                              <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                              <span>جاري التحقق...</span>
                            </div>
                          )}
                          {!verifyingMembership[index] && membershipStatus[index] === 'valid' && (
                            <div className="flex items-center gap-2 text-green-400 text-xs">
                              <CheckCircle2 className="w-4 h-4" />
                              <span>رقم العضوية صحيح</span>
                            </div>
                          )}
                          {!verifyingMembership[index] && membershipStatus[index] === 'invalid' && !errors.members?.[index]?.membership_number && (
                            <div className="flex items-center gap-2 text-red-400 text-xs">
                              <XCircle className="w-4 h-4" />
                              <span>رقم العضوية غير صحيح</span>
                            </div>
                          )}
                        </div>
                        
                        {errors.members?.[index]?.membership_number && (
                          <p className="text-red-400 text-xs mt-1">
                            {errors.members[index]?.membership_number?.message}
                          </p>
                        )}
                      </div>
                      <div>
                        <input
                          {...register(`members.${index}.full_name`, {
                            required: 'الاسم مطلوب',
                          })}
                          type="text"
                          className="input-field disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                          placeholder="الاسم الكامل"
                          disabled={!!memberData[index]}
                        />
                        {errors.members?.[index]?.full_name && (
                          <p className="text-red-400 text-xs mt-1">
                            {errors.members[index]?.full_name?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <input
                          {...register(`members.${index}.email`, {
                            required: 'البريد الإلكتروني مطلوب',
                            pattern: {
                              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                              message: 'بريد إلكتروني غير صالح',
                            },
                          })}
                          type="email"
                          className="input-field disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                          placeholder="البريد الإلكتروني"
                          dir="ltr"
                          disabled={!!memberData[index]}
                        />
                        {errors.members?.[index]?.email && (
                          <p className="text-red-400 text-xs mt-1">
                            {errors.members[index]?.email?.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <input
                          {...register(`members.${index}.phone`, {
                            required: 'رقم الهاتف مطلوب',
                            minLength: { value: 10, message: 'رقم الهاتف يجب أن يكون 10 أرقام على الأقل' },
                          })}
                          type="tel"
                          className="input-field disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                          placeholder="رقم الهاتف"
                          dir="ltr"
                          disabled={!!memberData[index]}
                        />
                        {errors.members?.[index]?.phone && (
                          <p className="text-red-400 text-xs mt-1">
                            {errors.members[index]?.phone?.message}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {fields.length < 6 && (
                <button
                  type="button"
                  onClick={addMember}
                  className="w-full mt-4 p-4 border-2 border-dashed border-teknofest-light-blue/30 rounded-xl text-gray-400 hover:border-teknofest-orange hover:text-teknofest-orange transition-colors flex items-center justify-center gap-2"
                >
                  <UserPlus className="w-5 h-5" />
                  إضافة عضو جديد
                </button>
              )}

              <div className="flex justify-between mt-8">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex items-center gap-2 px-6 py-3 text-gray-300 hover:text-white transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                  السابق
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !validateTeamGender().isValid}
                  className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? (
                    <>
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري التسجيل...
                    </>
                  ) : (
                    <>
                      <Check className="w-5 h-5" />
                      تسجيل الفريق
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}

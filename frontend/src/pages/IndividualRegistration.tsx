import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { User, Lightbulb, Users, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { PROJECT_FIELDS, type Individual, type RegistrationType, type Gender } from '../types'
import { individualsService, iForgotService } from '../services/api'

interface IndividualFormData {
  membership_number: string
  full_name: string
  email: string
  phone: string
  technical_skills: string
  interests: string
  experience_level: string
  preferred_field: string
  project_idea?: string
  gender: Gender
}

const GENDER_LABELS: Record<Gender, string> = {
  male: 'ذكر',
  female: 'أنثى',
}

const experienceLevels = [
  { value: 'beginner', label: 'مبتدئ' },
  { value: 'intermediate', label: 'متوسط' },
  { value: 'advanced', label: 'متقدم' },
  { value: 'expert', label: 'خبير' },
]

export default function IndividualRegistration() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [hasIdea, setHasIdea] = useState<boolean | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verifyingMembership, setVerifyingMembership] = useState(false)
  const [membershipStatus, setMembershipStatus] = useState<'valid' | 'invalid' | null>(null)
  const [memberData, setMemberData] = useState<{ full_name: string; email: string; phone: string } | null>(null)
  const membershipRequestId = useRef<number>(0)

  const {
    register,
    handleSubmit,
    trigger,
    setValue,
    formState: { errors },
  } = useForm<IndividualFormData>({
    defaultValues: { gender: 'male' },
  })

  const verifyMembershipNumber = async (membershipNumber: string) => {
    if (!membershipNumber) {
      setMembershipStatus(null)

      const wasAutofilled = !!memberData
      setMemberData(null)

      if (wasAutofilled) {
        setValue('full_name', '')
        setValue('email', '')
        setValue('phone', '')
      }
      return
    }

    if (membershipNumber.length !== 7) {
      setMembershipStatus('invalid')

      const wasAutofilled = !!memberData
      setMemberData(null)

      if (wasAutofilled) {
        setValue('full_name', '')
        setValue('email', '')
        setValue('phone', '')
      }
      return
    }
      

    const requestId = Date.now()
    membershipRequestId.current = requestId
    setVerifyingMembership(true)

    try {
      const memberResponse = await iForgotService.verifyMembershipNumber(membershipNumber)

      if (membershipRequestId.current !== requestId) return

      if (memberResponse.success) {
        setMembershipStatus('valid')

        const data = {
          full_name: memberResponse.member.ar_name || '',
          email: memberResponse.member.email || '',
          phone: memberResponse.member.phone || '',
        }

        setMemberData(data)

        setValue('full_name', data.full_name)
        setValue('email', data.email)
        setValue('phone', data.phone)

        // set gender from API (male/female)
        setValue('gender', memberResponse.member.sex)
      } else {
        setMembershipStatus('invalid')
        setMemberData(null)
        setValue('full_name', '')
        setValue('email', '')
        setValue('phone', '')
      }
    } catch {
      if (membershipRequestId.current !== requestId) return
      setMembershipStatus('invalid')
      setMemberData(null)
      setValue('full_name', '')
      setValue('email', '')
      setValue('phone', '')
    } finally {
      if (membershipRequestId.current === requestId) setVerifyingMembership(false)
    }
  }

  const useDebounce = (callback: Function, delay: number) => {
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    useEffect(() => {
      return () => {
        if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
      }
    }, [])

    return (...args: any[]) => {
      if (timeoutRef.current !== null) clearTimeout(timeoutRef.current)
      timeoutRef.current = setTimeout(() => callback(...args), delay)
    }
  }

  const debouncedVerify = useDebounce(verifyMembershipNumber, 800)


  const onSubmit = async (data: IndividualFormData) => {
    const hasMembership = !!data.membership_number?.trim()
    if (hasMembership && membershipStatus !== 'valid') {
      toast.error('يرجى إدخال رقم عضوية صحيح')
      return
    }

    setIsSubmitting(true)
    try {
      const registrationType: RegistrationType = hasIdea
        ? 'individual_with_idea'
        : 'individual_no_idea'

      const individualData: Omit<Individual, 'id'> = {
        ...data,
        registration_type: registrationType,
        preferred_field: data.preferred_field as any,
        gender: data.gender,
        membership_number: data.membership_number
      }

      await individualsService.create(individualData)
      toast.success('تم التسجيل بنجاح! سيتم التواصل معك قريباً')
      navigate('/')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'حدث خطأ أثناء التسجيل')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-4">
            <User className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">تسجيل فردي</h1>
          <p className="text-gray-400">سجّل كفرد وسيتم ضمك لفريق مناسب</p>
        </div>

        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4 mb-12">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition-colors ${
                  step >= s
                    ? 'bg-purple-500 text-white'
                    : 'bg-teknofest-medium-blue text-gray-400'
                }`}
              >
                {step > s ? <Check className="w-5 h-5" /> : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-16 sm:w-24 h-1 mx-2 rounded ${
                    step > s ? 'bg-purple-500' : 'bg-teknofest-medium-blue'
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
                  <h3 className="text-xl font-bold text-white mb-2">نعم، لدي فكرة</h3>
                  <p className="text-gray-400 text-sm">
                    لدي فكرة مشروع وأبحث عن فريق لتنفيذها
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
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-teknofest-light-blue/30 hover:border-purple-500/50'
                  }`}
                >
                  <Users className="w-12 h-12 text-purple-400 mx-auto mb-4" />
                  <h3 className="text-xl font-bold text-white mb-2">لا، أبحث عن فريق</h3>
                  <p className="text-gray-400 text-sm">
                    أريد الانضمام لفريق والمساهمة بمهاراتي
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Personal Info */}
          {step === 2 && (
            <div className="card fade-in">
              <h2 className="text-2xl font-bold text-white mb-6">المعلومات الشخصية</h2>

              <div className="space-y-6">
                <div>
                  <label className="block text-white font-medium mb-2">رقم العضوية *</label>
                  <input
                    {...register('membership_number', {
                      validate: (v) => !v || v.length === 7 || 'رقم العضوية يجب أن يكون 7 أرقام',
                    })}
                    type="text"
                    className="input-field"
                    placeholder="رقم العضوية"
                    onChange={(e) => {
                      register('membership_number').onChange(e)
                      debouncedVerify(e.target.value)
                    }}
                  />

                  <div className="mt-2 flex items-center gap-2">
                    {verifyingMembership && (
                      <div className="flex items-center gap-2 text-blue-400 text-xs">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                        <span>جاري التحقق...</span>
                      </div>
                    )}
                    {!verifyingMembership && membershipStatus === 'valid' && (
                      <div className="flex items-center gap-2 text-green-400 text-xs">
                        <span>رقم العضوية صحيح</span>
                      </div>
                    )}
                    {!verifyingMembership && membershipStatus === 'invalid' && !errors.membership_number && (
                      <div className="flex items-center gap-2 text-red-400 text-xs">
                        <span>رقم العضوية غير صحيح</span>
                      </div>
                    )}
                  </div>

                  {errors.membership_number && (
                    <p className="text-red-400 text-sm mt-1">{errors.membership_number.message}</p>
                  )}
                </div>

                {/* Full Name */}
                <div>
                  <label className="block text-white font-medium mb-2">الاسم الكامل *</label>
                  <input
                    {...register('full_name', {
                      required: 'الاسم مطلوب',
                      minLength: { value: 2, message: 'الاسم قصير جداً' },
                    })}
                    type="text"
                    disabled={!!memberData?.full_name}
                    className="input-field disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="أدخل اسمك الكامل"
                  />
                  {errors.full_name && (
                    <p className="text-red-400 text-sm mt-1">{errors.full_name.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-white font-medium mb-2">البريد الإلكتروني *</label>
                  <input
                    {...register('email', {
                      required: 'البريد الإلكتروني مطلوب',
                      pattern: {
                        value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                        message: 'بريد إلكتروني غير صالح',
                      },
                    })}
                    type="email"
                    placeholder="example@email.com"
                    disabled={!!memberData?.full_name}
                    className="input-field disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    dir="ltr"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-white font-medium mb-2">رقم الهاتف *</label>
                  <input
                    {...register('phone', {
                      required: 'رقم الهاتف مطلوب',
                      minLength: { value: 10, message: 'رقم الهاتف غير صالح' },
                    })}
                    type="tel"
                    disabled={!!memberData?.full_name}
                    className="input-field disabled:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-60"
                    placeholder="+90 XXX XXX XXXX"
                    dir="ltr"
                  />
                  {errors.phone && (
                    <p className="text-red-400 text-sm mt-1">{errors.phone.message}</p>
                  )}
                </div>
                
                {membershipStatus !== 'valid' && (
                <div>
                  <label className="block text-white font-medium mb-2">الجنس *</label>
                  <select
                    {...register('gender', { required: 'يرجى اختيار الجنس' })}
                    className="input-field"
                  >
                    <option value="male">{GENDER_LABELS.male}</option>
                    <option value="female">{GENDER_LABELS.female}</option>
                  </select>

                  {errors.gender && (
                    <p className="text-red-400 text-sm mt-1">{errors.gender.message as string}</p>
                  )}
                </div>
              )}

                {/* Experience Level */}
                <div>
                  <label className="block text-white font-medium mb-2"> مستوى الخبرة في مجالك *</label>
                  <select
                    {...register('experience_level', { required: 'يرجى اختيار مستوى الخبرة' })}
                    className="input-field"
                  >
                    <option value="">اختر مستوى خبرتك</option>
                    {experienceLevels.map((level) => (
                      <option key={level.value} value={level.value}>
                        {level.label}
                      </option>
                    ))}
                  </select>
                  {errors.experience_level && (
                    <p className="text-red-400 text-sm mt-1">{errors.experience_level.message}</p>
                  )}
                </div>
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
                  onClick={async () => {
                    const fieldsToValidate: any = ['full_name', 'email', 'phone', 'experience_level']
                    if (membershipStatus !== 'valid') fieldsToValidate.push('gender')

                    const isValid = await trigger(fieldsToValidate)
                    if (isValid) {
                      setStep(3)
                    }
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  التالي
                  <ChevronLeft className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Skills & Interests */}
          {step === 3 && (
            <div className="card fade-in">
              <h2 className="text-2xl font-bold text-white mb-6">المهارات والاهتمامات</h2>

              <div className="space-y-6">
                {/* Preferred Field */}
                <div>
                  <label className="block text-white font-medium mb-2">المجال المفضل *</label>
                  <select
                    {...register('preferred_field', { required: 'يرجى اختيار المجال المفضل' })}
                    className="input-field"
                  >
                    <option value="">اختر المسابقة المفضلة</option>
                    {PROJECT_FIELDS.map((field) => (
                      <option key={field.value} value={field.value}>
                        {field.label}
                      </option>
                    ))}
                  </select>
                  {errors.preferred_field && (
                    <p className="text-red-400 text-sm mt-1">{errors.preferred_field.message}</p>
                  )}
                </div>

                {/* Technical Skills */}
                <div>
                  <label className="block text-white font-medium mb-2">المهارات التقنية *</label>
                  <textarea
                    {...register('technical_skills', {
                      required: 'يرجى ذكر مهاراتك التقنية',
                      minLength: { value: 10, message: 'يرجى كتابة المزيد عن مهاراتك' },
                    })}
                    className="input-field min-h-[100px]"
                    placeholder="مثال: Python, JavaScript, تعلم الآلة, تطوير تطبيقات الجوال..."
                  />
                  {errors.technical_skills && (
                    <p className="text-red-400 text-sm mt-1">{errors.technical_skills.message}</p>
                  )}
                </div>

                {/* Interests */}
                <div>
                  <label className="block text-white font-medium mb-2">الاهتمامات *</label>
                  <textarea
                    {...register('interests', {
                      required: 'يرجى ذكر اهتماماتك',
                      minLength: { value: 10, message: 'يرجى كتابة المزيد عن اهتماماتك' },
                    })}
                    className="input-field min-h-[100px]"
                    placeholder="مثال: الذكاء الاصطناعي، الروبوتات، الطاقة المتجددة..."
                  />
                  {errors.interests && (
                    <p className="text-red-400 text-sm mt-1">{errors.interests.message}</p>
                  )}
                </div>

                {/* Project Idea (if hasIdea) */}
                {hasIdea && (
                  <div>
                    <label className="block text-white font-medium mb-2">فكرة المشروع *</label>
                    <textarea
                      {...register('project_idea', {
                        required: hasIdea ? 'يرجى وصف فكرة مشروعك' : false,
                        minLength: hasIdea
                          ? { value: 50, message: 'يرجى كتابة وصف أطول لفكرتك' }
                          : undefined,
                      })}
                      className="input-field min-h-[150px]"
                      placeholder="صف فكرة مشروعك بالتفصيل..."
                    />
                    {errors.project_idea && (
                      <p className="text-red-400 text-sm mt-1">{errors.project_idea.message}</p>
                    )}
                  </div>
                )}
              </div>

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
                  disabled={isSubmitting}
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
                      إرسال التسجيل
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

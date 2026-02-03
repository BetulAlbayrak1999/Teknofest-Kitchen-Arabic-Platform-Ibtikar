import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { User, Lightbulb, Users, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { PROJECT_FIELDS, type Individual, type RegistrationType, type Gender } from '../types'
import { individualsService } from '../services/api'

interface IndividualFormData {
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

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<IndividualFormData>({
    defaultValues: { gender: 'male' },
  })

  const onSubmit = async (data: IndividualFormData) => {
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
                {/* Full Name */}
                <div>
                  <label className="block text-white font-medium mb-2">الاسم الكامل *</label>
                  <input
                    {...register('full_name', {
                      required: 'الاسم مطلوب',
                      minLength: { value: 2, message: 'الاسم قصير جداً' },
                    })}
                    type="text"
                    className="input-field"
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
                    className="input-field"
                    placeholder="example@email.com"
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
                    className="input-field"
                    placeholder="+90 XXX XXX XXXX"
                    dir="ltr"
                  />
                  {errors.phone && (
                    <p className="text-red-400 text-sm mt-1">{errors.phone.message}</p>
                  )}
                </div>
                
                {/* Gender */}
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
                    const isValid = await trigger(['full_name', 'email', 'phone', 'experience_level'])
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

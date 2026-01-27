import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import {
  FileText,
  Upload,
  Image,
  FileImage,
  PenTool,
  Check,
  AlertCircle,
} from 'lucide-react'
import { PROJECT_FIELDS, type ProjectField } from '../types'
import { projectsService } from '../services/api'

interface ProjectFormData {
  member_email: string
  title: string
  problem_statement: string
  technical_description: string
  scientific_reference: string
  field: ProjectField
}

export default function ProjectSubmission() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [attachments, setAttachments] = useState<{
    image: File | null
    diagram: File | null
    design: File | null
  }>({ image: null, diagram: null, design: null })

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ProjectFormData>()

  const technicalDescription = watch('technical_description', '')
  const charCount = technicalDescription?.length || 0
  const minChars = 1000

  const handleFileChange = (type: 'image' | 'diagram' | 'design', file: File | null) => {
    setAttachments((prev) => ({ ...prev, [type]: file }))
  }

  const onSubmit = async (data: ProjectFormData) => {
    if (charCount < minChars) {
      toast.error(`الوصف التقني يجب أن يكون ${minChars} حرف على الأقل`)
      return
    }

    setIsSubmitting(true)
    try {
      // Submit project
      const project = await projectsService.submit({
        member_email: data.member_email,
        title: data.title,
        problem_statement: data.problem_statement,
        technical_description: data.technical_description,
        scientific_reference: data.scientific_reference,
        field: data.field,
      })

      // Upload attachments if any
      if (attachments.image || attachments.diagram || attachments.design) {
        const formData = new FormData()
        if (attachments.image) formData.append('image', attachments.image)
        if (attachments.diagram) formData.append('diagram', attachments.diagram)
        if (attachments.design) formData.append('design', attachments.design)

        await projectsService.uploadAttachments(project.id!, formData)
      }

      toast.success('تم تقديم المشروع بنجاح!')
      navigate('/')
    } catch (error: any) {
      toast.error(error.response?.data?.detail || 'حدث خطأ أثناء تقديم المشروع')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl mb-4">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">تقديم المشروع</h1>
          <p className="text-gray-400">قدّم مشروع الفريق مع الوصف التقني الكامل</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* Basic Info Card */}
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-teknofest-orange" />
              معلومات المشروع الأساسية
            </h2>

            <div className="space-y-6">
              {/* Member Email */}
              <div>
                <label className="block text-white font-medium mb-2">البريد الإلكتروني *</label>
                <p className="text-gray-400 text-sm mb-2">
                  أدخل البريد الإلكتروني المستخدم عند التسجيل 
                </p>
                <input
                  {...register('member_email', {
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
                {errors.member_email && (
                  <p className="text-red-400 text-sm mt-1">{errors.member_email.message}</p>
                )}
              </div>

              {/* Project Title */}
              <div>
                <label className="block text-white font-medium mb-2">عنوان المشروع *</label>
                <input
                  {...register('title', {
                    required: 'عنوان المشروع مطلوب',
                    minLength: { value: 5, message: 'العنوان قصير جداً' },
                  })}
                  type="text"
                  className="input-field"
                  placeholder="أدخل عنوان مشروعك"
                />
                {errors.title && (
                  <p className="text-red-400 text-sm mt-1">{errors.title.message}</p>
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
            </div>
          </div>

          {/* Problem Statement Card */}
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-400" />
              المشكلة التي يحلها المشروع
            </h2>

            <div>
              <textarea
                {...register('problem_statement', {
                  required: 'يرجى وصف المشكلة',
                  minLength: { value: 50, message: 'يرجى كتابة وصف أطول للمشكلة' },
                })}
                className="input-field min-h-[150px]"
                placeholder="صف المشكلة التي يهدف مشروعك لحلها بالتفصيل..."
              />
              {errors.problem_statement && (
                <p className="text-red-400 text-sm mt-1">{errors.problem_statement.message}</p>
              )}
            </div>
          </div>

          {/* Technical Description Card */}
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <PenTool className="w-5 h-5 text-teknofest-cyan" />
              الوصف التقني
            </h2>
            <p className="text-gray-400 text-sm mb-4">
              يجب أن يكون الوصف التقني {minChars} حرف على الأقل
            </p>

            <div>
              <textarea
                {...register('technical_description', {
                  required: 'الوصف التقني مطلوب',
                  minLength: { value: minChars, message: `الوصف يجب أن يكون ${minChars} حرف على الأقل` },
                })}
                className="input-field min-h-[300px]"
                placeholder="اكتب الوصف التقني المفصل لمشروعك هنا..."
              />
              <div className="flex justify-between items-center mt-2">
                {errors.technical_description && (
                  <p className="text-red-400 text-sm">{errors.technical_description.message}</p>
                )}
                <div
                  className={`text-sm ${
                    charCount >= minChars ? 'text-green-400' : 'text-yellow-400'
                  }`}
                >
                  {charCount} / {minChars} حرف
                  {charCount >= minChars && <Check className="inline w-4 h-4 mr-1" />}
                </div>
              </div>
            </div>
          </div>

          {/* Scientific Reference Card */}
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-400" />
              المرجع العلمي
            </h2>

            <div>
              <textarea
                {...register('scientific_reference', {
                  required: 'المرجع العلمي مطلوب',
                })}
                className="input-field min-h-[100px]"
                placeholder="أضف المراجع العلمية التي استندت إليها..."
              />
              {errors.scientific_reference && (
                <p className="text-red-400 text-sm mt-1">{errors.scientific_reference.message}</p>
              )}
            </div>
          </div>

          {/* Attachments Card */}
          <div className="card">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-400" />
              المرفقات
            </h2>
            <p className="text-gray-400 text-sm mb-2">
              إضافة المرفقات اختيارية ولكنها تمنحك نقاط إضافية
            </p>
            <p className="text-gray-500 text-xs mb-6">
              الأنواع المسموحة: PNG, JPG, JPEG, PDF, ZIP
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Project Image */}
              <div className="p-4 border-2 border-dashed border-teknofest-light-blue/30 rounded-xl hover:border-teknofest-orange/50 transition-colors">
                <div className="text-center">
                  <Image className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-white font-medium mb-2">صورة المشروع</h3>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf,.zip"
                    onChange={(e) => handleFileChange('image', e.target.files?.[0] || null)}
                    className="hidden"
                    id="image-upload"
                  />
                  <label
                    htmlFor="image-upload"
                    className="cursor-pointer text-teknofest-orange hover:text-teknofest-orange-hover text-sm"
                  >
                    {attachments.image ? attachments.image.name : 'اختر ملف'}
                  </label>
                </div>
              </div>

              {/* Diagram */}
              <div className="p-4 border-2 border-dashed border-teknofest-light-blue/30 rounded-xl hover:border-teknofest-orange/50 transition-colors">
                <div className="text-center">
                  <FileImage className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-white font-medium mb-2">المخطط</h3>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf,.zip"
                    onChange={(e) => handleFileChange('diagram', e.target.files?.[0] || null)}
                    className="hidden"
                    id="diagram-upload"
                  />
                  <label
                    htmlFor="diagram-upload"
                    className="cursor-pointer text-teknofest-orange hover:text-teknofest-orange-hover text-sm"
                  >
                    {attachments.diagram ? attachments.diagram.name : 'اختر ملف'}
                  </label>
                </div>
              </div>

              {/* Design */}
              <div className="p-4 border-2 border-dashed border-teknofest-light-blue/30 rounded-xl hover:border-teknofest-orange/50 transition-colors">
                <div className="text-center">
                  <PenTool className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                  <h3 className="text-white font-medium mb-2">التصميم المبدئي</h3>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.pdf,.zip"
                    onChange={(e) => handleFileChange('design', e.target.files?.[0] || null)}
                    className="hidden"
                    id="design-upload"
                  />
                  <label
                    htmlFor="design-upload"
                    className="cursor-pointer text-teknofest-orange hover:text-teknofest-orange-hover text-sm"
                  >
                    {attachments.design ? attachments.design.name : 'اختر ملف'}
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-center">
            <button
              type="submit"
              disabled={isSubmitting || charCount < minChars}
              className="btn-primary px-12 py-4 text-lg flex items-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <span className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  جاري التقديم...
                </>
              ) : (
                <>
                  <Check className="w-6 h-6" />
                  تقديم المشروع
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

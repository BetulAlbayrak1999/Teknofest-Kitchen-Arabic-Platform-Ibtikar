import { Link } from 'react-router-dom'
import { Users, User, FileText, Trophy, Rocket, ArrowLeft, Sparkles } from 'lucide-react'
import Logo from '../components/Logo'

const features = [
  {
    icon: Users,
    title: 'تسجيل كفريق',
    description: 'سجّل فريقك المكون من 3-6 أعضاء وشارك في المسابقات',
    link: '/register/team',
    color: 'from-blue-500 to-cyan-400',
  },
  {
    icon: User,
    title: 'تسجيل فردي',
    description: 'سجّل كفرد وسيتم ضمك لفريق مناسب',
    link: '/register/individual',
    color: 'from-purple-500 to-pink-400',
  },
  {
    icon: FileText,
    title: 'تقديم المشروع',
    description: 'قدّم مشروعك مع الوصف التقني والمرفقات',
    link: '/project/submit',
    color: 'from-orange-500 to-red-400',
  },
  {
    icon: Trophy,
    title: 'أفضل الفرق',
    description: 'تعرّف على أفضل الفرق المشاركة',
    link: '/top-teams',
    color: 'from-yellow-500 to-orange-400',
  },
]

export default function Home() {
  return (
    <div className="relative">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center overflow-hidden">
        {/* Background Decoration */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-teknofest-orange/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-1/4 left-1/4 w-80 h-80 bg-teknofest-cyan/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-teknofest-orange/20 border border-teknofest-orange/30 rounded-full mb-8">
            <Sparkles className="w-4 h-4 text-teknofest-orange" />
            <span className="text-teknofest-orange font-medium">مسابقات تكنوفيست 2026</span>
          </div>

          {/* Main Title */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white mb-6 leading-tight">
           مطبخ تكنوفيست
            <span className="block text-transparent bg-clip-text bg-gradient-to-l from-teknofest-orange to-teknofest-cyan">
              مع ابتكار
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-xl sm:text-2xl text-gray-300 max-w-3xl mx-auto mb-10 leading-relaxed">
            هنا تعيش تجربة حقيقية لمسابقات تكنوفيست. سجّل الآن وجرب أكبر حدث تكنولوجي في المنطقة!
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register/team"
              className="btn-primary inline-flex items-center justify-center gap-2 text-lg"
            >
              <Rocket className="w-5 h-5" />
              سجّل فريقك الآن
            </Link>
            <Link
              to="/register/individual"
              className="btn-secondary inline-flex items-center justify-center gap-2 text-lg"
            >
              تسجيل فردي
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-teknofest-orange">17+</div>
              <div className="text-gray-400 mt-1">مسابقة</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-teknofest-cyan">1000+</div>
              <div className="text-gray-400 mt-1">مشارك</div>
            </div>
            <div className="text-center">
              <div className="text-3xl sm:text-4xl font-bold text-purple-400">50+</div>
              <div className="text-gray-400 mt-1">فريق</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">ابدأ رحلتك</h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              اختر طريقة التسجيل المناسبة لك وانضم إلى آلاف المبتكرين
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <Link
                  key={index}
                  to={feature.link}
                  className="card group hover:border-teknofest-orange/50 transition-all duration-300 hover:transform hover:-translate-y-2"
                >
                  <div
                    className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <Icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-gray-400">{feature.description}</p>
                  <div className="mt-4 flex items-center gap-2 text-teknofest-orange opacity-0 group-hover:opacity-100 transition-opacity">
                    <span>ابدأ الآن</span>
                    <ArrowLeft className="w-4 h-4" />
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </section>

      {/* Competitions Section */}
      <section className="py-20 bg-teknofest-blue/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">المسابقات المتاحة</h2>
            <p className="text-gray-400 text-lg">اختر المسابقة التي تناسب مهاراتك واهتماماتك</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              'مسابقة التنقل الذكي',
              'مسابقة ابتكار التكنولوجيا الحيوية',
              'مسابقة تقنيات البيئة والطاقة',
              'مسابقة تقنيات التعليم',
              'مسابقة التكنولوجيا لصالح البشرية',
              'مسابقة الذكاء الاصطناعي في الصحة',
              'مسابقة التقنيات الصناعية',
              'مسابقة التكنولوجيا الزراعية',
              'مسابقة تطبيقات نماذج اللغة الضخمة',
            ].map((competition, index) => (
              <div
                key={index}
                className="glass-card flex items-center gap-3 hover:bg-white/10 transition-colors cursor-pointer"
              >
                <div className="w-2 h-2 rounded-full bg-teknofest-orange" />
                <span className="text-white">{competition}</span>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              to="/register/team"
              className="inline-flex items-center gap-2 text-teknofest-cyan hover:text-white transition-colors"
            >
              عرض جميع المسابقات (17 مسابقة)
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="card text-center bg-gradient-to-br from-teknofest-orange/20 to-teknofest-red/10 border-teknofest-orange/30">
            <div className="flex justify-center mb-6">
              <Logo size="lg" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">جاهز للانطلاق؟</h2>
            <p className="text-gray-300 text-lg mb-8 max-w-2xl mx-auto">
              لا تفوّت الفرصة! سجّل الآن وكن جزءاً من مستقبل التكنولوجيا. الأفكار العظيمة تبدأ من هنا.
            </p>
            <Link to="/register/team" className="btn-primary inline-flex items-center gap-2">
              <Rocket className="w-5 h-5" />
              ابدأ التسجيل
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

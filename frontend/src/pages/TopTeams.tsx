import { useState, useEffect } from 'react'
import { Trophy, Medal, Star, Users, Loader2 } from 'lucide-react'
import { evaluationsService } from '../services/api'
import type { TopTeam } from '../types'

export default function TopTeams() {
  const [teams, setTeams] = useState<TopTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchTopTeams = async () => {
      try {
        const data = await evaluationsService.getTopTeams(5)
        setTeams(data)
      } catch (err: any) {
        setError(err.response?.data?.detail || 'حدث خطأ في تحميل البيانات')
      } finally {
        setLoading(false)
      }
    }

    fetchTopTeams()
  }, [])

  const getRankStyle = (rank: number) => {
    switch (rank) {
      case 1:
        return {
          bg: 'from-yellow-500/20 to-yellow-600/10',
          border: 'border-yellow-500/50',
          badge: 'bg-gradient-to-r from-yellow-400 to-yellow-600',
          icon: '🥇',
        }
      case 2:
        return {
          bg: 'from-gray-300/20 to-gray-400/10',
          border: 'border-gray-400/50',
          badge: 'bg-gradient-to-r from-gray-300 to-gray-500',
          icon: '🥈',
        }
      case 3:
        return {
          bg: 'from-orange-600/20 to-orange-700/10',
          border: 'border-orange-600/50',
          badge: 'bg-gradient-to-r from-orange-500 to-orange-700',
          icon: '🥉',
        }
      default:
        return {
          bg: 'from-teknofest-blue/50 to-teknofest-medium-blue/30',
          border: 'border-teknofest-light-blue/30',
          badge: 'bg-teknofest-medium-blue',
          icon: rank.toString(),
        }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-teknofest-orange animate-spin mx-auto mb-4" />
          <p className="text-gray-400">جاري تحميل البيانات...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trophy className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="btn-secondary"
          >
            إعادة المحاولة
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen py-12 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl mb-4 animate-float">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">أفضل الفرق</h1>
          <p className="text-gray-400 text-lg">الفرق المتميزة في مسابقات تكنوفيست</p>
        </div>

        {teams.length === 0 ? (
          <div className="card text-center py-16">
            <Medal className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">لا توجد نتائج بعد</h2>
            <p className="text-gray-400">سيتم عرض أفضل الفرق بعد انتهاء التقييمات</p>
          </div>
        ) : (
          <div className="space-y-6">
            {teams.map((team) => {
              const style = getRankStyle(team.rank)
              return (
                <div
                  key={team.rank}
                  className={`card bg-gradient-to-br ${style.bg} border ${style.border} transform hover:scale-[1.02] transition-all duration-300`}
                >
                  <div className="flex flex-col lg:flex-row gap-6">
                    {/* Rank Badge */}
                    <div className="flex-shrink-0">
                      <div
                        className={`w-20 h-20 ${style.badge} rounded-2xl flex items-center justify-center text-3xl font-bold text-white shadow-lg`}
                      >
                        {team.rank <= 3 ? style.icon : team.rank}
                      </div>
                    </div>

                    {/* Team Info */}
                    <div className="flex-grow">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                        <div>
                          <h2 className="text-2xl font-bold text-white mb-1">
                            {team.project_title}
                          </h2>
                          <p className="text-teknofest-cyan font-medium">{team.team_name}</p>
                        </div>
                        <div className="flex items-center gap-2 px-4 py-2 bg-teknofest-dark-blue/50 rounded-lg">
                          <Star className="w-5 h-5 text-yellow-400" />
                          <span className="text-2xl font-bold text-white">
                            {team.total_score.toFixed(1)}
                          </span>
                          <span className="text-gray-400 text-sm">/ 100</span>
                        </div>
                      </div>

                      <p className="text-gray-300 mb-4 line-clamp-2">
                        {team.project_description}
                      </p>

                      <div className="flex flex-wrap items-center gap-4">
                        {/* Field Badge */}
                        <span className="px-3 py-1 bg-teknofest-orange/20 text-teknofest-orange rounded-full text-sm">
                          {team.field}
                        </span>

                        {/* Score Breakdown */}
                        <div className="flex items-center gap-4 text-sm">
                          <span className="text-gray-400">
                            تقييم الإداريين من 75:{' '}
                            <span className="text-white font-medium">{team.admin_score.toFixed(1)}</span>
                          </span>
                          <span className="text-gray-400">
                           تقييم AI من 25:{' '}
                            <span className="text-white font-medium">{team.ai_score.toFixed(1)}</span>
                          </span>
                        </div>
                      </div>

                      {/* Team Members */}
                      <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-2 text-gray-400">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">أعضاء الفريق:</span>
                          <span className="text-white text-sm">
                            {team.team_members.join('، ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Legend */}
        <div className="mt-12 card bg-teknofest-dark-blue/50">
          <h3 className="text-lg font-bold text-white mb-4">نظام التقييم</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teknofest-orange/20 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-teknofest-orange" />
              </div>
              <span className="text-gray-300">
                <span className="text-white font-medium">75%</span> تقييم لجنة التحكيم
              </span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teknofest-cyan/20 rounded-lg flex items-center justify-center">
                <Star className="w-4 h-4 text-teknofest-cyan" />
              </div>
              <span className="text-gray-300">
                <span className="text-white font-medium">25%</span> تقييم الذكاء الاصطناعي
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

import type { GameResult } from "@rahoot/common/types/game"
import { Medal, Trophy } from "lucide-react"

type Props = {
  result: GameResult
}

const ResultModalAll = ({ result }: Props) => {
  const totalQuestions = result.questions.length

  // Har bir o'yinchi uchun to'g'ri javoblar sonini hisoblash
  const playerStats = result.players.map((player) => {
    const correctCount = result.questions.reduce((acc, q) => {
      const pa = q.playerAnswers.find((a) => a.playerName === player.username)
      if (pa && pa.answerId !== null && q.solutions.includes(pa.answerId)) {
        return acc + 1
      }
      return acc
    }, 0)

    const pct =
      totalQuestions > 0
        ? Math.round((correctCount / totalQuestions) * 100)
        : 0

    return {
      username: player.username,
      points: player.points,
      rank: player.rank,
      correctCount,
      pct,
    }
  })

  // foiz bo'yicha tartiblash
  const sorted = [...playerStats].sort((a, b) => b.pct - a.pct)

  const rankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="size-4 text-yellow-400" />
    if (rank === 2) return <Medal className="size-4 text-gray-400" />
    if (rank === 3) return <Medal className="size-4 text-amber-600" />
    return (
      <span className="w-4 text-center text-xs font-bold text-gray-400">
        {rank}
      </span>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      {/* Sarlavha */}
      <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50 px-5 py-2.5">
        <span className="text-xs font-semibold tracking-wide text-gray-500 uppercase">
          Umumiy natija — {totalQuestions} ta savol
        </span>
        <span className="text-xs text-gray-400">{sorted.length} o'yinchi</span>
      </div>

      {/* Jadval */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 border-b border-gray-200 bg-gray-50">
            <tr className="text-left text-xs font-semibold tracking-wide text-gray-500 uppercase">
              <th className="w-10 px-4 py-2.5">#</th>
              <th className="px-4 py-2.5">O'yinchi</th>
              <th className="px-4 py-2.5 text-center">
                To'g'ri / Jami
              </th>
              <th className="px-4 py-2.5">Foiz</th>
              <th className="px-4 py-2.5 text-right">Ball</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {sorted.map((p, i) => {
              const barColor =
                p.pct === 100
                  ? "bg-green-500"
                  : p.pct >= 70
                    ? "bg-blue-400"
                    : p.pct >= 40
                      ? "bg-yellow-400"
                      : "bg-red-400"

              return (
                <tr key={p.username} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-center">
                      {rankIcon(i + 1)}
                    </div>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">
                    {p.username}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="font-semibold text-gray-700">
                      {p.correctCount}
                    </span>
                    <span className="text-gray-400">/{totalQuestions}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-28 overflow-hidden rounded-full bg-gray-100">
                        <div
                          className={`h-full rounded-full transition-all ${barColor}`}
                          style={{ width: `${p.pct}%` }}
                        />
                      </div>
                      <span
                        className={`w-10 text-right text-xs font-bold ${
                          p.pct === 100
                            ? "text-green-600"
                            : p.pct >= 70
                              ? "text-blue-600"
                              : p.pct >= 40
                                ? "text-yellow-600"
                                : "text-red-500"
                        }`}
                      >
                        {p.pct}%
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-700">
                    {p.points}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ResultModalAll

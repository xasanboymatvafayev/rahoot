import type { GameResult } from "@rahoot/common/types/game"
import ResultModalAll from "@rahoot/web/features/manager/components/ResultModal/ResultModalAll"
import ResultModalAnswers from "@rahoot/web/features/manager/components/ResultModal/ResultModalAnswers"
import ResultModalHeader from "@rahoot/web/features/manager/components/ResultModal/ResultModalHeader"
import ResultModalStats from "@rahoot/web/features/manager/components/ResultModal/ResultModalStats"
import ResultModalTable from "@rahoot/web/features/manager/components/ResultModal/ResultModalTable"
import { ResultModalProvider } from "@rahoot/web/features/manager/contexts/result-modal-context"
import { Download } from "lucide-react"
import { useState } from "react"

type Props = {
  result: GameResult
  onClose: () => void
}

// CSV eksport funksiyasi
function exportToCSV(result: GameResult) {
  const totalQ = result.questions.length

  const rows: string[][] = [
    ["O'yinchi", "Ball", "O'rin", "To'g'ri javoblar", "Foiz", "Jamoa"],
  ]

  result.players.forEach((p) => {
    const correct = result.questions.reduce((acc, q) => {
      const pa = q.playerAnswers.find((a) => a.playerName === p.username)
      if (pa && pa.answerId !== null && q.solutions.includes(pa.answerId)) {
        return acc + 1
      }
      return acc
    }, 0)
    const pct = totalQ > 0 ? Math.round((correct / totalQ) * 100) : 0
    rows.push([
      p.username,
      String(p.points),
      String(p.rank),
      `${correct}/${totalQ}`,
      `${pct}%`,
      p.teamName ?? "",
    ])
  })

  const csv = rows.map((r) => r.map((c) => `"${c}"`).join(",")).join("\n")
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${result.subject}-natijalar.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const ResultModal = ({ result, onClose }: Props) => {
  const [activeTab, setActiveTab] = useState<"questions" | "all">("questions")

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded bg-white shadow-2xl">
        <ResultModalProvider result={result} onClose={onClose}>
          <ResultModalHeader activeTab={activeTab} onTabChange={setActiveTab} />

          {activeTab === "questions" ? (
            <>
              <ResultModalAnswers />
              <ResultModalStats />
              <div className="min-h-0 flex-1 overflow-y-auto">
                <ResultModalTable />
              </div>
            </>
          ) : (
            <ResultModalAll result={result} />
          )}

          {/* CSV Yuklab olish tugmasi (YANGI) */}
          <div className="flex shrink-0 justify-end border-t border-gray-100 px-4 py-2">
            <button
              onClick={() => exportToCSV(result)}
              className="flex items-center gap-1.5 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
            >
              <Download className="size-4" />
              CSV yuklab olish
            </button>
          </div>
        </ResultModalProvider>
      </div>
    </div>
  )
}

export default ResultModal

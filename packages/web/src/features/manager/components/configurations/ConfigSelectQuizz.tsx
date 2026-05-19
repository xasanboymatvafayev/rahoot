import { EVENTS, GAME_MODE } from "@rahoot/common/constants"
import Button from "@rahoot/web/components/Button"
import { useSocket } from "@rahoot/web/features/game/contexts/socket-context"
import { useConfig } from "@rahoot/web/features/manager/contexts/config-context"
import clsx from "clsx"
import { Check, Users, User } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"

const ConfigSelectQuizz = () => {
  const { socket } = useSocket()
  const { quizz: quizzList } = useConfig()
  const [selected, setSelected] = useState<string | null>(null)
  const [gameMode, setGameMode] = useState<"solo" | "team">("solo")
  const [teamCount, setTeamCount] = useState(2)
  const { t } = useTranslation()

  const handleSelect = (id: string) => () => {
    setSelected((prev) => (prev === id ? null : id))
  }

  const handleSubmit = () => {
    if (!selected) {
      toast.error(t("manager:quizz.pleaseSelect"))
      return
    }

    socket?.emit(EVENTS.GAME.CREATE, {
      quizzId: selected,
      gameMode,
      teamCount,
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">

      {/* O'yin rejimi tanlash */}
      <div>
        <p className="mb-2 text-sm font-semibold text-gray-600">O'yin rejimi</p>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setGameMode("solo")}
            className={clsx(
              "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all",
              gameMode === "solo"
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-200 text-gray-500 hover:border-gray-300",
            )}
          >
            <User className="size-5" />
            <span className="text-xs font-semibold">Har kishi o'zi</span>
          </button>

          <button
            onClick={() => setGameMode("team")}
            className={clsx(
              "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 transition-all",
              gameMode === "team"
                ? "border-primary bg-primary/5 text-primary"
                : "border-gray-200 text-gray-500 hover:border-gray-300",
            )}
          >
            <Users className="size-5" />
            <span className="text-xs font-semibold">Jamoaviy</span>
          </button>
        </div>

        {/* Jamoa soni */}
        {gameMode === "team" && (
          <div className="mt-3">
            <p className="mb-1 text-xs text-gray-500">Jamoa soni</p>
            <div className="flex gap-2">
              {[2, 3, 4].map((n) => (
                <button
                  key={n}
                  onClick={() => setTeamCount(n)}
                  className={clsx(
                    "flex h-9 w-9 items-center justify-center rounded-md border-2 text-sm font-bold transition-all",
                    teamCount === n
                      ? "border-primary bg-primary text-white"
                      : "border-gray-200 text-gray-600 hover:border-gray-300",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <hr className="text-gray-100" />

      {/* Viktorina tanlash */}
      {quizzList.length > 0 && (
        <Button className="shrink-0" onClick={handleSubmit}>
          {gameMode === "team"
            ? `${teamCount} jamoa bilan boshlash`
            : t("manager:quizz.startGame")}
        </Button>
      )}

      <div className="min-h-0 flex-1 space-y-2 overflow-auto p-0.5">
        {quizzList.map((quizz) => (
          <button
            key={quizz.id}
            className="flex w-full items-center justify-between rounded-md p-3 outline outline-gray-300"
            onClick={handleSelect(quizz.id)}
          >
            {quizz.subject}
            <div
              className={clsx(
                "size-5 rounded p-0.5 outline outline-offset-3 outline-gray-300",
                selected === quizz.id && "bg-primary border-primary/80",
              )}
            >
              {selected === quizz.id && (
                <Check className="size-full stroke-2 text-white" />
              )}
            </div>
          </button>
        ))}

        {!quizzList.length && (
          <div className="my-8 text-center text-gray-500">
            <p>{t("manager:quizz.notFound")}</p>
            <p className="text-sm">{t("manager:quizz.pleaseCreate")}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default ConfigSelectQuizz

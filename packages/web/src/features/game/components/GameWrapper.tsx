import { EVENTS } from "@rahoot/common/constants"
import type { Status } from "@rahoot/common/types/game/status"
import background from "@rahoot/web/assets/background.webp"
import Button from "@rahoot/web/components/Button"
import Loader from "@rahoot/web/components/Loader"
import {
  useEvent,
  useSocket,
} from "@rahoot/web/features/game/contexts/socket-context"
import { usePlayerStore } from "@rahoot/web/features/game/stores/player"
import { useQuestionStore } from "@rahoot/web/features/game/stores/question"
import { MANAGER_SKIP_BTN } from "@rahoot/web/features/game/utils/constants"
import clsx from "clsx"
import { type PropsWithChildren, useEffect, useState } from "react"
import toast from "react-hot-toast"
import { useTranslation } from "react-i18next"
import { Square } from "lucide-react"

type Props = PropsWithChildren & {
  statusName: Status | undefined
  onNext?: () => void
  onStop?: () => void     // (YANGI) o'yinni to'xtatish
  manager?: boolean
  gameId?: string
}

const GameWrapper = ({ children, statusName, onNext, onStop, manager, gameId }: Props) => {
  const { isConnected, socket } = useSocket()
  const { player } = usePlayerStore()
  const { questionStates, setQuestionStates } = useQuestionStore()
  const { t } = useTranslation()
  const [isDisabled, setIsDisabled] = useState(false)
  const [showStopConfirm, setShowStopConfirm] = useState(false)
  const next = statusName ? MANAGER_SKIP_BTN[statusName] : null

  useEvent(EVENTS.GAME.UPDATE_QUESTION, ({ current, total }) => {
    setQuestionStates({ current, total })
  })

  useEvent(EVENTS.GAME.ERROR_MESSAGE, (message) => {
    toast.error(t(message))
    setIsDisabled(false)
  })

  useEffect(() => {
    setIsDisabled(false)
    setShowStopConfirm(false)
  }, [statusName])

  const handleNext = () => {
    setIsDisabled(true)
    onNext?.()
  }

  const handleStopClick = () => {
    setShowStopConfirm(true)
  }

  const handleStopConfirm = () => {
    setShowStopConfirm(false)
    if (gameId) {
      socket?.emit(EVENTS.MANAGER.STOP_GAME, { gameId })
    }
    onStop?.()
  }

  return (
    <section className="relative flex min-h-dvh">
      <div className="fixed top-0 left-0 h-full w-full">
        <img
          className="pointer-events-none h-full w-full object-cover select-none"
          src={background}
          alt="background"
        />
      </div>

      <div className="z-10 flex w-full flex-1 flex-col justify-between">
        {!isConnected && !statusName ? (
          <div className="flex h-full w-full flex-1 flex-col items-center justify-center">
            <Loader className="h-30" />
            <h1 className="text-4xl font-bold text-white">
              {t("common:connecting")}
            </h1>
          </div>
        ) : (
          <>
            <div className="flex w-full justify-between p-4">
              {questionStates && (
                <div className="shadow-inset flex items-center rounded-md bg-white p-2 px-4 text-lg font-bold text-black">
                  {`${questionStates.current} / ${questionStates.total}`}
                </div>
              )}

              {manager && (
                <div className="flex gap-2 self-end">
                  {/* O'yinni to'xtatish (YANGI) */}
                  {questionStates && (
                    <button
                      onClick={handleStopClick}
                      className="flex items-center gap-1.5 rounded-md bg-red-500/90 px-3 py-2 text-sm font-bold text-white hover:bg-red-600"
                    >
                      <Square className="size-3.5 fill-white" />
                      To'xtatish
                    </button>
                  )}

                  {next && (
                    <Button
                      className={clsx("bg-white px-4 text-black!", {
                        "pointer-events-none": isDisabled,
                      })}
                      onClick={handleNext}
                    >
                      {t(next)}
                    </Button>
                  )}
                </div>
              )}
            </div>

            {children}

            {!manager && (
              <div className="z-50 flex items-center justify-between bg-white px-4 py-2 text-lg font-bold text-white">
                <p className="text-gray-800">{player?.username}</p>
                <div className="rounded-sm bg-gray-800 px-3 py-1 text-lg">
                  {player?.points}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* To'xtatish tasdiqlash dialogi (YANGI) */}
      {showStopConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
          <div className="rounded-xl bg-white p-6 shadow-2xl w-72 text-center">
            <h3 className="mb-2 text-lg font-bold text-gray-800">O'yinni to'xtatish</h3>
            <p className="mb-5 text-sm text-gray-500">
              O'yinni hozir to'xtatmoqchimisiz? Joriy statistika saqlanadi.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowStopConfirm(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleStopConfirm}
                className="flex-1 rounded-lg bg-red-500 py-2 text-sm font-semibold text-white hover:bg-red-600"
              >
                To'xtatish
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}

export default GameWrapper

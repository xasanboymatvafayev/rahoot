import { EVENTS, MEDIA_TYPES } from "@rahoot/common/constants"
import type { QuestionMediaType } from "@rahoot/common/types/game"
import type { CommonStatusDataMap } from "@rahoot/common/types/game/status"
import QuestionMedia from "@rahoot/web/components/QuestionMedia"
import AnswerButton from "@rahoot/web/features/game/components/AnswerButton"
import TeamChat from "@rahoot/web/features/game/components/TeamChat"
import {
  useEvent,
  useSocket,
} from "@rahoot/web/features/game/contexts/socket-context"
import { usePlayerStore } from "@rahoot/web/features/game/stores/player"
import {
  ANSWERS_COLORS,
  ANSWERS_ICONS,
  SFX,
} from "@rahoot/web/features/game/utils/constants"
import clsx from "clsx"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import useSound from "use-sound"

type Props = {
  data: CommonStatusDataMap["SELECT_ANSWER"]
}

const Answers = ({
  data: { question, answers, media, time, totalPlayer, teamId, teamName },
}: Props) => {
  const { socket } = useSocket()
  const { player, gameId } = usePlayerStore()
  const [cooldown, setCooldown] = useState(time)
  const [totalAnswer, setTotalAnswer] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const { t } = useTranslation()
  const isTeam = !!teamId

  const [sfxPop] = useSound(SFX.ANSWERS.SOUND, { volume: 0.1 })
  const [playMusic, { stop: stopMusic }] = useSound(SFX.ANSWERS.MUSIC, {
    volume: 0.2,
    interrupt: true,
    loop: true,
  })

  const handleAnswer = (answerKey: number) => () => {
    if (!player || !gameId || selected !== null) return
    setSelected(answerKey)
    socket?.emit(EVENTS.PLAYER.SELECTED_ANSWER, {
      gameId,
      data: { answerKey },
    })
    sfxPop()
  }

  useEffect(() => {
    const disabledMusicMedia = [
      MEDIA_TYPES.AUDIO,
      MEDIA_TYPES.VIDEO,
    ] as QuestionMediaType[]

    if (disabledMusicMedia.includes(media?.type)) return

    playMusic()
    return () => {
      stopMusic()
    }
  }, [playMusic])

  useEvent(EVENTS.GAME.COOLDOWN, (sec) => {
    setCooldown(sec)
  })

  useEvent(EVENTS.GAME.PLAYER_ANSWER, (count) => {
    setTotalAnswer(count)
    sfxPop()
  })

  const pct = (cooldown / time) * 100
  const timerColor =
    pct > 50 ? "bg-green-400" : pct > 25 ? "bg-yellow-400" : "bg-red-500"
  const timerPulse = pct <= 25

  return (
    <div className="flex h-full flex-1 flex-col justify-between">
      {isTeam && teamName && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-violet-700/80 px-4 py-1 text-sm font-bold text-white backdrop-blur-sm">
            🏅 {teamName}
          </span>
        </div>
      )}

      <div className="mx-auto inline-flex h-full w-full max-w-7xl flex-1 flex-col items-center justify-center gap-5">
        <h2 className="text-center text-2xl font-bold text-white drop-shadow-lg md:text-4xl lg:text-5xl">
          {question}
        </h2>
        <QuestionMedia media={media} alt={question} />
      </div>

      <div>
        {/* Animatsiyali timer progress bar */}
        <div className="mx-auto mb-2 w-full max-w-7xl px-2">
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/30">
            <div
              className={clsx(
                "h-full rounded-full transition-all duration-1000",
                timerColor,
                timerPulse && "animate-pulse",
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <div className="mx-auto mb-4 flex w-full max-w-7xl justify-between gap-1 px-2 text-lg font-bold text-white md:text-xl">
          <div
            className={clsx(
              "flex flex-col items-center rounded-full bg-black/40 px-4 text-lg font-bold transition-colors",
              timerPulse && "bg-red-700/70",
            )}
          >
            <span className="translate-y-1 text-sm">{t("game:hud.time")}</span>
            <span>{cooldown}</span>
          </div>
          <div className="flex flex-col items-center rounded-full bg-black/40 px-4 text-lg font-bold">
            <span className="translate-y-1 text-sm">
              {t("game:hud.answers")}
            </span>
            <span>
              {totalAnswer}/{totalPlayer}
            </span>
          </div>
        </div>

        <div className="mx-auto mb-4 grid w-full max-w-7xl grid-cols-2 gap-1 rounded-full px-2 text-lg font-bold text-white md:text-xl">
          {answers.map((answer, key) => (
            <AnswerButton
              key={key}
              className={clsx(
                ANSWERS_COLORS[key],
                selected !== null && selected !== key && "scale-95 opacity-40",
                selected === key && "scale-105 ring-4 ring-white/60",
                "transition-all duration-200",
              )}
              icon={ANSWERS_ICONS[key]}
              onClick={handleAnswer(key)}
              disabled={selected !== null}
            >
              {answer}
            </AnswerButton>
          ))}
        </div>
      </div>

      {isTeam && <TeamChat />}
    </div>
  )
}

export default Answers

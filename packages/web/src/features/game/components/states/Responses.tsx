import type { ManagerStatusDataMap } from "@rahoot/common/types/game/status"
import AnswerButton from "@rahoot/web/features/game/components/AnswerButton"
import {
  ANSWERS_COLORS,
  ANSWERS_ICONS,
  SFX,
} from "@rahoot/web/features/game/utils/constants"
import { calculatePercentages } from "@rahoot/web/features/game/utils/score"
import clsx from "clsx"
import { motion } from "motion/react"
import { useEffect, useState } from "react"
import useSound from "use-sound"

type Props = {
  data: ManagerStatusDataMap["SHOW_RESPONSES"]
}

const Responses = ({
  data: { question, answers, responses, solutions },
}: Props) => {
  const [isMusicPlaying, setIsMusicPlaying] = useState(false)
  const [animated, setAnimated] = useState(false)

  const [sfxResults] = useSound(SFX.RESULTS_SOUND, { volume: 0.2 })
  const [playMusic, { stop: stopMusic }] = useSound(SFX.ANSWERS.MUSIC, {
    volume: 0.2,
    onplay: () => setIsMusicPlaying(true),
    onend: () => setIsMusicPlaying(false),
  })

  useEffect(() => {
    stopMusic()
    sfxResults()
    const timer = setTimeout(() => setAnimated(true), 100)
    return () => clearTimeout(timer)
  }, [responses])

  useEffect(() => {
    if (!isMusicPlaying) playMusic()
  }, [isMusicPlaying, playMusic])

  useEffect(() => {
    stopMusic()
  }, [playMusic, stopMusic])

  const totalAnswers = Object.values(responses).reduce((a, b) => a + b, 0)

  return (
    <div className="flex h-full flex-1 flex-col justify-between">
      <div className="mx-auto inline-flex h-full w-full max-w-7xl flex-1 flex-col items-center justify-center gap-5">
        <h2 className="text-center text-2xl font-bold text-white drop-shadow-lg md:text-4xl lg:text-5xl">
          {question}
        </h2>

        {/* Animatsiyali bar grafik */}
        <div
          className="mt-8 grid h-44 w-full max-w-3xl items-end gap-4 px-2"
          style={{ gridTemplateColumns: `repeat(${answers.length}, 1fr)` }}
        >
          {answers.map((_, key) => {
            const count = responses[key] || 0
            const rawPct =
              totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0
            const isCorrect = solutions.includes(key)

            return (
              <div key={key} className="flex flex-col items-center gap-1">
                <span className="text-sm font-bold text-white drop-shadow">
                  {count > 0 ? `${rawPct}%` : ""}
                </span>
                <motion.div
                  className={clsx(
                    "w-full overflow-hidden rounded-md",
                    ANSWERS_COLORS[key],
                    !isCorrect && "opacity-60",
                    isCorrect && "ring-4 ring-white/50",
                  )}
                  initial={{ height: 8 }}
                  animate={{
                    height: animated ? Math.max(8, (rawPct / 100) * 160) : 8,
                  }}
                  transition={{
                    duration: 0.8,
                    ease: "easeOut",
                    delay: key * 0.1,
                  }}
                >
                  <span className="block w-full bg-black/10 py-1 text-center text-lg font-bold text-white drop-shadow-md">
                    {count}
                  </span>
                </motion.div>
              </div>
            )
          })}
        </div>
      </div>

      <div>
        <div className="mx-auto mb-4 grid w-full max-w-7xl grid-cols-2 gap-1 rounded-full px-2 text-lg font-bold text-white md:text-xl">
          {answers.map((answer, key) => (
            <AnswerButton
              key={key}
              className={clsx(ANSWERS_COLORS[key], {
                "opacity-65": responses && !solutions.includes(key),
              })}
              icon={ANSWERS_ICONS[key]}
              correct={solutions.includes(key)}
            >
              {answer}
            </AnswerButton>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Responses

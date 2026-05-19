import type { CommonStatusDataMap } from "@rahoot/common/types/game/status"
import CricleCheck from "@rahoot/web/features/game/components/icons/CricleCheck"
import CricleXmark from "@rahoot/web/features/game/components/icons/CricleXmark"
import { usePlayerStore } from "@rahoot/web/features/game/stores/player"
import { SFX } from "@rahoot/web/features/game/utils/constants"
import { motion, AnimatePresence } from "motion/react"
import { useEffect, useState } from "react"
import { useTranslation } from "react-i18next"
import useSound from "use-sound"

type Props = {
  data: CommonStatusDataMap["SHOW_RESULT"]
}

const Result = ({
  data: { correct, message, points, myPoints, rank, aheadOfMe, teamPoints, teamRank },
}: Props) => {
  const player = usePlayerStore()
  const { t } = useTranslation()
  const [showPoints, setShowPoints] = useState(false)

  const rankKeyMap: Record<number, string> = {
    1: "game:rank.1",
    2: "game:rank.2",
    3: "game:rank.3",
  }
  const rankKey = rankKeyMap[rank] ?? "rank.other"

  const [sfxResults] = useSound(SFX.RESULTS_SOUND, { volume: 0.2 })

  useEffect(() => {
    player.updatePoints(myPoints)
    sfxResults()

    // Ball animatsiyasi uchun kechikish
    const t = setTimeout(() => setShowPoints(true), 300)
    return () => clearTimeout(t)
  }, [sfxResults])

  return (
    <section className="anim-show relative mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center">
      {correct ? (
        <CricleCheck className="aspect-square max-h-60 w-full" />
      ) : (
        <CricleXmark className="aspect-square max-h-60 w-full" />
      )}

      <h2 className="mt-1 text-4xl font-bold text-white drop-shadow-lg">
        {t(message)}
      </h2>

      <p className="mt-1 text-xl font-bold text-white drop-shadow-lg">
        {t("game:resultTop")}
        {t(rankKey, { rank })}
        {aheadOfMe ? ` · ${t("game:resultBehind")}${aheadOfMe}` : ""}
      </p>

      {/* Ball animatsiyasi (YANGI) */}
      <AnimatePresence>
        {correct && showPoints && (
          <motion.span
            key="points"
            initial={{ opacity: 0, y: 20, scale: 0.7 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            className="mt-3 rounded bg-black/40 px-6 py-2 text-3xl font-bold text-white drop-shadow-lg"
          >
            +{points}
          </motion.span>
        )}
      </AnimatePresence>

      {/* Jamoa bali (YANGI) */}
      {teamPoints !== undefined && (
        <div className="mt-3 flex items-center gap-2 rounded-full bg-violet-700/60 px-5 py-1.5 text-white">
          <span className="text-sm">Jamoa bali:</span>
          <span className="font-bold">{teamPoints}</span>
          {teamRank && (
            <span className="text-sm opacity-80">
              ({teamRank}-o'rin)
            </span>
          )}
        </div>
      )}
    </section>
  )
}

export default Result

import type { CommonStatusDataMap } from "@rahoot/common/types/game/status"
import { usePlayerStore } from "@rahoot/web/features/game/stores/player"
import { motion } from "motion/react"
import { useTranslation } from "react-i18next"

type Props = {
  data: CommonStatusDataMap["FINISHED"]
}

const trophyEmoji = (rank: number) => {
  if (rank === 1) return "🏆"
  if (rank === 2) return "🥈"
  if (rank === 3) return "🥉"
  return "🎖️"
}

const PlayerFinished = ({ data: { rank, subject, teams } }: Props) => {
  const { player } = usePlayerStore()
  const { t } = useTranslation()

  const rankKeyMap: Record<number, string> = {
    1: "game:rank.1",
    2: "game:rank.2",
    3: "game:rank.3",
  }
  const rankKey =
    typeof rank === "number" ? (rankKeyMap[rank] ?? "game:rank.other") : null

  // Bug fix: player.id bilan taqqoslash kerak, username emas
  const myTeam = teams?.find((team) =>
    player?.id ? team.playerIds?.includes(player.id) : false,
  )
  const teamRank = myTeam ? (teams!.indexOf(myTeam) + 1) : null

  return (
    <div className="flex h-full flex-1 flex-col items-center justify-center gap-6 px-4">
      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
        className="text-8xl"
      >
        {typeof rank === "number" ? trophyEmoji(rank) : "🎉"}
      </motion.div>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-center text-4xl font-bold text-white drop-shadow-lg md:text-5xl"
      >
        {subject}
      </motion.p>

      {rankKey !== null && (
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="text-center text-3xl font-bold text-white drop-shadow-lg md:text-4xl"
        >
          {t(rankKey, { rank })}
        </motion.p>
      )}

      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.7 }}
        className="rounded-xl bg-black/40 px-8 py-3 text-2xl font-bold text-white"
      >
        {player?.points ?? 0} ball
      </motion.div>

      {myTeam && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
          className="flex flex-col items-center gap-1 rounded-xl bg-violet-700/50 px-6 py-3 text-center"
        >
          <span className="text-sm text-white/80">Jamoangiz</span>
          <span className="text-xl font-bold text-white">{myTeam.name}</span>
          <span className="text-sm text-white/80">
            {teamRank}-o'rin · {myTeam.points} ball
          </span>
        </motion.div>
      )}
    </div>
  )
}

export default PlayerFinished

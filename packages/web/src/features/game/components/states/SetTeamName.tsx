import { EVENTS } from "@rahoot/common/constants"
import type { CommonStatusDataMap } from "@rahoot/common/types/game/status"
import Card from "@rahoot/web/components/Card"
import { useSocket } from "@rahoot/web/features/game/contexts/socket-context"
import { usePlayerStore } from "@rahoot/web/features/game/stores/player"
import { Users } from "lucide-react"
import { useState } from "react"

type Props = {
  data: CommonStatusDataMap["SET_TEAM_NAME"]
}

const SetTeamName = ({ data: { teamId, captainName } }: Props) => {
  const { socket } = useSocket()
  const { gameId } = usePlayerStore()
  const [name, setName] = useState("")

  const handleSubmit = () => {
    const clean = name.trim()
    if (!clean || !gameId) return
    socket?.emit(EVENTS.TEAM.SET_NAME, { gameId, name: clean })
  }

  return (
    <section className="flex flex-1 items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <div className="mb-4 flex flex-col items-center gap-2 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-violet-100">
            <Users className="size-7 text-violet-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">
            Siz sardorsiz! 🎖️
          </h2>
          <p className="text-sm text-gray-500">
            Jamoangizga nom bering
          </p>
        </div>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="Jamoa nomi..."
          maxLength={30}
          autoFocus
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-center text-lg font-semibold outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />

        <button
          onClick={handleSubmit}
          disabled={!name.trim()}
          className="mt-3 w-full rounded-lg bg-violet-600 py-3 font-bold text-white transition-all hover:bg-violet-700 disabled:opacity-40"
        >
          Tasdiqlash
        </button>
      </Card>
    </section>
  )
}

export default SetTeamName

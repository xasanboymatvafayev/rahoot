import type { CommonStatusDataMap } from "@rahoot/common/types/game/status"
import Loader from "@rahoot/web/components/Loader"

type Props = {
  data: CommonStatusDataMap["WAIT_TEAM_NAME"]
}

const WaitTeamName = ({ data: { captainName } }: Props) => (
  <section className="flex flex-1 flex-col items-center justify-center gap-5">
    <Loader className="h-24" />
    <div className="text-center">
      <h2 className="text-3xl font-bold text-white drop-shadow-lg">
        Jamoa nomi kutilmoqda
      </h2>
      <p className="mt-2 text-lg text-white/80">
        <span className="font-semibold">{captainName}</span> nom tanlayapti...
      </p>
    </div>
  </section>
)

export default WaitTeamName

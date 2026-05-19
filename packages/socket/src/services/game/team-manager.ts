import { EVENTS } from "@rahoot/common/constants"
import type { Player, Team } from "@rahoot/common/types/game"
import type { Server } from "@rahoot/common/types/game/socket"
import { v4 as uuid } from "uuid"

const TEAM_COLORS = [
  "Qizil",
  "Ko'k",
  "Yashil",
  "Sariq",
  "To'q sariq",
  "Binafsha",
]

export class TeamManager {
  private teams: Map<string, Team> = new Map()
  private pendingNames: Set<string> = new Set() // sardorlar nom kutmoqda
  private readonly io: Server
  private readonly gameId: string

  constructor(io: Server, gameId: string) {
    this.io = io
    this.gameId = gameId
  }

  // O'yinchilarni jamoalarga bo'lish
  assignTeams(players: Player[], teamCount: number): Team[] {
    this.teams.clear()

    // Jamoalarni yaratish
    const teamList: Team[] = []
    for (let i = 0; i < teamCount; i++) {
      const team: Team = {
        id: uuid(),
        name: `${TEAM_COLORS[i] || `Jamoa ${i + 1}`} jamoa`,
        captainId: "",
        captainName: "",
        playerIds: [],
        points: 0,
      }
      teamList.push(team)
    }

    // O'yinchilarni random aralashtirish
    const shuffled = [...players].sort(() => Math.random() - 0.5)

    // Jamoalarga teng bo'lish
    shuffled.forEach((player, idx) => {
      const team = teamList[idx % teamCount]
      team.playerIds.push(player.id)
      player.teamId = team.id
    })

    // Har jamoadan random sardor tanlash
    teamList.forEach((team) => {
      const randomIdx = Math.floor(Math.random() * team.playerIds.length)
      team.captainId = team.playerIds[randomIdx]
      const captain = players.find((p) => p.id === team.captainId)
      team.captainName = captain?.username ?? "Sardor"
    })

    // Xotirada saqlash
    teamList.forEach((team) => this.teams.set(team.id, team))

    return teamList
  }

  // Har bir o'yinchiga jamoa ma'lumotini yuborish
  notifyPlayers(players: Player[], getStatusSender: (targetId: string, status: any, data: any) => void): void {
    const { STATUS } = require("@rahoot/common/types/game/status")

    this.teams.forEach((team) => {
      team.playerIds.forEach((playerId) => {
        const player = players.find((p) => p.id === playerId)
        if (!player) return

        this.io.to(playerId).emit(EVENTS.TEAM.ASSIGNED, {
          teamId: team.id,
          teamName: team.name,
          captainId: team.captainId,
          captainName: team.captainName,
          isCaptain: playerId === team.captainId,
          members: team.playerIds
            .map((pid) => players.find((p) => p.id === pid)?.username)
            .filter(Boolean),
        })
      })

      // Sardorga nom berish so'rovi
      this.pendingNames.add(team.id)
      getStatusSender(team.captainId, STATUS.SET_TEAM_NAME, {
        teamId: team.id,
        captainName: team.captainName,
      })

      // Boshqa a'zolarga kutish holati
      team.playerIds
        .filter((pid) => pid !== team.captainId)
        .forEach((pid) => {
          getStatusSender(pid, STATUS.WAIT_TEAM_NAME, {
            captainName: team.captainName,
          })
        })
    })
  }

  // Sardor jamoa nomini qo'yadi
  setTeamName(captainSocketId: string, name: string): Team | null {
    const team = this.findTeamByCaptain(captainSocketId)
    if (!team) return null

    const cleanName = name.trim().slice(0, 30) || team.name
    team.name = cleanName
    this.pendingNames.delete(team.id)

    // Jamoaga nom tasdiqlandi deb xabar berish
    this.io.to(this.gameId).emit(EVENTS.TEAM.NAME_SET, {
      teamId: team.id,
      teamName: cleanName,
    })

    return team
  }

  // Barcha jamoalar nom qo'yishni tugatdimi?
  allNamesSet(): boolean {
    return this.pendingNames.size === 0
  }

  // Jamoa baliga qo'shish
  addPoints(teamId: string, points: number): void {
    const team = this.teams.get(teamId)
    if (team) {
      team.points += points
    }
  }

  // Jamoalar reytingi (balga qarab)
  getSortedTeams(): Team[] {
    return [...this.teams.values()].sort((a, b) => b.points - a.points)
  }

  getTeamByPlayer(playerId: string): Team | undefined {
    return [...this.teams.values()].find((t) => t.playerIds.includes(playerId))
  }

  findTeamByCaptain(captainId: string): Team | undefined {
    return [...this.teams.values()].find((t) => t.captainId === captainId)
  }

  getAll(): Team[] {
    return [...this.teams.values()]
  }

  reset(): void {
    this.teams.clear()
    this.pendingNames.clear()
  }
}

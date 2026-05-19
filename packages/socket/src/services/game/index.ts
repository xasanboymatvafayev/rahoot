import { EVENTS, GAME_MODE } from "@rahoot/common/constants"
import type { GameMode, Player, Quizz } from "@rahoot/common/types/game"
import type { Server, Socket } from "@rahoot/common/types/game/socket"
import {
  STATUS,
  type Status,
  type StatusDataMap,
} from "@rahoot/common/types/game/status"
import Config from "@rahoot/socket/services/config"
import { CooldownTimer } from "@rahoot/socket/services/game/cooldown-timer"
import { PlayerManager } from "@rahoot/socket/services/game/player-manager"
import { RoundManager } from "@rahoot/socket/services/game/round-manager"
import { TeamManager } from "@rahoot/socket/services/game/team-manager"
import Registry from "@rahoot/socket/services/registry"
import { createInviteCode } from "@rahoot/socket/utils/game"
import { v4 as uuid } from "uuid"

const registry = Registry.getInstance()

class Game {
  readonly gameId: string
  readonly inviteCode: string
  readonly gameMode: GameMode
  readonly teamCount: number

  private readonly io: Server
  private readonly _manager: {
    id: string
    clientId: string
    connected: boolean
  }
  private readonly playerManager: PlayerManager
  private readonly round: RoundManager
  private readonly cooldown: CooldownTimer
  private readonly teamManager: TeamManager

  private lastBroadcastStatus: {
    name: Status
    data: StatusDataMap[Status]
  } | null = null
  private managerStatus: {
    name: Status
    data: StatusDataMap[Status]
  } | null = null
  private playerStatus: Map<
    string,
    { name: Status; data: StatusDataMap[Status] }
  > = new Map()

  constructor(
    io: Server,
    socket: Socket,
    quizz: Quizz,
    gameMode: GameMode = GAME_MODE.SOLO,
    teamCount = 2,
  ) {
    if (!io) throw new Error("Socket server not initialized")

    this.io = io
    this.gameId = uuid()
    this.inviteCode = createInviteCode()
    this.gameMode = gameMode
    this.teamCount = teamCount
    this._manager = {
      id: socket.id,
      clientId: socket.handshake.auth.clientId,
      connected: true,
    }

    this.cooldown = new CooldownTimer(io, this.gameId)
    this.teamManager = new TeamManager(io, this.gameId)

    this.playerManager = new PlayerManager(
      io,
      this.gameId,
      () => this._manager.id,
    )

    this.round = new RoundManager({
      quizz,
      players: this.playerManager,
      teams: this.teamManager,
      cooldown: this.cooldown,
      io,
      gameId: this.gameId,
      gameMode,
      getManagerId: () => this._manager.id,
      broadcast: this.broadcastStatus.bind(this),
      send: this.sendStatus.bind(this),
      onNewQuestion: () => {
        this.playerStatus.clear()
        this.managerStatus = null
      },
      onGameFinished: Config.saveResult,
    })

    socket.join(this.gameId)
    socket.emit(EVENTS.MANAGER.GAME_CREATED, {
      gameId: this.gameId,
      inviteCode: this.inviteCode,
      gameMode,
      teamCount,
    })

    console.log(
      `New game created: ${this.inviteCode} mode:${gameMode} teams:${teamCount}`,
    )
  }

  get manager() {
    return this._manager
  }

  get players(): Player[] {
    return this.playerManager.getAll()
  }

  get started(): boolean {
    return this.round.isStarted()
  }

  // ── Status broadcasting ──────────────────────────────────────────────────

  private broadcastStatus<T extends Status>(status: T, data: StatusDataMap[T]) {
    const statusData = { name: status, data }
    this.lastBroadcastStatus = statusData
    this.io.to(this.gameId).emit(EVENTS.GAME.STATUS, statusData)
  }

  private sendStatus<T extends Status>(
    target: string,
    status: T,
    data: StatusDataMap[T],
  ) {
    const statusData = { name: status, data }

    if (this._manager.id === target) {
      this.managerStatus = statusData
    } else {
      this.playerStatus.set(target, statusData)
    }

    this.io.to(target).emit(EVENTS.GAME.STATUS, statusData)
  }

  // ── Player actions ───────────────────────────────────────────────────────

  join(socket: Socket, username: string) {
    this.playerManager.join(socket, username)
  }

  kickPlayer(socket: Socket, playerId: string) {
    if (this.playerManager.kick(socket, playerId)) {
      this.playerStatus.delete(playerId)
    }
  }

  // ── Chat (faqat jamoa ichida) ────────────────────────────────────────────

  sendChatMessage(socket: Socket, text: string) {
    if (this.gameMode !== GAME_MODE.TEAM) return

    const player = this.playerManager.findById(socket.id)
    if (!player || !player.teamId) return

    const clean = text.trim().slice(0, 200)
    if (!clean) return

    // Faqat shu jamoaga yuborish
    const team = this.teamManager.getTeamByPlayer(socket.id)
    if (!team) return

    const msg = {
      teamId: player.teamId,
      senderName: player.username,
      text: clean,
      ts: Date.now(),
    }

    team.playerIds.forEach((pid) => {
      this.io.to(pid).emit(EVENTS.CHAT.MESSAGE, msg)
    })
  }

  // ── Jamoa nomi ───────────────────────────────────────────────────────────

  setTeamName(socket: Socket, name: string) {
    if (this.gameMode !== GAME_MODE.TEAM) return

    const team = this.teamManager.setTeamName(socket.id, name)
    if (!team) return

    // Barcha jamoalar nom qo'yishni tugatdimi — o'yinni boshlash
    if (this.teamManager.allNamesSet()) {
      void this.round.start(
        this.io.sockets.sockets.get(this._manager.id) as Socket,
      )
    }
  }

  // ── Reconnect ────────────────────────────────────────────────────────────

  reconnect(socket: Socket) {
    const { clientId } = socket.handshake.auth

    if (this._manager.clientId === clientId) {
      this.reconnectManager(socket)
      return
    }

    this.reconnectPlayer(socket)
  }

  private reconnectManager(socket: Socket) {
    if (this._manager.connected) {
      socket.emit(EVENTS.GAME.RESET, "errors:game.managerAlreadyConnected")
      return
    }

    socket.join(this.gameId)
    this._manager.id = socket.id
    this._manager.connected = true

    const status =
      this.managerStatus ??
      this.lastBroadcastStatus ?? {
        name: STATUS.WAIT,
        data: { text: "game:waitingForPlayers" },
      }

    socket.emit(EVENTS.MANAGER.SUCCESS_RECONNECT, {
      gameId: this.gameId,
      currentQuestion: this.round.getReconnectInfo(),
      status,
      players: this.playerManager.getAll(),
    })
    socket.emit(EVENTS.GAME.TOTAL_PLAYERS, this.playerManager.count())

    registry.reactivateGame(this.gameId)
    console.log(`Manager reconnected to game ${this.inviteCode}`)
  }

  private reconnectPlayer(socket: Socket) {
    const { clientId } = socket.handshake.auth
    const player = this.playerManager.findByClientId(clientId)

    if (!player) return

    // Reconnect oynasi o'tib ketganmi?
    if (player.connected) {
      socket.emit(EVENTS.GAME.RESET, "errors:game.playerAlreadyConnected")
      return
    }

    if (!this.playerManager.canReconnect(clientId)) {
      socket.emit(EVENTS.GAME.RESET, "errors:game.reconnectExpired")
      return
    }

    socket.join(this.gameId)

    const oldSocketId = player.id
    this.playerManager.updateSocketId(oldSocketId, socket.id)

    const status =
      this.playerStatus.get(oldSocketId) ??
      this.lastBroadcastStatus ?? {
        name: STATUS.WAIT,
        data: { text: "game:waitingForPlayers" },
      }

    if (this.playerStatus.has(oldSocketId)) {
      const oldStatus = this.playerStatus.get(oldSocketId)!
      this.playerStatus.delete(oldSocketId)
      this.playerStatus.set(socket.id, oldStatus)
    }

    socket.emit(EVENTS.PLAYER.SUCCESS_RECONNECT, {
      gameId: this.gameId,
      currentQuestion: this.round.getReconnectInfo(),
      status,
      player: { username: player.username, points: player.points },
    })
    socket.emit(EVENTS.GAME.TOTAL_PLAYERS, this.playerManager.count())

    // Jamoa ma'lumotini qayta yuborish
    if (this.gameMode === GAME_MODE.TEAM && player.teamId) {
      const team = this.teamManager.getTeamByPlayer(socket.id)
      if (team) {
        socket.emit(EVENTS.TEAM.ASSIGNED, {
          teamId: team.id,
          teamName: team.name,
          captainId: team.captainId,
          captainName: team.captainName,
          isCaptain: socket.id === team.captainId,
          members: team.playerIds
            .map((pid) =>
              this.playerManager.getAll().find((p) => p.id === pid)?.username,
            )
            .filter(Boolean),
        })
      }
    }

    console.log(`Player ${player.username} reconnected to ${this.inviteCode}`)
  }

  // ── Disconnect ───────────────────────────────────────────────────────────

  setManagerDisconnected() {
    this._manager.connected = false
  }

  removePlayer(socketId: string): Player | undefined {
    const player = this.playerManager.remove(socketId)

    if (player) {
      this.io.to(this._manager.id).emit(EVENTS.MANAGER.REMOVE_PLAYER, player.id)
      this.playerManager.broadcastCount()
    }

    return player
  }

  setPlayerDisconnected(socketId: string) {
    this.playerManager.setDisconnected(socketId)
    this.playerManager.broadcastCount()
    // Disconnect eskirganlarini tozalash
    this.playerManager.cleanupDisconnected()
  }

  // ── Game flow ────────────────────────────────────────────────────────────

  abortCooldown() {
    this.cooldown.abort()
  }

  async start(socket: Socket) {
    if (this.gameMode === GAME_MODE.TEAM) {
      // Jamoalarga bo'lish
      const teams = this.teamManager.assignTeams(
        this.playerManager.getAll(),
        this.teamCount,
      )

      // Manager ga jamoalar ro'yxatini yuborish
      this.io.to(this._manager.id).emit(EVENTS.TEAM.LEADERBOARD, teams)

      // O'yinchilarga jamoa ma'lumoti va sardordan nom so'rash
      this.teamManager.notifyPlayers(
        this.playerManager.getAll(),
        this.sendStatus.bind(this),
      )

      // Barcha jamoalar nomini qo'yishdan keyin round.start chaqiriladi (setTeamName dan)
      return
    }

    await this.round.start(socket)
  }

  selectAnswer(socket: Socket, answerId: number) {
    this.round.selectAnswer(socket, answerId)
  }

  nextRound(socket: Socket) {
    this.round.nextQuestion(socket)
  }

  abortRound(socket: Socket) {
    this.round.abortQuestion(socket)
  }

  showLeaderboard() {
    this.round.showLeaderboard()
  }

  // O'yinni to'xtatish (YANGI)
  stopGame(socket: Socket) {
    if (socket.id !== this._manager.id) return
    this.round.forceStop(socket)
  }
}

export default Game

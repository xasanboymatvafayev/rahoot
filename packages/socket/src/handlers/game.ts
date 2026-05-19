import { EVENTS, GAME_MODE } from "@rahoot/common/constants"
import { inviteCodeValidator } from "@rahoot/common/validators/auth"
import type { SocketContext } from "@rahoot/socket/handlers/types"
import Config from "@rahoot/socket/services/config"
import Game from "@rahoot/socket/services/game"
import Registry from "@rahoot/socket/services/registry"
import { withGame } from "@rahoot/socket/utils/game"

export const gameSocketHandlers = ({ io, socket }: SocketContext) => {
  const registry = Registry.getInstance()

  socket.on(EVENTS.PLAYER.RECONNECT, ({ gameId }) => {
    const game = registry.getPlayerGame(gameId, socket.handshake.auth.clientId)
    if (game) {
      game.reconnect(socket)
      return
    }
    socket.emit(EVENTS.GAME.RESET, "errors:game.notFound")
  })

  socket.on(EVENTS.MANAGER.RECONNECT, ({ gameId }) => {
    const game = registry.getManagerGame(gameId, socket.handshake.auth.clientId)
    if (game) {
      game.reconnect(socket)
      return
    }
    socket.emit(EVENTS.GAME.RESET, "errors:game.expired")
  })

  // O'yin yaratish — rejim va jamoa soni bilan (YANGI format)
  socket.on(EVENTS.GAME.CREATE, ({ quizzId, gameMode, teamCount }) => {
    const quizzList = Config.quizz()
    const quizz = quizzList.find((q) => q.id === quizzId)

    if (!quizz) {
      socket.emit(EVENTS.GAME.ERROR_MESSAGE, "errors:quizz.notFound")
      return
    }

    const mode = gameMode === GAME_MODE.TEAM ? GAME_MODE.TEAM : GAME_MODE.SOLO
    const count = Math.min(Math.max(Number(teamCount) || 2, 2), 4)

    const game = new Game(io, socket, quizz, mode, count)
    registry.addGame(game)
  })

  socket.on(EVENTS.PLAYER.JOIN, (inviteCode) => {
    const result = inviteCodeValidator.safeParse(inviteCode)
    if (result.error) {
      socket.emit(EVENTS.GAME.ERROR_MESSAGE, result.error.issues[0].message)
      return
    }

    const game = registry.getGameByInviteCode(inviteCode)
    if (!game) {
      socket.emit(EVENTS.GAME.ERROR_MESSAGE, "errors:game.notFound")
      return
    }

    socket.emit(EVENTS.GAME.SUCCESS_ROOM, game.gameId)
  })

  socket.on(EVENTS.PLAYER.LOGIN, ({ gameId, data }) =>
    withGame(gameId, socket, (game) => game.join(socket, data.username)),
  )

  socket.on(EVENTS.MANAGER.KICK_PLAYER, ({ gameId, playerId }) =>
    withGame(gameId, socket, (game) => game.kickPlayer(socket, playerId)),
  )

  socket.on(EVENTS.MANAGER.START_GAME, ({ gameId }) =>
    withGame(gameId, socket, (game) => game.start(socket)),
  )

  socket.on(EVENTS.PLAYER.SELECTED_ANSWER, ({ gameId, data }) =>
    withGame(gameId, socket, (game) =>
      game.selectAnswer(socket, data.answerKey),
    ),
  )

  socket.on(EVENTS.MANAGER.ABORT_QUIZ, ({ gameId }) =>
    withGame(gameId, socket, (game) => game.abortRound(socket)),
  )

  socket.on(EVENTS.MANAGER.NEXT_QUESTION, ({ gameId }) =>
    withGame(gameId, socket, (game) => game.nextRound(socket)),
  )

  socket.on(EVENTS.MANAGER.SHOW_LEADERBOARD, ({ gameId }) =>
    withGame(gameId, socket, (game) => game.showLeaderboard()),
  )

  // O'yinni to'xtatish (YANGI)
  socket.on(EVENTS.MANAGER.STOP_GAME, ({ gameId }) =>
    withGame(gameId, socket, (game) => game.stopGame(socket)),
  )

  // Jamoa nomi qo'yish — sardor tomonidan (YANGI)
  socket.on(EVENTS.TEAM.SET_NAME, ({ gameId, name }) =>
    withGame(gameId, socket, (game) => game.setTeamName(socket, name)),
  )

  // Jamoa chati (YANGI)
  socket.on(EVENTS.CHAT.SEND, ({ gameId, text }) =>
    withGame(gameId, socket, (game) => game.sendChatMessage(socket, text)),
  )

  socket.on("disconnect", () => {
    console.log(`A user disconnected: ${socket.id}`)

    const managerGame = registry.getGameByManagerSocketId(socket.id)

    if (managerGame) {
      managerGame.setManagerDisconnected()
      registry.markGameAsEmpty(managerGame)

      if (!managerGame.started) {
        console.log("Reset game (manager disconnected before start)")
        managerGame.abortCooldown()
        io.to(managerGame.gameId).emit(
          EVENTS.GAME.RESET,
          "errors:game.managerDisconnected",
        )
        registry.removeGame(managerGame.gameId)
        return
      }

      // O'yin davomida manager uzilsa — kuting, qaytishi mumkin
      return
    }

    const game = registry.getGameByPlayerSocketId(socket.id)
    if (!game) return

    if (!game.started) {
      const player = game.removePlayer(socket.id)
      if (player) {
        console.log(`Removed player ${player.username} from game ${game.gameId}`)
      }
      return
    }

    // O'yin davomida uzilsa — disconnected deb belgilaymiz (qayta ulanishi mumkin)
    game.setPlayerDisconnected(socket.id)
  })
}

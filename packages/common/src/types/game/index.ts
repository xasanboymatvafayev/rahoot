import type { GAME_MODE, MEDIA_TYPES } from "@rahoot/common/constants"

export type Player = {
  id: string
  clientId: string
  connected: boolean
  username: string
  points: number
  streak: number
  avatar?: string   // emoji avatar (YANGI)
  teamId?: string   // jamoa id (YANGI)
}

export type Answer = {
  playerId: string
  answerId: number
  points: number
}

export type QuestionMediaType =
  | (typeof MEDIA_TYPES)[keyof typeof MEDIA_TYPES]
  | undefined

export type QuestionMedia = {
  type?: QuestionMediaType
  url: string
}

export type Question = {
  question: string
  media?: QuestionMedia
  answers: string[]
  solutions: number[]
  cooldown: number
  time: number
}

export type Quizz = {
  subject: string
  questions: Question[]
}

export type QuizzWithId = Quizz & { id: string }

export type QuizzMeta = { id: string; subject: string }

export type GameUpdateQuestion = {
  current: number
  total: number
}

export type PlayerAnswerRecord = {
  playerName: string
  answerId: number | null
}

export type QuestionResult = Question & {
  playerAnswers: PlayerAnswerRecord[]
}

export type GameResultPlayer = {
  username: string
  points: number
  rank: number
  avatar?: string
  teamId?: string
  teamName?: string
}

export type GameResult = {
  id: string
  subject: string
  date: string
  players: GameResultPlayer[]
  questions: QuestionResult[]
  teams?: Team[]           // (YANGI)
  gameMode?: GameMode      // (YANGI)
}

export type GameResultMeta = {
  id: string
  subject: string
  date: string
  playerCount: number
}

// Jamoa tiplari (YANGI)
export type GameMode = (typeof GAME_MODE)[keyof typeof GAME_MODE]

export type Team = {
  id: string
  name: string
  captainId: string       // sardor socket id
  captainName: string
  playerIds: string[]
  points: number
}

export type ChatMessage = {
  teamId: string
  senderName: string
  text: string
  ts: number
}

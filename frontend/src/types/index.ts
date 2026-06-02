export interface User {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  lvl: number
  totalXp: number
  currentStreak: number
  maxStreak: number
}

export interface UserStats extends User {
  lastActivityDate: string | null
}

export interface Trilha {
  id: number
  titulo: string
  descricao: string
  iconUrl: string | null
  cor: string
  xpTotal: number
  ativo: boolean
  xpGanho: number | null
  nosConcluidosCount: number | null
  matriculado: boolean
}

export interface No {
  id: number
  titulo: string
  conteudo: string
  trilhaId: number
  ordem: number
  xpRecompensa: number
  prerequisitoIds: number[]
  status: 'BLOQUEADO' | 'EM_PROGRESSO' | 'CONCLUIDO'
}

export interface Missao {
  id: number
  noId: number
  titulo: string
  enunciado: string
  codigoInicial: string
  linguagem: string
  xpRecompensa: number
}

export interface Submissao {
  id: number
  missaoId: number
  status: 'APROVADO' | 'REPROVADO' | 'ERRO'
  feedback: string
  primeiraAprovacao: boolean
  submetidaEm: string
}

export interface Flashcard {
  id: number
  trilhaId: number | null
  noId: number | null
  frente: string
  verso: string
}

export interface LeitnerCardRevisao {
  leitnerCardId: number
  flashcardId: number
  frente: string
  verso: string
  caixa: number
}

export interface RevisaoHoje {
  totalPendentes: number
  porCaixa: Record<number, LeitnerCardRevisao[]>
}

export interface Conquista {
  id: number
  titulo: string
  descricao: string
  iconUrl: string | null
  desbloqueada: boolean
  desbloqueadaEm: string | null
}

export interface RankingItem {
  posicao: number
  userName: string
  avatarUrl: string | null
  xpSemana: number
  isCurrentUser: boolean
}

export interface RankingResponse {
  top10: RankingItem[]
  posicaoAtual: RankingItem | null
}

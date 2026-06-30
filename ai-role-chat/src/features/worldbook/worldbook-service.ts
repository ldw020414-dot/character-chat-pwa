import { nanoid } from 'nanoid'

import type { CharacterCard, ChatMessage, WorldBookEntry } from '@/types/domain'

const now = () => new Date().toISOString()

const normalizeKeywords = (items: string[]) =>
  Array.from(
    new Set(
      items
        .map((item) => item.trim())
        .filter((item) => item.length > 0)
        .slice(0, 8),
    ),
  )

export const createWorldBookCandidate = (
  worldBookId: string,
  input: {
    title: string
    keywords: string[]
    content: string
    priority?: number
    tokenBudget?: number
  },
): WorldBookEntry => {
  const timestamp = now()

  return {
    id: nanoid(),
    worldBookId,
    title: input.title,
    keywords: normalizeKeywords(input.keywords),
    secondaryKeywords: [],
    content: input.content,
    priority: input.priority ?? 50,
    enabled: true,
    insertionPosition: 'after_system',
    triggerStrategy: 'keyword',
    tokenBudget: input.tokenBudget ?? 600,
    pending: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export const generateWorldBookCandidatesFromCharacter = (
  worldBookId: string,
  character: CharacterCard,
) => [
  createWorldBookCandidate(worldBookId, {
    title: `${character.name} 的背景`,
    keywords: [character.name, ...character.tags, ...character.likes],
    content: `${character.name} 的背景设定：${character.background}\n场景：${character.scenario}`,
    priority: 80,
  }),
  createWorldBookCandidate(worldBookId, {
    title: `${character.name} 的互动边界`,
    keywords: [character.name, character.speakingStyle, character.summary],
    content: `性格：${character.personality}\n说话风格：${character.speakingStyle}\n厌恶：${character.dislikes.join('、') || '未设置'}`,
    priority: 70,
  }),
]

export const generateWorldBookCandidatesFromStory = (
  worldBookId: string,
  story: string,
) => {
  const words = story
    .split(/[，。！？、\s,.!?;:]+/)
    .filter((word) => word.length >= 2)
    .slice(0, 6)

  return [
    createWorldBookCandidate(worldBookId, {
      title: '故事核心设定',
      keywords: words.length > 0 ? words : ['故事背景'],
      content: story.trim(),
      priority: 60,
      tokenBudget: 900,
    }),
  ]
}

export const generateWorldBookCandidatesFromMessages = (
  worldBookId: string,
  messages: ChatMessage[],
) => {
  const stableLines = messages
    .map((message) => message.content.trim())
    .filter((line) =>
      /设定|记住|来自|属于|规则|地点|组织|过去|身份/.test(line),
    )
    .slice(-5)

  if (stableLines.length === 0) return []

  return [
    createWorldBookCandidate(worldBookId, {
      title: '聊天中提取的稳定设定',
      keywords: ['设定', '记忆', '背景'],
      content: stableLines.join('\n'),
      priority: 65,
      tokenBudget: 700,
    }),
  ]
}

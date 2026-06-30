import type {
  CharacterCard,
  ChatMessage,
  ChatSession,
  PromptTemplate,
} from '@/types/domain'

export const findDefaultTemplate = (
  templates: PromptTemplate[],
  category: PromptTemplate['category'],
) =>
  templates.find((template) => template.category === category && template.isDefault) ??
  templates.find((template) => template.category === category)

export const sessionMessages = (messages: ChatMessage[], session?: ChatSession) =>
  session
    ? messages
        .filter((message) => message.sessionId === session.id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    : []

export const characterName = (characters: CharacterCard[], id?: string) =>
  id ? characters.find((character) => character.id === id)?.name : undefined

export const createLocalFallbackReply = (
  character: CharacterCard,
  userInput: string,
  triggeredCount: number,
) =>
  `${character.name} 暂时使用本地回复模式。\n\n我收到了：“${userInput}”。本轮触发了 ${triggeredCount} 条世界书。配置 DeepSeek API Key 后，这里会切换为真实流式生成。`

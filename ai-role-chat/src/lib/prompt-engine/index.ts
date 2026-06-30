import type {
  CharacterCard,
  ChatMessage,
  ID,
  PromptTemplate,
  UserPersona,
  WorldBookEntry,
} from '@/types/domain'

export interface PromptChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
  speakerId?: ID | undefined
}

export interface PromptVariables {
  character_name: string
  character_card: string
  user_persona: string
  world_book_entries: string
  chat_history: string
  current_speaker: string
  group_members: string
  date: string
  language: string
}

export interface WorldBookTriggerResult {
  entries: WorldBookEntry[]
  debug: {
    matched: Array<{
      entryId: ID
      title: string
      keyword: string
      priority: number
    }>
    skipped: Array<{
      entryId: ID
      title: string
      reason: string
    }>
  }
}

export interface BuildPromptInput {
  template: PromptTemplate
  character: CharacterCard
  userInput: string
  history: ChatMessage[]
  worldBookEntries: WorldBookEntry[]
  userPersona?: UserPersona | undefined
  currentSpeaker?: CharacterCard | undefined
  groupMembers?: CharacterCard[] | undefined
  language: string
  maxPromptTokens: number
}

export interface PromptDebugInfo {
  triggeredWorldBookEntries: WorldBookEntry[]
  trimmedMessageIds: ID[]
  tokenEstimate: number
  variables: PromptVariables
}

export interface BuildPromptResult {
  messages: PromptChatMessage[]
  debug: PromptDebugInfo
  preview: string
}

const TOKEN_CHAR_RATIO = 3.6

export const estimateTokens = (content: string) =>
  Math.ceil(content.trim().length / TOKEN_CHAR_RATIO)

export const renderTemplate = (
  template: string,
  variables: Partial<PromptVariables>,
) =>
  template.replace(/\{\{(\w+)}}/g, (_, key: string) => {
    const value = variables[key as keyof PromptVariables]
    return value ?? ''
  })

export const characterToPrompt = (character: CharacterCard) => {
  const lines = [
    `名称：${character.name}`,
    `简介：${character.summary}`,
    `性格：${character.personality}`,
    `场景：${character.scenario}`,
    `说话风格：${character.speakingStyle}`,
    `背景：${character.background}`,
    `喜好：${character.likes.join('、') || '未设置'}`,
    `厌恶：${character.dislikes.join('、') || '未设置'}`,
    `开场白：${character.firstMessage}`,
  ]

  if (character.exampleDialogues.length > 0) {
    lines.push(`示例对话：\n${character.exampleDialogues.join('\n')}`)
  }

  if (character.creatorNotes.trim()) {
    lines.push(`创作者备注：${character.creatorNotes}`)
  }

  return lines.join('\n')
}

export const triggerWorldBookEntries = (
  entries: WorldBookEntry[],
  text: string,
  maxTokens = 1200,
): WorldBookTriggerResult => {
  const haystack = text.toLocaleLowerCase()
  const enabledEntries = entries
    .filter((entry) => entry.enabled && !entry.pending)
    .filter((entry) => entry.triggerStrategy !== 'manual')
    .sort((a, b) => b.priority - a.priority)

  const matched: WorldBookTriggerResult['debug']['matched'] = []
  const skipped: WorldBookTriggerResult['debug']['skipped'] = []
  const triggered: WorldBookEntry[] = []
  let usedTokens = 0

  for (const entry of enabledEntries) {
    if (entry.triggerStrategy === 'semantic_placeholder') {
      skipped.push({
        entryId: entry.id,
        title: entry.title,
        reason: 'semantic trigger is reserved for a future embedding pass',
      })
      continue
    }

    const keyword = [...entry.keywords, ...entry.secondaryKeywords].find(
      (candidate) =>
        candidate.trim().length > 0 &&
        haystack.includes(candidate.toLocaleLowerCase()),
    )

    if (!keyword) {
      skipped.push({
        entryId: entry.id,
        title: entry.title,
        reason: 'no keyword matched',
      })
      continue
    }

    const entryTokenCost = Math.min(entry.tokenBudget, estimateTokens(entry.content))
    if (usedTokens + entryTokenCost > maxTokens) {
      skipped.push({
        entryId: entry.id,
        title: entry.title,
        reason: 'token budget exceeded',
      })
      continue
    }

    usedTokens += entryTokenCost
    triggered.push(entry)
    matched.push({
      entryId: entry.id,
      title: entry.title,
      keyword,
      priority: entry.priority,
    })
  }

  return {
    entries: triggered,
    debug: {
      matched,
      skipped,
    },
  }
}

export const trimChatHistory = (
  history: ChatMessage[],
  maxTokens: number,
): { messages: ChatMessage[]; trimmedMessageIds: ID[] } => {
  const kept: ChatMessage[] = []
  const trimmedMessageIds: ID[] = []
  let total = 0

  for (const message of [...history].reverse()) {
    const cost = message.tokenEstimate || estimateTokens(message.content)
    if (total + cost > maxTokens) {
      trimmedMessageIds.push(message.id)
      continue
    }

    total += cost
    kept.unshift(message)
  }

  return { messages: kept, trimmedMessageIds }
}

const worldBookEntriesToPrompt = (entries: WorldBookEntry[]) => {
  if (entries.length === 0) return '本轮没有触发世界书条目。'

  return entries
    .map(
      (entry) =>
        `【${entry.title}】\n关键词：${entry.keywords.join('、')}\n${entry.content}`,
    )
    .join('\n\n')
}

const chatHistoryToPrompt = (messages: ChatMessage[]) =>
  messages
    .map((message) => {
      const speaker = message.speakerId ? `/${message.speakerId}` : ''
      return `${message.role}${speaker}: ${message.content}`
    })
    .join('\n')

const groupMembersToPrompt = (members: CharacterCard[] = []) =>
  members
    .map(
      (member, index) =>
        `${index + 1}. ${member.name}：${member.summary}；风格：${member.speakingStyle}`,
    )
    .join('\n')

const buildVariables = (
  input: BuildPromptInput,
  triggeredWorldBookEntries: WorldBookEntry[],
  trimmedHistory: ChatMessage[],
): PromptVariables => {
  const activeCharacter = input.currentSpeaker ?? input.character

  return {
    character_name: activeCharacter.name,
    character_card: characterToPrompt(activeCharacter),
    user_persona: input.userPersona?.content ?? '用户未设置人设。',
    world_book_entries: worldBookEntriesToPrompt(triggeredWorldBookEntries),
    chat_history: chatHistoryToPrompt(trimmedHistory),
    current_speaker: activeCharacter.name,
    group_members: groupMembersToPrompt(input.groupMembers),
    date: new Date().toLocaleDateString(),
    language: input.language,
  }
}

const toPromptMessages = (
  systemPrompt: string,
  history: ChatMessage[],
  userInput: string,
): PromptChatMessage[] => [
  { role: 'system', content: systemPrompt },
  ...history
    .filter((message) => message.role === 'user' || message.role === 'assistant')
    .map((message) => {
      const role: PromptChatMessage['role'] =
        message.role === 'user' ? 'user' : 'assistant'
      return {
        role,
        content: message.content,
        ...(message.speakerId ? { speakerId: message.speakerId } : {}),
      }
    }),
  { role: 'user', content: userInput },
]

export const buildPrompt = (input: BuildPromptInput): BuildPromptResult => {
  const historyText = `${input.history.map((message) => message.content).join('\n')}\n${
    input.userInput
  }`
  const triggerResult = triggerWorldBookEntries(input.worldBookEntries, historyText)
  const fixedBudget = estimateTokens(input.template.content) + 900
  const historyBudget = Math.max(600, input.maxPromptTokens - fixedBudget)
  const { messages: trimmedHistory, trimmedMessageIds } = trimChatHistory(
    input.history,
    historyBudget,
  )
  const variables = buildVariables(input, triggerResult.entries, trimmedHistory)
  const systemPrompt = renderTemplate(input.template.content, variables)
  const messages = toPromptMessages(systemPrompt, trimmedHistory, input.userInput)
  const preview = messages
    .map((message) => `${message.role.toUpperCase()}\n${message.content}`)
    .join('\n\n---\n\n')
  const tokenEstimate = estimateTokens(preview)

  return {
    messages,
    preview,
    debug: {
      triggeredWorldBookEntries: triggerResult.entries,
      trimmedMessageIds,
      tokenEstimate,
      variables,
    },
  }
}

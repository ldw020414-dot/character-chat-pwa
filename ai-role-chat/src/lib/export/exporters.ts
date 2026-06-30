import type {
  AppBackup,
  AppSettings,
  ApiProviderConfig,
  CharacterCard,
  ChatMessage,
  ChatSession,
  GroupChatMember,
  PromptTemplate,
  UserPersona,
  WorldBook,
  WorldBookEntry,
} from '@/types/domain'

import {
  appBackupSchema,
  characterCardSchema,
  worldBookEntrySchema,
} from '../validation/schemas'

export interface ExportableState {
  characters: CharacterCard[]
  worldBooks: WorldBook[]
  worldBookEntries: WorldBookEntry[]
  chatSessions: ChatSession[]
  chatMessages: ChatMessage[]
  groupChatMembers: GroupChatMember[]
  promptTemplates: PromptTemplate[]
  apiProviders: ApiProviderConfig[]
  userPersonas: UserPersona[]
  appSettings: AppSettings
}

export const exportCharacterJson = (character: CharacterCard) =>
  JSON.stringify(characterCardSchema.parse(character), null, 2)

export const importCharacterJson = (raw: string): CharacterCard =>
  characterCardSchema.parse(JSON.parse(raw))

export const exportWorldBookEntryJson = (entry: WorldBookEntry) =>
  JSON.stringify(worldBookEntrySchema.parse(entry), null, 2)

export const importWorldBookEntryJson = (raw: string): WorldBookEntry =>
  worldBookEntrySchema.parse(JSON.parse(raw))

export const exportSessionMarkdown = (
  session: ChatSession,
  messages: ChatMessage[],
  characterNameById: (id: string) => string | undefined,
) => {
  const lines = [`# ${session.title}`, '', `- 模式：${session.mode}`, '']

  for (const message of messages) {
    const speaker = message.speakerId
      ? characterNameById(message.speakerId) ?? message.speakerId
      : message.role
    lines.push(`## ${speaker}`, '', message.content, '')
  }

  return lines.join('\n')
}

export const createBackup = (state: ExportableState): AppBackup => {
  const backup: AppBackup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    characters: state.characters,
    worldBooks: state.worldBooks,
    worldBookEntries: state.worldBookEntries,
    chatSessions: state.chatSessions,
    chatMessages: state.chatMessages,
    groupChatMembers: state.groupChatMembers,
    promptTemplates: state.promptTemplates,
    apiProviders: state.apiProviders.map((provider) => ({
      id: provider.id,
      provider: provider.provider,
      name: provider.name,
      baseUrl: provider.baseUrl,
      model: provider.model,
      useProxy: provider.useProxy,
      parameters: provider.parameters,
      enabled: provider.enabled,
      isDefault: provider.isDefault,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
    })),
    userPersonas: state.userPersonas,
    appSettings: state.appSettings,
  }

  return appBackupSchema.parse(backup)
}

export const exportBackupJson = (state: ExportableState) =>
  JSON.stringify(createBackup(state), null, 2)

export const parseBackupJson = (raw: string): AppBackup =>
  appBackupSchema.parse(JSON.parse(raw))

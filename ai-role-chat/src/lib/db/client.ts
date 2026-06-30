import Dexie, { type Table } from 'dexie'

import type {
  ApiProviderConfig,
  AppSettings,
  CharacterCard,
  ChatMessage,
  ChatSession,
  GenerationLog,
  GroupChatMember,
  PromptTemplate,
  UserPersona,
  WorldBook,
  WorldBookEntry,
} from '@/types/domain'

export class RoleChatDatabase extends Dexie {
  characters!: Table<CharacterCard, string>
  worldBooks!: Table<WorldBook, string>
  worldBookEntries!: Table<WorldBookEntry, string>
  chatSessions!: Table<ChatSession, string>
  chatMessages!: Table<ChatMessage, string>
  groupChatMembers!: Table<GroupChatMember, string>
  promptTemplates!: Table<PromptTemplate, string>
  apiProviders!: Table<ApiProviderConfig, string>
  userPersonas!: Table<UserPersona, string>
  appSettings!: Table<AppSettings, string>
  generationLogs!: Table<GenerationLog, string>

  constructor() {
    super('ai-role-chat-pwa')

    this.version(1).stores({
      characters: 'id, name, updatedAt, *tags',
      worldBooks: 'id, name, updatedAt',
      worldBookEntries:
        'id, worldBookId, enabled, pending, priority, insertionPosition, triggerStrategy, updatedAt, *keywords',
      chatSessions: 'id, mode, characterId, updatedAt, archived',
      chatMessages: 'id, sessionId, speakerId, role, createdAt, updatedAt',
      groupChatMembers: 'id, sessionId, characterId, sortOrder, muted',
      promptTemplates: 'id, category, isDefault, updatedAt',
      apiProviders: 'id, provider, isDefault, enabled, updatedAt',
      userPersonas: 'id, isDefault, updatedAt',
      appSettings: 'id, updatedAt',
      generationLogs: 'id, sessionId, providerId, status, createdAt',
    })
  }
}

export const db = new RoleChatDatabase()

export interface DatabaseSnapshot {
  characters: CharacterCard[]
  worldBooks: WorldBook[]
  worldBookEntries: WorldBookEntry[]
  chatSessions: ChatSession[]
  chatMessages: ChatMessage[]
  groupChatMembers: GroupChatMember[]
  promptTemplates: PromptTemplate[]
  apiProviders: ApiProviderConfig[]
  userPersonas: UserPersona[]
  appSettings?: AppSettings | undefined
}

export const loadDatabaseSnapshot = async (): Promise<DatabaseSnapshot> => {
  const [
    characters,
    worldBooks,
    worldBookEntries,
    chatSessions,
    chatMessages,
    groupChatMembers,
    promptTemplates,
    apiProviders,
    userPersonas,
    appSettingsRows,
  ] = await Promise.all([
    db.characters.toArray(),
    db.worldBooks.toArray(),
    db.worldBookEntries.toArray(),
    db.chatSessions.toArray(),
    db.chatMessages.toArray(),
    db.groupChatMembers.toArray(),
    db.promptTemplates.toArray(),
    db.apiProviders.toArray(),
    db.userPersonas.toArray(),
    db.appSettings.toArray(),
  ])

  return {
    characters,
    worldBooks,
    worldBookEntries,
    chatSessions,
    chatMessages,
    groupChatMembers,
    promptTemplates,
    apiProviders,
    userPersonas,
    appSettings: appSettingsRows[0],
  }
}

export const clearDatabase = async () => {
  await db.transaction(
    'rw',
    [
      db.characters,
      db.worldBooks,
      db.worldBookEntries,
      db.chatSessions,
      db.chatMessages,
      db.groupChatMembers,
      db.promptTemplates,
      db.apiProviders,
      db.userPersonas,
      db.appSettings,
      db.generationLogs,
    ],
    async () => {
      await Promise.all([
        db.characters.clear(),
        db.worldBooks.clear(),
        db.worldBookEntries.clear(),
        db.chatSessions.clear(),
        db.chatMessages.clear(),
        db.groupChatMembers.clear(),
        db.promptTemplates.clear(),
        db.apiProviders.clear(),
        db.userPersonas.clear(),
        db.appSettings.clear(),
        db.generationLogs.clear(),
      ])
    },
  )
}

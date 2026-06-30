import { nanoid } from 'nanoid'
import { create } from 'zustand'

import {
  clearDatabase,
  db,
  loadDatabaseSnapshot,
  type DatabaseSnapshot,
} from '@/lib/db/client'
import { proxyDefaults } from '@/lib/llm/proxy-provider'
import { defaultPromptTemplates } from '@/lib/prompt-engine/templates'
import type {
  ApiProviderConfig,
  AppBackup,
  AppSettings,
  CharacterCard,
  ChatMessage,
  ChatRole,
  ChatSession,
  GroupChatMember,
  ID,
  PromptTemplate,
  UserPersona,
  WorldBook,
  WorldBookEntry,
} from '@/types/domain'

export type AppView = 'chat' | 'characters' | 'worldbook' | 'creator' | 'settings'

interface AppStoreState {
  hydrated: boolean
  activeView: AppView
  selectedSessionId?: ID | undefined
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
  initialize: () => Promise<void>
  setActiveView: (view: AppView) => void
  selectSession: (sessionId: ID | undefined) => void
  addCharacter: (character: CharacterCard) => void
  updateCharacter: (characterId: ID, patch: Partial<CharacterCard>) => void
  deleteCharacter: (characterId: ID) => void
  addWorldBookEntry: (entry: WorldBookEntry) => void
  updateWorldBookEntry: (entryId: ID, patch: Partial<WorldBookEntry>) => void
  confirmWorldBookEntry: (entryId: ID) => void
  addPromptTemplate: (template: PromptTemplate) => void
  updatePromptTemplate: (templateId: ID, patch: Partial<PromptTemplate>) => void
  setDefaultPromptTemplate: (templateId: ID) => void
  upsertProvider: (provider: ApiProviderConfig) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  addSession: (session: ChatSession) => void
  addMessage: (message: ChatMessage) => void
  updateMessage: (messageId: ID, patch: Partial<ChatMessage>) => void
  deleteMessage: (messageId: ID) => void
  clearSession: (sessionId: ID) => void
  addGroupMember: (member: GroupChatMember) => void
  removeGroupMember: (memberId: ID) => void
  replaceFromBackup: (backup: AppBackup) => Promise<void>
  clearAllData: () => Promise<void>
}

const now = () => new Date().toISOString()

const seedCharacter = (): CharacterCard => {
  const timestamp = now()
  return {
    id: 'char-cyber-doctor',
    name: '林昼',
    avatar: '',
    summary: '冷淡但保护欲很强的赛博医生。',
    personality: '克制、谨慎、嘴硬心软，对危险极其敏感。',
    scenario: '霓虹雨夜的地下诊所，用户带着未知芯片伤口闯入。',
    firstMessage: '别动。你的伤口在发光，这通常不是好消息。',
    exampleDialogues: [
      '用户：你会救我吗？\n林昼：我已经开始了。别让我后悔。',
    ],
    speakingStyle: '短句、低声、精准，偶尔露出不明显的关心。',
    background: '曾是企业医疗实验室主刀医生，因拒绝人体实验逃离系统。',
    likes: ['安静', '高精度器械', '守信的人'],
    dislikes: ['企业追兵', '鲁莽', '谎言'],
    creatorNotes: '内置示例角色，可删除或复制。',
    tags: ['赛博朋克', '医生', '保护型'],
    version: '1.0.0',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const seedWorldBook = (): WorldBook => {
  const timestamp = now()
  return {
    id: 'wb-main',
    name: '默认世界书',
    description: '用于演示关键词触发和聊天注入。',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const seedWorldBookEntry = (): WorldBookEntry => {
  const timestamp = now()
  return {
    id: 'wbe-underground-clinic',
    worldBookId: 'wb-main',
    title: '地下诊所',
    keywords: ['地下诊所', '诊所', '芯片伤口'],
    secondaryKeywords: ['霓虹雨', '医疗舱'],
    content:
      '地下诊所位于旧城区废弃地铁站下方，电力不稳定，但有黑市级医疗设备。',
    priority: 90,
    enabled: true,
    insertionPosition: 'after_system',
    triggerStrategy: 'keyword',
    tokenBudget: 300,
    pending: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const seedProvider = (): ApiProviderConfig => {
  const timestamp = now()
  return {
    id: 'provider-deepseek-proxy',
    provider: 'deepseek_proxy',
    name: 'DeepSeek 代理',
    baseUrl: proxyDefaults.baseUrl,
    model: proxyDefaults.model,
    useProxy: true,
    parameters: {
      temperature: 0.8,
      topP: 0.9,
      maxTokens: 1200,
      frequencyPenalty: 0,
      presencePenalty: 0,
    },
    enabled: true,
    isDefault: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const seedPersona = (): UserPersona => {
  const timestamp = now()
  return {
    id: 'persona-default',
    name: '默认用户',
    content: '用户喜欢沉浸式角色扮演，希望对话自然推进。',
    isDefault: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const seedSettings = (): AppSettings => {
  const timestamp = now()
  return {
    id: 'app',
    theme: 'dark',
    language: '中文',
    debugPrompt: true,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

interface SeedSnapshot extends Omit<DatabaseSnapshot, 'appSettings'> {
  appSettings: AppSettings
}

const seedSnapshot = (): SeedSnapshot => ({
  characters: [seedCharacter()],
  worldBooks: [seedWorldBook()],
  worldBookEntries: [seedWorldBookEntry()],
  chatSessions: [],
  chatMessages: [],
  groupChatMembers: [],
  promptTemplates: defaultPromptTemplates,
  apiProviders: [seedProvider()],
  userPersonas: [seedPersona()],
  appSettings: seedSettings(),
})

export const createChatSession = (
  mode: 'single' | 'group',
  title: string,
  characterId?: ID,
): ChatSession => {
  const timestamp = now()
  return {
    id: nanoid(),
    title,
    mode,
    ...(characterId ? { characterId } : {}),
    archived: false,
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

export const createChatMessage = (
  sessionId: ID,
  role: ChatRole,
  content: string,
  speakerId?: ID,
): ChatMessage => {
  const timestamp = now()
  return {
    id: nanoid(),
    sessionId,
    role,
    content,
    ...(speakerId ? { speakerId } : {}),
    metadata: {},
    tokenEstimate: Math.ceil(content.length / 3.6),
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

const touch = <T extends { updatedAt: string }>(item: T): T => ({
  ...item,
  updatedAt: now(),
})

const putSeedData = async (snapshot: SeedSnapshot) => {
  await Promise.all([
    db.characters.bulkPut(snapshot.characters),
    db.worldBooks.bulkPut(snapshot.worldBooks),
    db.worldBookEntries.bulkPut(snapshot.worldBookEntries),
    db.promptTemplates.bulkPut(snapshot.promptTemplates),
    db.apiProviders.bulkPut(snapshot.apiProviders),
    db.userPersonas.bulkPut(snapshot.userPersonas),
    db.appSettings.put(snapshot.appSettings),
  ])
}

export const useAppStore = create<AppStoreState>((set, get) => ({
  hydrated: false,
  activeView: 'chat',
  characters: [],
  worldBooks: [],
  worldBookEntries: [],
  chatSessions: [],
  chatMessages: [],
  groupChatMembers: [],
  promptTemplates: [],
  apiProviders: [],
  userPersonas: [],
  appSettings: seedSettings(),
  initialize: async () => {
    const existing = await loadDatabaseSnapshot()
    const snapshot: SeedSnapshot =
      existing.characters.length > 0
        ? {
            ...existing,
            appSettings: existing.appSettings ?? seedSettings(),
            promptTemplates:
              existing.promptTemplates.length > 0
                ? existing.promptTemplates
                : defaultPromptTemplates,
            apiProviders:
              existing.apiProviders.length > 0 ? existing.apiProviders : [seedProvider()],
            userPersonas:
              existing.userPersonas.length > 0 ? existing.userPersonas : [seedPersona()],
            worldBooks:
              existing.worldBooks.length > 0 ? existing.worldBooks : [seedWorldBook()],
          }
        : seedSnapshot()

    if (existing.characters.length === 0) {
      await putSeedData(snapshot)
    }

    set({
      hydrated: true,
      characters: snapshot.characters,
      worldBooks: snapshot.worldBooks,
      worldBookEntries: snapshot.worldBookEntries,
      chatSessions: snapshot.chatSessions,
      chatMessages: snapshot.chatMessages,
      groupChatMembers: snapshot.groupChatMembers,
      promptTemplates: snapshot.promptTemplates,
      apiProviders: snapshot.apiProviders,
      userPersonas: snapshot.userPersonas,
      appSettings: snapshot.appSettings,
    })
  },
  setActiveView: (view) => set({ activeView: view }),
  selectSession: (sessionId) => set({ selectedSessionId: sessionId }),
  addCharacter: (character) => {
    void db.characters.put(character)
    set((state) => ({ characters: [character, ...state.characters] }))
  },
  updateCharacter: (characterId, patch) =>
    set((state) => {
      const characters = state.characters.map((character) =>
        character.id === characterId ? touch({ ...character, ...patch }) : character,
      )
      const next = characters.find((character) => character.id === characterId)
      if (next) void db.characters.put(next)
      return { characters }
    }),
  deleteCharacter: (characterId) => {
    void db.characters.delete(characterId)
    set((state) => ({
      characters: state.characters.filter((character) => character.id !== characterId),
    }))
  },
  addWorldBookEntry: (entry) => {
    void db.worldBookEntries.put(entry)
    set((state) => ({ worldBookEntries: [entry, ...state.worldBookEntries] }))
  },
  updateWorldBookEntry: (entryId, patch) =>
    set((state) => {
      const worldBookEntries = state.worldBookEntries.map((entry) =>
        entry.id === entryId ? touch({ ...entry, ...patch }) : entry,
      )
      const next = worldBookEntries.find((entry) => entry.id === entryId)
      if (next) void db.worldBookEntries.put(next)
      return { worldBookEntries }
    }),
  confirmWorldBookEntry: (entryId) => get().updateWorldBookEntry(entryId, { pending: false }),
  addPromptTemplate: (template) => {
    void db.promptTemplates.put(template)
    set((state) => ({ promptTemplates: [template, ...state.promptTemplates] }))
  },
  updatePromptTemplate: (templateId, patch) =>
    set((state) => {
      const promptTemplates = state.promptTemplates.map((template) =>
        template.id === templateId ? touch({ ...template, ...patch }) : template,
      )
      const next = promptTemplates.find((template) => template.id === templateId)
      if (next) void db.promptTemplates.put(next)
      return { promptTemplates }
    }),
  setDefaultPromptTemplate: (templateId) =>
    set((state) => {
      const target = state.promptTemplates.find((template) => template.id === templateId)
      if (!target) return state
      const promptTemplates = state.promptTemplates.map((template) =>
        template.category === target.category
          ? touch({ ...template, isDefault: template.id === templateId })
          : template,
      )
      void db.promptTemplates.bulkPut(promptTemplates)
      return { promptTemplates }
    }),
  upsertProvider: (provider) => {
    const nextProvider = touch(provider)
    void db.apiProviders.put(nextProvider)
    set((state) => {
      const exists = state.apiProviders.some((item) => item.id === nextProvider.id)
      return {
        apiProviders: exists
          ? state.apiProviders.map((item) =>
              item.id === nextProvider.id ? nextProvider : item,
            )
          : [nextProvider, ...state.apiProviders],
      }
    })
  },
  updateSettings: (patch) =>
    set((state) => {
      const appSettings = touch({ ...state.appSettings, ...patch })
      void db.appSettings.put(appSettings)
      return { appSettings }
    }),
  addSession: (session) => {
    void db.chatSessions.put(session)
    set((state) => ({
      chatSessions: [session, ...state.chatSessions],
      selectedSessionId: session.id,
    }))
  },
  addMessage: (message) => {
    void db.chatMessages.put(message)
    set((state) => {
      const chatSessions = state.chatSessions.map((session) =>
        session.id === message.sessionId ? touch(session) : session,
      )
      const touched = chatSessions.find((session) => session.id === message.sessionId)
      if (touched) void db.chatSessions.put(touched)
      return {
        chatMessages: [...state.chatMessages, message],
        chatSessions,
      }
    })
  },
  updateMessage: (messageId, patch) =>
    set((state) => {
      const chatMessages = state.chatMessages.map((message) =>
        message.id === messageId ? touch({ ...message, ...patch }) : message,
      )
      const next = chatMessages.find((message) => message.id === messageId)
      if (next) void db.chatMessages.put(next)
      return { chatMessages }
    }),
  deleteMessage: (messageId) => {
    void db.chatMessages.delete(messageId)
    set((state) => ({
      chatMessages: state.chatMessages.filter((message) => message.id !== messageId),
    }))
  },
  clearSession: (sessionId) => {
    void db.chatMessages.where('sessionId').equals(sessionId).delete()
    set((state) => ({
      chatMessages: state.chatMessages.filter(
        (message) => message.sessionId !== sessionId,
      ),
    }))
  },
  addGroupMember: (member) => {
    void db.groupChatMembers.put(member)
    set((state) => ({ groupChatMembers: [...state.groupChatMembers, member] }))
  },
  removeGroupMember: (memberId) => {
    void db.groupChatMembers.delete(memberId)
    set((state) => ({
      groupChatMembers: state.groupChatMembers.filter((member) => member.id !== memberId),
    }))
  },
  replaceFromBackup: async (backup) => {
    await clearDatabase()
    await Promise.all([
      db.characters.bulkPut(backup.characters),
      db.worldBooks.bulkPut(backup.worldBooks),
      db.worldBookEntries.bulkPut(backup.worldBookEntries),
      db.chatSessions.bulkPut(backup.chatSessions),
      db.chatMessages.bulkPut(backup.chatMessages),
      db.groupChatMembers.bulkPut(backup.groupChatMembers),
      db.promptTemplates.bulkPut(backup.promptTemplates),
      db.apiProviders.bulkPut(
        backup.apiProviders.map((provider) => ({
          ...provider,
          useProxy: provider.useProxy,
        })),
      ),
      db.userPersonas.bulkPut(backup.userPersonas),
      db.appSettings.put(backup.appSettings),
    ])
    set({
      characters: backup.characters,
      worldBooks: backup.worldBooks,
      worldBookEntries: backup.worldBookEntries,
      chatSessions: backup.chatSessions,
      chatMessages: backup.chatMessages,
      groupChatMembers: backup.groupChatMembers,
      promptTemplates: backup.promptTemplates,
      apiProviders: backup.apiProviders,
      userPersonas: backup.userPersonas,
      appSettings: backup.appSettings,
    })
  },
  clearAllData: async () => {
    await clearDatabase()
    const snapshot = seedSnapshot()
    await putSeedData(snapshot)
    set({
      selectedSessionId: undefined,
      characters: snapshot.characters,
      worldBooks: snapshot.worldBooks,
      worldBookEntries: snapshot.worldBookEntries,
      chatSessions: [],
      chatMessages: [],
      groupChatMembers: [],
      promptTemplates: snapshot.promptTemplates,
      apiProviders: snapshot.apiProviders,
      userPersonas: snapshot.userPersonas,
      appSettings: snapshot.appSettings,
    })
  },
}))

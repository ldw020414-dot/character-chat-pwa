import type {
  AppSettings,
  CharacterCard,
  ChatMessage,
  PromptTemplate,
  WorldBook,
  WorldBookEntry,
} from '@/types/domain'

export const timestamp = '2026-01-01T00:00:00.000Z'

export const fixtureCharacter: CharacterCard = {
  id: 'char-1',
  name: '林昼',
  avatar: '',
  summary: '冷淡的赛博医生',
  personality: '冷静、克制、保护欲强',
  scenario: '地下诊所',
  firstMessage: '别动。',
  exampleDialogues: ['用户：疼。\n林昼：忍一下。'],
  speakingStyle: '短句、克制',
  background: '曾在企业实验室工作。',
  likes: ['安静'],
  dislikes: ['背叛'],
  creatorNotes: '',
  tags: ['医生'],
  version: '1.0.0',
  createdAt: timestamp,
  updatedAt: timestamp,
}

export const fixtureTemplate: PromptTemplate = {
  id: 'tpl',
  name: '测试模板',
  category: 'single_chat',
  content:
    '角色 {{character_name}}\n{{character_card}}\n世界书：{{world_book_entries}}\n历史：{{chat_history}}',
  isDefault: true,
  createdAt: timestamp,
  updatedAt: timestamp,
}

export const fixtureWorldBook: WorldBook = {
  id: 'wb',
  name: '测试世界书',
  description: '',
  createdAt: timestamp,
  updatedAt: timestamp,
}

export const fixtureWorldBookEntry: WorldBookEntry = {
  id: 'entry-1',
  worldBookId: 'wb',
  title: '地下诊所',
  keywords: ['地下诊所'],
  secondaryKeywords: ['医疗舱'],
  content: '地下诊所位于旧城区。',
  priority: 90,
  enabled: true,
  insertionPosition: 'after_system',
  triggerStrategy: 'keyword',
  tokenBudget: 300,
  pending: false,
  createdAt: timestamp,
  updatedAt: timestamp,
}

export const fixtureMessage: ChatMessage = {
  id: 'msg-1',
  sessionId: 'session-1',
  role: 'user',
  content: '地下诊所在哪里？',
  metadata: {},
  tokenEstimate: 10,
  createdAt: timestamp,
  updatedAt: timestamp,
}

export const fixtureSettings: AppSettings = {
  id: 'app',
  theme: 'dark',
  language: '中文',
  debugPrompt: true,
  createdAt: timestamp,
  updatedAt: timestamp,
}

import { describe, expect, it } from 'vitest'

import {
  createBackup,
  exportCharacterJson,
  exportSessionMarkdown,
  importCharacterJson,
  parseBackupJson,
} from '@/lib/export/exporters'
import {
  fixtureCharacter,
  fixtureMessage,
  fixtureSettings,
  fixtureTemplate,
  fixtureWorldBook,
  fixtureWorldBookEntry,
  timestamp,
} from './fixtures'

describe('import/export', () => {
  it('round-trips character JSON', () => {
    const raw = exportCharacterJson(fixtureCharacter)
    expect(importCharacterJson(raw)).toEqual(fixtureCharacter)
  })

  it('exports session markdown with speaker names', () => {
    const markdown = exportSessionMarkdown(
      {
        id: 'session-1',
        title: '测试会话',
        mode: 'single',
        characterId: fixtureCharacter.id,
        archived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
      },
      [{ ...fixtureMessage, speakerId: fixtureCharacter.id }],
      () => fixtureCharacter.name,
    )

    expect(markdown).toContain('# 测试会话')
    expect(markdown).toContain('## 林昼')
  })

  it('creates backups without secret references', () => {
    const backup = createBackup({
      characters: [fixtureCharacter],
      worldBooks: [fixtureWorldBook],
      worldBookEntries: [fixtureWorldBookEntry],
      chatSessions: [],
      chatMessages: [],
      groupChatMembers: [],
      promptTemplates: [fixtureTemplate],
      apiProviders: [
        {
          id: 'provider',
          provider: 'deepseek_proxy',
          name: 'DeepSeek',
          baseUrl: '/api/chat',
          model: 'deepseek-chat',
          apiKeySecretRef: 'secret-ref',
          useProxy: true,
          parameters: {
            temperature: 0.7,
            topP: 0.9,
            maxTokens: 1000,
            frequencyPenalty: 0,
            presencePenalty: 0,
          },
          enabled: true,
          isDefault: true,
          createdAt: timestamp,
          updatedAt: timestamp,
        },
      ],
      userPersonas: [],
      appSettings: fixtureSettings,
    })

    const raw = JSON.stringify(backup)
    expect(raw).not.toContain('secret-ref')
    expect(parseBackupJson(raw).version).toBe(1)
  })
})

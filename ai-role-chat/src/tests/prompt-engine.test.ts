import { describe, expect, it } from 'vitest'

import { buildPrompt, renderTemplate, trimChatHistory } from '@/lib/prompt-engine'
import {
  fixtureCharacter,
  fixtureMessage,
  fixtureTemplate,
  fixtureWorldBookEntry,
} from './fixtures'

describe('prompt engine', () => {
  it('renders template variables', () => {
    expect(renderTemplate('Hello {{character_name}}', { character_name: '林昼' })).toBe(
      'Hello 林昼',
    )
  })

  it('builds prompt with triggered world book entries', () => {
    const result = buildPrompt({
      template: fixtureTemplate,
      character: fixtureCharacter,
      userInput: '我走进地下诊所。',
      history: [],
      worldBookEntries: [fixtureWorldBookEntry],
      language: '中文',
      maxPromptTokens: 4000,
    })

    expect(result.messages[0]?.content).toContain('地下诊所位于旧城区')
    expect(result.debug.triggeredWorldBookEntries).toHaveLength(1)
  })

  it('trims old chat history by budget', () => {
    const old = { ...fixtureMessage, id: 'old', content: 'x'.repeat(1000), tokenEstimate: 500 }
    const recent = { ...fixtureMessage, id: 'recent', content: 'hello', tokenEstimate: 2 }

    const result = trimChatHistory([old, recent], 10)

    expect(result.messages.map((message) => message.id)).toEqual(['recent'])
    expect(result.trimmedMessageIds).toEqual(['old'])
  })
})

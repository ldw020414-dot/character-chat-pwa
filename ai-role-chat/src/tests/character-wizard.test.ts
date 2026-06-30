import { describe, expect, it } from 'vitest'

import {
  buildCharacterDraftFromWizard,
  nextCharacterWizardQuestions,
} from '@/features/characters/character-wizard-service'

describe('character wizard', () => {
  it('asks only a small number of questions per turn', () => {
    expect(nextCharacterWizardQuestions('赛博医生', [])).toHaveLength(3)
  })

  it('creates a structured character draft', () => {
    const draft = buildCharacterDraftFromWizard('帮我创建一个赛博医生角色', [
      { role: 'user', content: '冷淡，保护欲强。' },
    ])

    expect(draft.name).toContain('赛博医生')
    expect(draft.firstMessage).toBeTruthy()
    expect(draft.tags).toContain('向导生成')
  })
})

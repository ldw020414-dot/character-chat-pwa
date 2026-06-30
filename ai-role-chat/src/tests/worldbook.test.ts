import { describe, expect, it } from 'vitest'

import { triggerWorldBookEntries } from '@/lib/prompt-engine'
import {
  generateWorldBookCandidatesFromCharacter,
  generateWorldBookCandidatesFromMessages,
  generateWorldBookCandidatesFromStory,
} from '@/features/worldbook/worldbook-service'
import { fixtureCharacter, fixtureMessage, fixtureWorldBookEntry } from './fixtures'

describe('world book triggering and candidates', () => {
  it('matches enabled keyword entries and skips pending entries', () => {
    const pending = { ...fixtureWorldBookEntry, id: 'pending', pending: true }
    const result = triggerWorldBookEntries(
      [pending, fixtureWorldBookEntry],
      '地下诊所的灯灭了。',
    )

    expect(result.entries).toEqual([fixtureWorldBookEntry])
    expect(result.debug.matched[0]?.keyword).toBe('地下诊所')
  })

  it('creates pending candidates from character cards', () => {
    const candidates = generateWorldBookCandidatesFromCharacter('wb', fixtureCharacter)

    expect(candidates.every((entry) => entry.pending)).toBe(true)
    expect(candidates[0]?.keywords).toContain(fixtureCharacter.name)
  })

  it('extracts story and chat history candidates', () => {
    expect(generateWorldBookCandidatesFromStory('wb', '旧城区有地下诊所')).toHaveLength(1)
    expect(
      generateWorldBookCandidatesFromMessages('wb', [
        { ...fixtureMessage, content: '记住：林昼来自旧城区。' },
      ]),
    ).toHaveLength(1)
  })
})

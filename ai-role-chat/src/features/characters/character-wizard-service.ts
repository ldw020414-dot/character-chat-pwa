import { nanoid } from 'nanoid'

import type { CharacterCard } from '@/types/domain'

export interface WizardTurn {
  role: 'assistant' | 'user'
  content: string
}

export const nextCharacterWizardQuestions = (
  idea: string,
  turns: WizardTurn[],
) => {
  if (!idea.trim()) return ['先用一句话描述你想创建的角色。']

  const answered = turns.filter((turn) => turn.role === 'user').length

  if (answered === 0) {
    return [
      '这个角色最重要的情绪底色是什么？',
      'TA 和用户初次相遇时处在什么场景？',
      '有什么绝对不能触碰的禁忌或弱点？',
    ]
  }

  if (answered === 1) {
    return [
      'TA 的说话方式更偏克制、锋利、温柔，还是带一点戏剧性？',
      '你希望这段关系发展成陪伴、冒险、悬疑，还是暧昧拉扯？',
    ]
  }

  if (answered === 2) {
    return ['请补一句你想听到的开场白氛围，我会据此生成角色卡。']
  }

  return []
}

export const buildCharacterDraftFromWizard = (
  idea: string,
  turns: WizardTurn[],
): CharacterCard => {
  const timestamp = new Date().toISOString()
  const userNotes = turns
    .filter((turn) => turn.role === 'user')
    .map((turn) => turn.content)
    .join('\n')
  const compactIdea = idea.trim() || '未命名角色'
  const nameGuess = compactIdea.match(/一个(.+?)(角色|$)/)?.[1]?.slice(0, 8)

  return {
    id: nanoid(),
    name: nameGuess || '新角色',
    avatar: '',
    summary: compactIdea,
    personality: userNotes || '冷静、克制，但会在关键时刻保护重要的人。',
    scenario:
      '用户与角色在一个可持续展开的私密叙事场景中相遇，关系会随对话逐步推进。',
    firstMessage: '你来了。别站在门口，外面不安全。',
    exampleDialogues: [
      '用户：你为什么帮我？\n角色：因为你还没学会在危险里好好活着。',
    ],
    speakingStyle: '短句、克制、带一点隐藏的关心。',
    background: `${compactIdea}\n\n创作问答记录：\n${userNotes || '暂无补充。'}`,
    likes: ['秩序', '专业能力', '被信任'],
    dislikes: ['背叛', '失控', '无意义的牺牲'],
    creatorNotes: '由本地角色创建向导生成，可在保存前继续编辑。',
    tags: ['向导生成', 'MVP'],
    version: '1.0.0',
    createdAt: timestamp,
    updatedAt: timestamp,
  }
}

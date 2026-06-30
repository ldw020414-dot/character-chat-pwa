export type LLMErrorCode =
  | 'auth_failed'
  | 'insufficient_quota'
  | 'rate_limited'
  | 'network_error'
  | 'model_not_found'
  | 'context_length_exceeded'
  | 'bad_request'
  | 'unknown'

export class LLMProviderError extends Error {
  readonly code: LLMErrorCode
  readonly status?: number | undefined

  constructor(
    code: LLMErrorCode,
    message: string,
    status?: number,
  ) {
    super(message)
    this.name = 'LLMProviderError'
    this.code = code
    this.status = status
  }
}

export const mapHttpStatusToLLMError = (status: number, message: string) => {
  if (status === 401 || status === 403) {
    return new LLMProviderError('auth_failed', 'API Key 无效或无权限。', status)
  }

  if (status === 402) {
    return new LLMProviderError('insufficient_quota', '账户余额不足。', status)
  }

  if (status === 404) {
    return new LLMProviderError('model_not_found', '模型不存在或不可用。', status)
  }

  if (status === 413 || status === 422) {
    return new LLMProviderError(
      'context_length_exceeded',
      '上下文过长，请减少历史消息或世界书内容。',
      status,
    )
  }

  if (status === 429) {
    return new LLMProviderError('rate_limited', '请求过于频繁，请稍后重试。', status)
  }

  if (status >= 400 && status < 500) {
    return new LLMProviderError('bad_request', message || '请求参数有误。', status)
  }

  return new LLMProviderError('unknown', message || '模型服务暂时不可用。', status)
}

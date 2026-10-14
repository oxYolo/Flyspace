import { sm2 } from 'sm-crypto'

export interface Sm2LoginConfig {
  publicKey?: string
  cipherMode?: 0 | 1
}

export function encryptSm2LoginText(
  text: string,
  config: Sm2LoginConfig,
): string {
  const publicKey = normalizeSm2PublicKey(config.publicKey)
  if (!publicKey) {
    throw new Error('未配置SM2登录公钥')
  }

  const cipherMode = config.cipherMode ?? 1
  const encrypted = sm2.doEncrypt(text, publicKey, cipherMode)
  if (!encrypted) {
    throw new Error('SM2加密失败')
  }

  return encrypted
}

function normalizeSm2PublicKey(publicKey?: string): string {
  const key = (publicKey || '').replace(/\s+/g, '')
  if (!key) return ''
  const normalized = key.startsWith('04') ? key : `04${key}`
  if (!/^[0-9a-fA-F]+$/.test(normalized) || normalized.length !== 130) {
    throw new Error('SM2登录公钥格式错误，请配置带04前缀的130位十六进制公钥')
  }
  return normalized
}

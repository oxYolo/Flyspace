const TokenKey = 'Admin-Token'

const ExpiresInKey = 'Admin-Expires-In'

export function getToken(): string | undefined {
  if (!sessionStorage) return

  return sessionStorage.getItem(TokenKey) ?? undefined
}

export function setToken(token: string): string | undefined {
  if (!sessionStorage) return

  sessionStorage.setItem(TokenKey, token)
  return token
}

export function removeToken(): void {
  if (!sessionStorage) return

  sessionStorage.removeItem(TokenKey)
}

export function getExpiresIn(): string | number {
  if (!sessionStorage) return -1

  return sessionStorage.getItem(ExpiresInKey) || -1
}

export function setExpiresIn(time: string): string | undefined {
  if (!sessionStorage) return

  sessionStorage.setItem(ExpiresInKey, time)
  return time
}

export function removeExpiresIn(): void {
  if (!sessionStorage) return

  sessionStorage.removeItem(ExpiresInKey)
}

export type TErrorCode = 401 | 403 | 404 | 'default' | number
export type TOtherCode = 500 | 601 | 200 | number
export type TCode = TErrorCode | TOtherCode

export interface I {
  msg: string
  code: TErrorCode
}

export interface IRspObj {
  code: TErrorCode
  msg: string
}

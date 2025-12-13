import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'

const root = fileURLToPath(new URL('../..', import.meta.url))
export const r = (...args) => resolve(root, ...args)
export const isDev = process.env.NODE_ENV === 'development'
export const port = Number(process.env.PORT || '') || 3000

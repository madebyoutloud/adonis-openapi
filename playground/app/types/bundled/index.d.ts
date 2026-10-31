/**
 * Stand-in for a package built with tsdown, shared types live in a chunk
 * with minified export names, e.g. `Token` is exported as `s`.
 */
import { s as Token } from './token-CqWwLUUX.js'

declare function issueToken(name: string): Token

export { Token, issueToken }

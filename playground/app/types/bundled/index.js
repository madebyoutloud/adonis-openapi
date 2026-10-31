import { s as Token } from './token-CqWwLUUX.js'

function issueToken(name) {
  return new Token(name, 'secret', ['*'])
}

export { Token, issueToken }

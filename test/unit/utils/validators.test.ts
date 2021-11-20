// eslint-disable-next-line
const assert = require('assert');
import {validURL} from '../../../src/utils/validators'

const EXAMPLE_URL = 'https://example.com'
const GITHUB_URL = 'https://github.com'

describe('validURL', () => {
  it('should return false if param url is not a github url', () => {
    const isValid = validURL(EXAMPLE_URL)
    assert.equal(isValid, false)
  })

  it('should return false is param url is not a valid url', () => {
    const isValid = validURL('whatever')
    assert.equal(isValid, false)
  })

  it('should return true if param url is a valid github url', () => {
    const isValid = validURL(GITHUB_URL)
    assert.equal(isValid, true)
  })
})

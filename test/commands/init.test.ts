import {expect, test} from '@oclif/test'

describe('start', () => {
  test
  .stdout()
  .command(['start'])
  .it('should show an error if no learn.json file present', ctx => {
    expect(ctx.stdout).to.contain(
      '⨉ learn.json file not found on current folder, is this a learnpack package?',
    )
  })
})

import {expect} from 'chai'
import {download, downloadEditor} from '../../../src/managers/file'

describe('file:downloadEditor', () => {
  it('function should exists', () => {
    expect(downloadEditor).not.undefined
  })
})

describe('file:download', () => {
  it('function should exists', () => {
    expect(download).not.undefined
  })
})

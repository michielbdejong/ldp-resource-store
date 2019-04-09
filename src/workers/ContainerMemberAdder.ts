import Debug from 'debug'
import StorageWorker from './StorageWorker'
import Worker from './Worker'
import { ResponderAndReleaserTask, ResultType } from './ResponderAndReleaser'
import { LdpParserResult } from './LdpParser'
import uuid from 'uuid/v4'
import { makeResourceData } from '../ResourceData'

const debug = Debug('ContainerMemberAdder')

export class ContainerMemberAdder extends StorageWorker implements Worker {
  async handle (task: LdpParserResult) {
    debug('LdpParserResult ContainerMemberAdder!')
    const resourcePath = task.path + uuid()
    const resource = this.storage.getReadWriteLockedResource(resourcePath)
    if (!resource.exists()) {
      await resource.reset()
      debug('resource.reset has been called')
    }
    await resource.setData(makeResourceData(task.contentType, task.requestBody))
    return {
      resultType: ResultType.Created,
      createdLocation: resourcePath
    } as ResponderAndReleaserTask
  }
}

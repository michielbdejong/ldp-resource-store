// Used as:
//  * workers.parseLdp
// Receives tasks from:
//  * the ldp.ts as they come in to the http server.
// Posts tasks to:
//  * the Authentication at workers.determineIdentity
//  * the ResponderAndReleaser at workers.respondAndRelease

import Worker from './Worker'
import { ResponderAndReleaserTask, ResultType } from './ResponderAndReleaser'

// import { HttpRequest, HttpResponse } from 'http'

// parse the http request to extract some basic info (e.g. is it a container?)
// and add that info to the request, then pass it on to the colleague from
// Authentication:
export class LdpParser extends Worker {
  getContainerTask(method) {
    if (method === 'OPTIONS' || method === 'HEAD' || method === 'GET') {
      return 'containerRead'
    }
    if (method === 'POST' || method === 'PUT') {
      return 'containerMemberAdd'
    }
    if (method === 'DELETE') {
      return 'containerDelete'
    }
    return 'unknown'
  }

  getGlobTask(method) {
    if (method === 'OPTIONS' || method === 'HEAD' || method === 'GET') {
      return 'globRead'
    }
    return 'unknown'
  }

  getResourceTask(method) {
    if (method === 'OPTIONS' || method === 'HEAD' || method === 'GET') {
      return 'resourceRead'
    }
    if (method === 'PUT') {
      return 'resourceWrite'
    }
    if (method === 'PUT') {
      return 'resourceUpdate'
    }
    if (method === 'DELETE') {
      return 'resourceDelete'
    }
    console.log('unknown http method', method)
    return 'unknown'
  }

  determineLdpTaskName(httpReq: any) {
    // if the URL end with a / then the path indicates a container
    // if the URL end with /* then the path indicates a glob
    // in all other cases, the path indicates a resource

    const lastUrlChar = httpReq.url.substr(-1)
    if (lastUrlChar === '/') {
      return this.getContainerTask(httpReq.method)
    } else if (lastUrlChar === '*') {
      return this.getGlobTask(httpReq.method)
    } else {
      return this.getResourceTask(httpReq.method)
    }
    return 'containerRead' // todo: implement
  }

  determineOrigin(httpReq: any) {
    return httpReq.headers.origin
  }

  determineContentType(httpReq: any) {
    return httpReq.headers['content-type']
  }

  determineMayIncreaseDiskUsage(httpReq: any) {
    return (['OPTIONS', 'HEAD', 'GET', 'DELETE'].indexOf(httpReq.method) === -1)
  }

  determineOmitBody(httpReq: any) {
    return (['OPTIONS', 'HEAD'].indexOf(httpReq.method) !== -1)
  }

  async post(task: LdpParserTask) {
    console.log('LdpParserTask!')
    let errorCode = null // todo actually use this. maybe with try-catch?
    const parsedTask = {
      mayIncreaseDiskUsage: this.determineMayIncreaseDiskUsage(task.httpReq),
      omitBody: this.determineOmitBody(task.httpReq),
      isContainer: (task.httpReq.url.substr(-1) === '/'), // FIXME: code duplication, see determineLdpTaskName above
      origin: this.determineOrigin(task.httpReq),
      contentType: this.determineContentType(task.httpReq),
      ldpTaskName: this.determineLdpTaskName(task.httpReq),
      path: task.httpReq.url,
      httpRes: task.httpRes, // passed on
    } as LdpParserResult
    await new Promise(resolve => {
      parsedTask.requestBody = ''
      task.httpReq.on('data', chunk => {
        parsedTask.requestBody += chunk
      })
      task.httpReq.on('end', resolve)
    })
    console.log('parsed http request', {
      method: task.httpReq.method,
      headers: task.httpReq.headers,
      mayIncreaseDiskUsage: parsedTask.mayIncreaseDiskUsage,
      omitBody: parsedTask.omitBody,
      isContainer: parsedTask.isContainer,
      origin: parsedTask.origin,
      ldpTaskName: parsedTask.ldpTaskName,
      path: parsedTask.path,
      requestBody: parsedTask.requestBody,
    })
    if (errorCode === null) {
      this.colleagues.success.post(parsedTask)
    } else {
      const errorResponse = {
        resultType: ResultType.CouldNotParse,
        httpRes: task.httpRes,
      } as ResponderAndReleaserTask
      this.colleagues.failure.post(errorResponse)
    }
  }
}

export class LdpParserResult {
  mayIncreaseDiskUsage: boolean
  isContainer: boolean
  omitBody: boolean
  origin: string
  contentType: string | undefined
  ldpTaskName: string
  path: string
  requestBody: string
  httpRes: any // HttpResponse
}

export class LdpParserTask {
  httpReq: any // HttpRequest
  httpRes: any // HttpResponse
}

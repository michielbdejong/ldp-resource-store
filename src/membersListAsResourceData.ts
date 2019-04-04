import * as Stream from 'stream'
import ResourceData from './ResourceData'

const NEWLINE = '\r\n'


function toTurtle (containerUrl: string, fileNames: Array<string>) : string {
  console.log('folderDescription', fileNames)

  const prefixes = [
    '@prefix ldp: <http://www.w3.org/ns/ldp#>.',
  ]
  const memberRefs = fileNames.map(filename => `<${filename}>`)
  const containerItem = [
    `<${containerUrl}>`,
    `    ldp:contains ${memberRefs.join(', ')};`
  ].join(NEWLINE)
  return [
    prefixes.join(NEWLINE),
    containerItem,
  ].join(NEWLINE + NEWLINE) + NEWLINE
}

function toJsonLd (containerUrl: string, fileNames: Array<string>) : string {
  return JSON.stringify({
    "@id": containerUrl,
    "contains": fileNames.map(fileName => containerUrl + fileName),
    "@context":{
      "contains":{
        "@id":"http://www.w3.org/ns/ldp#contains",
        "@type":"@id"
      },
      "ldp":"http://www.w3.org/ns/ldp#",
    }
  })
}

export default function membersListAsResourceData (containerUrl, fileNames, headers): ResourceData {
  console.log(headers)
  const contentType = 'application/ld+json'
  console.log('toFolderDescription', containerUrl, fileNames, contentType)
  if (contentType === 'application/ld+json') {
     return {
       body: toJsonLd(containerUrl, fileNames),
       contentType: 'application/ld+json'
     } as ResourceData
  } else {
    return {
      body: toTurtle(containerUrl, fileNames),
      contentType: 'text/turtle'
    } as ResourceData
  }
}

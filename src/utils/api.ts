import Console from '../utils/console'
import * as storage from 'node-persist'
import cli from 'cli-ux'
// const HOST = "https://8000-a72835c1-5411-423b-86e2-dd8df8faab48.ws-us03.gitpod.io";
const HOST = 'https://learnpack.herokuapp.com'

interface IHeaders {
  'Content-Type'?: string;
  Authorization?: string;
}

interface IOptions {
  headers?: IHeaders;
}

const fetch = async (url: string, options: IOptions = {}) => {
  const headers: IHeaders = {'Content-Type': 'application/json'}
  let session = null
  try {
    session = await storage.getItem('bc-payload')
    if (session.token && session.token !== '' && !url.includes('/token'))
      headers.Authorization = 'Token ' + session.token
  } catch {}

  try {
    const resp = await _fetch(url, {
      ...options,
      headers: {...headers, ...options.headers},
    })

    if (resp.status >= 200 && resp.status < 300)
      return await resp.json()
    if (resp.status === 401)
      throw new APIError('Invalid authentication credentials', 401)
    else if (resp.status === 404)
      throw new APIError('Package not found', 404)
    else if (resp.status >= 500)
      throw new APIError('Impossible to connect with the server', 500)
    else if (resp.status >= 400) {
      const error = await resp.json()
      if (error.detail || error.error) {
        throw new APIError(error.detail || error.error)
      } else if (error.nonFieldErrors) {
        throw new APIError(nonFieldErrors[0], error)
      } else if (typeof error === 'object') {
        if (Object.keys(error).length > 0) {
          throw new APIError(`${key}: ${error[key][0]}`, error)
        }
      } else {
        throw new APIError('Uknown error')
      }
    } else
      throw new APIError('Uknown error')
  } catch (error) {
    Console.error(error.message)
    throw error
  }
}

const login = async (identification, password) => {
  try {
    cli.action.start('Looking for credentials...')
    await cli.wait(1000)
    const data = await fetch(`${HOST}/v1/auth/token/`, {
      body: JSON.stringify({identification, password}),
      method: 'post',
    })
    cli.action.stop('ready')
    return data
  } catch (error) {
    Console.error(error.message)
    Console.debug(error)
  }
}

const publish = async config => {
  const keys = [
    'difficulty',
    'language',
    'skills',
    'technologies',
    'slug',
    'repository',
    'author',
    'title',
  ]

  const payload = {}
  for (const k of keys)
    config[k] ? (payload[k] = config[k]) : null
  try {
    console.log('Package to publish:', payload)
    cli.action.start('Updating package information...')
    await cli.wait(1000)
    const data = await fetch(`${HOST}/v1/package/${config.slug}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    })
    cli.action.stop('ready')
    return data
  } catch (error) {
    console.log('payload', payload)
    Console.error(error.message)
    Console.debug(error)
    throw error
  }
}

const update = async config => {
  try {
    cli.action.start('Updating package information...')
    await cli.wait(1000)
    const data = await fetch(`${HOST}/v1/package/`, {
      method: 'POST',
      body: JSON.stringify(config),
    })
    cli.action.stop('ready')
    return data
  } catch (error) {
    Console.error(error.message)
    Console.debug(error)
    throw error
  }
}

const getPackage = async slug => {
  try {
    cli.action.start('Downloading package information...')
    await cli.wait(1000)
    const data = await fetch(`${HOST}/v1/package/${slug}`)
    cli.action.stop('ready')
    return data
  } catch (error) {
    if (error.status === 404)
      Console.error(`Package ${slug} does not exist`)
    else
      Console.error(`Package ${slug} does not exist`)
    Console.debug(error)
    throw error
  }
}

const getLangs = async () => {
  try {
    cli.action.start('Downloading language options...')
    await cli.wait(1000)
    const data = await fetch(`${HOST}/v1/package/language`)
    cli.action.stop('ready')
    return data
  } catch (error) {
    if (error.status === 404)
      Console.error(`Package ${slug} does not exist`)
    else
      Console.error(`Package ${slug} does not exist`)
    Console.debug(error)
    throw error
  }
}

const getAllPackages = async ({lang = '', slug = ''}) => {
  try {
    cli.action.start('Downloading packages...')
    await cli.wait(1000)
    const data = await fetch(
      `${HOST}/v1/package/all?limit=100&language=${lang}&slug=${slug}`,
    )
    cli.action.stop('ready')
    return data
  } catch (error) {
    Console.error(`Package ${slug} does not exist`)
    Console.debug(error)
    throw error
  }
}

const APIError = (error, code) => {
  const message = error.message || error
  const _err = new Error(message)
  _err.status = code || 400
  return _err
}

export default {login, publish, update, getPackage, getLangs, getAllPackages}

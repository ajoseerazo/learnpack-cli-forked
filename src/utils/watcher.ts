import * as chokidar from 'chokidar'
import debounce from 'debounce'

export default (path: string) =>
  new Promise((resolve /* , reject */) => {
    const watcher = chokidar.watch(path, {
      ignored: (_path: any, _stats: any) => {
        return _stats && !_stats.isDirectory()
      },
      persistent: true,
      depth: 1,
      ignoreInitial: true,
    })

    const onChange = (eventname: string, _filename: string) => {
      resolve(eventname /* , filename */)
    }

    watcher.on('all', debounce(onChange, 500, true))
    // watcher.on('all', onChange)

    process.on('SIGINT', function () {
      watcher.close()
      process.exit()
    })
  })

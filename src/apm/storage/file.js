import { readFile } from 'fs'
import { join } from 'path'

export default (dir, path) => {
  return new Promise((resolve, reject) => {
    const filepath = join(dir, path)

    readFile(filepath, 'utf8', (err, file) => {
      if (err) return reject(err)
      resolve(file)
    })
  })
}

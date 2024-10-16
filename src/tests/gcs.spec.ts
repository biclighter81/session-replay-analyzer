import { MockStorage } from 'mock-gcs'
import { BUCKET_NAME } from '../config'
import zlib from 'zlib'
import { GCSStorageProvider } from '../storage'

const storage = new MockStorage()
const storageProvider = new GCSStorageProvider(storage)
describe('gcs', () => {
  describe('downloadFromFilename', () => {
    it('Responds string when exists', async () => {
      await storage.bucket(BUCKET_NAME).file('a').save(zlib.gzipSync('test'))
      expect(await storageProvider.downloadFromFilename('a')).toBe('test')
    })
    it('Responds string when not exists', async () => {
      const response = await storageProvider.downloadFromFilename('b')
      expect(response).toBe('[]')
    })
  })
  describe('downloadFromFilenames', () => {
    it('Responds array string when exists', async () => {
      await storage.bucket(BUCKET_NAME).file('a').save(zlib.gzipSync('test'))
      await storage.bucket(BUCKET_NAME).file('b').save(zlib.gzipSync('other'))

      const response = await storageProvider.downloadFromFilenames(['a', 'b'])
      expect(response).toStrictEqual(['test', 'other'])
    })
    it('Responds array string when not exists', async () => {
      const response = await storageProvider.downloadFromFilenames(['y', 'z'])
      expect(response).toStrictEqual(['[]', '[]'])
    })
  })
})

import { BUCKET_NAME } from '../config'
import { mockClient } from 'aws-sdk-client-mock';
import { GetObjectCommand, S3Client } from '@aws-sdk/client-s3';
import zlib from 'zlib'
import { S3StorageProvider } from '../storage';
import { Readable } from 'stream';
import { sdkStreamMixin } from '@smithy/util-stream';

function createSdkStreamFromBuffer(buffer: Buffer) {
  const stream = new Readable();
  stream.push(buffer);
  stream.push(null); // Indicate the end of the stream
  return sdkStreamMixin(stream);
}

const client = new S3Client({})
const s3Mock = mockClient(client);
const storageProvider = new S3StorageProvider(client)

describe('s3', () => {
  beforeEach(() => {
    s3Mock.reset()
  })
  describe('downloadFromFilename', () => {
    it('Responds string when exists', async () => {
      s3Mock.on(GetObjectCommand, { Bucket: BUCKET_NAME, Key: 'a' }).resolves({ Body: createSdkStreamFromBuffer(zlib.gzipSync('test')) })
      expect(await storageProvider.downloadFromFilename('a')).toBe('test')
    })
    it('Responds string when not exists', async () => {
      s3Mock.on(GetObjectCommand, { Bucket: BUCKET_NAME, Key: 'b' }).resolves({ Body: createSdkStreamFromBuffer(zlib.gzipSync('[]')) })
      const response = await storageProvider.downloadFromFilename('b')
      expect(response).toBe('[]')
    })
  })
  describe('downloadFromFilenames', () => {
    it('Responds array string when exists', async () => {
      s3Mock.on(GetObjectCommand, { Bucket: BUCKET_NAME, Key: 'a' }).resolves({ Body: createSdkStreamFromBuffer(zlib.gzipSync('test')) })
      s3Mock.on(GetObjectCommand, { Bucket: BUCKET_NAME, Key: 'b' }).resolves({ Body: createSdkStreamFromBuffer(zlib.gzipSync('other')) })
      const response = await storageProvider.downloadFromFilenames(['a', 'b'])
      expect(response).toStrictEqual(['test', 'other'])
    })
    it('Responds array string when not exists', async () => {
      const response = await storageProvider.downloadFromFilenames(['y', 'z'])
      expect(response).toStrictEqual(['[]', '[]'])
    })
  })
})

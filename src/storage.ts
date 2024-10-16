import { IStorage, MockStorage } from "mock-gcs";
import { BUCKET_NAME, ENVIRONMENT, S3_ACCESS_KEY_ID, S3_ENDPOINT, S3_FORCE_PATH_STYLE, S3_REGION, S3_SECRET_ACCESS_KEY, STORAGE_PROVIDER } from "./config";
import * as Sentry from "@sentry/node";
import { GetObjectCommand, S3Client, S3ClientConfig } from "@aws-sdk/client-s3";
import { Storage } from "@google-cloud/storage";
import zlib from 'zlib';

interface StorageProvider {
    downloadFromFilename(filename: string): Promise<string>;
    downloadFromFilenames(filenames: string[]): Promise<string[]>;
}

function newStorage(): StorageProvider {
    if (ENVIRONMENT === "test") {
        return new GCSStorageProvider(new MockStorage())
    }
    switch (STORAGE_PROVIDER) {
        case "s3":
            return new S3StorageProvider()
        default:
            return new GCSStorageProvider(new Storage())
    }
}

function caputreDownloadException(e: any, filename: string) {
    console.warn("Error downloading file", filename, e?.message)
    Sentry.captureException(e, (scope) => {
        scope.setTag("fileName", filename);
        scope.setTag("bucketName", BUCKET_NAME);
        return scope;
    });
}

class GCSStorageProvider implements StorageProvider {
    storage: IStorage;
    constructor(storage: IStorage) {
        this.storage = storage;
    }

    async downloadFromFilename(filename: string): Promise<string> {
        try {
            const response = await this.storage.bucket(BUCKET_NAME).file(filename).download()
            return zlib.unzipSync(response[0]).toString()
        } catch (e) {
            caputreDownloadException(e, filename)
            return '[]'
        }
    }

    async downloadFromFilenames(filenames: string[]): Promise<string[]> {
        return await Promise.all(filenames.map(async (f) => await this.downloadFromFilename(f)))
    }
}

class S3StorageProvider implements StorageProvider {
    client: S3Client;
    constructor(client?: S3Client) {
        if (client) {
            this.client = client
        } else {
            this.client = new S3Client({
                endpoint: S3_ENDPOINT,
                region: S3_REGION,
                credentials: {
                    accessKeyId: S3_ACCESS_KEY_ID,
                    secretAccessKey: S3_SECRET_ACCESS_KEY
                },
                forcePathStyle: S3_FORCE_PATH_STYLE
            })
        }
    }
    async downloadFromFilename(filename: string): Promise<string> {
        try {
            const command = new GetObjectCommand({
                Bucket: BUCKET_NAME,
                Key: filename
            })
            const response = await this.client.send(command)
            const byteArray = await response.Body?.transformToByteArray()
            const buffer = zlib.unzipSync(Buffer.from(byteArray!)).toString()
            return buffer.toString()
        } catch (e) {
            caputreDownloadException(e, filename)
            return '[]'
        }
    }

    async downloadFromFilenames(filenames: string[]): Promise<string[]> {
        return await Promise.all(filenames.map(async (f) => await this.downloadFromFilename(f)))
    }
}
export { GCSStorageProvider, S3StorageProvider, StorageProvider, newStorage }
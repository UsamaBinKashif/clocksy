import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

/**
 * Reusable, provider-agnostic storage abstraction over an S3-compatible API
 * (MinIO in dev/self-hosted). The rest of the app depends only on this module,
 * never on the AWS SDK directly.
 */

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}

const bucket = requireEnv('S3_BUCKET')

const client = new S3Client({
  endpoint: requireEnv('S3_ENDPOINT'),
  region: process.env.S3_REGION ?? 'us-east-1',
  // Path-style addressing is required for MinIO (no DNS bucket subdomains).
  forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') !== 'false',
  credentials: {
    accessKeyId: requireEnv('S3_ACCESS_KEY'),
    secretAccessKey: requireEnv('S3_SECRET_KEY')
  }
})

export interface StorageService {
  /** Upload a buffer/stream to the given key. */
  upload: (
    key: string,
    body: Buffer | Uint8Array,
    contentType?: string
  ) => Promise<void>
  /** Delete an object by key. No-op if it does not exist. */
  delete: (key: string) => Promise<void>
  /** Presigned GET URL for temporary read access. */
  getUrl: (key: string, expiresInSeconds?: number) => Promise<string>
  /** Presigned PUT URL so clients can upload directly to storage. */
  getUploadUrl: (
    key: string,
    contentType?: string,
    expiresInSeconds?: number
  ) => Promise<string>
}

export const storage: StorageService = {
  async upload(key, body, contentType) {
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: body,
        ContentType: contentType
      })
    )
  },

  async delete(key) {
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucket,
        Key: key
      })
    )
  },

  async getUrl(key, expiresInSeconds = 60) {
    return getSignedUrl(
      client,
      new GetObjectCommand({ Bucket: bucket, Key: key }),
      { expiresIn: expiresInSeconds }
    )
  },

  async getUploadUrl(key, contentType, expiresInSeconds = 300) {
    return getSignedUrl(
      client,
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        ContentType: contentType
      }),
      { expiresIn: expiresInSeconds }
    )
  }
}

export { bucket as STORAGE_BUCKET }

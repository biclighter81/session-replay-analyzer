const BUCKET_NAME = process.env.BUCKET_NAME || "default"
const STORAGE_PROVIDER = process.env.STORAGE_PROVIDER || "gcs"
const S3_ENDPOINT = process.env.S3_ENDPOINT || ""
const S3_REGION = process.env.S3_REGION || ""
const S3_ACCESS_KEY_ID = process.env.S3_ACCESS_KEY_ID || ""
const S3_SECRET_ACCESS_KEY = process.env.S3_SECRET_ACCESS_KEY || ""
const S3_FORCE_PATH_STYLE = process.env.S3_FORCE_PATH_STYLE === "true"
const ENVIRONMENT = process.env.NODE_ENV || ""
const SENTRY_DSN = process.env.SENTRY_DSN || ""
const SENTRY_TRACE_SAMPLE_RATE = parseFloat(process.env.SENTRY_TRACE_SAMPLE_RATE || "1.0")
const SENTRY_PROFILE_SAMPLE_RATE = parseFloat(process.env.SENTRY_PROFILE_SAMPLE_RATE || "0.1")

export { BUCKET_NAME, ENVIRONMENT, SENTRY_DSN, SENTRY_TRACE_SAMPLE_RATE, SENTRY_PROFILE_SAMPLE_RATE, STORAGE_PROVIDER, S3_ENDPOINT, S3_REGION, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY, S3_FORCE_PATH_STYLE }

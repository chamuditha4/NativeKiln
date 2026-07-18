import { Inject, Injectable, Logger, type OnModuleInit } from '@nestjs/common';
import { HeadBucketCommand, ListObjectsV2Command, S3Client } from '@aws-sdk/client-s3';
import { API_CONFIG, type ApiConfig } from '../config/api-config.js';

export type StorageStore = 'artifacts' | 'logs' | 'sources';

/**
 * S3-compatible object storage (Cloudflare R2 by default). A single bucket is
 * partitioned by prefix into artifacts, logs, and source archives. Internal
 * object keys are resolved through {@link key}. Downloads use presigned URLs
 * (added with the artifact flow in a later phase).
 */
@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger('Storage');
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly prefixes: Record<StorageStore, string>;

  constructor(@Inject(API_CONFIG) private readonly config: ApiConfig) {
    this.client = new S3Client({
      region: config.S3_REGION,
      // Omitted for real AWS S3; set to the account endpoint for R2.
      ...(config.S3_ENDPOINT_URL ? { endpoint: config.S3_ENDPOINT_URL } : {}),
      forcePathStyle: config.S3_FORCE_PATH_STYLE,
      credentials: {
        accessKeyId: config.S3_ACCESS_KEY_ID,
        secretAccessKey: config.S3_SECRET_ACCESS_KEY,
      },
    });
    this.bucket = config.S3_BUCKET;
    this.prefixes = {
      artifacts: config.S3_PREFIX_ARTIFACTS,
      logs: config.S3_PREFIX_LOGS,
      sources: config.S3_PREFIX_SOURCES,
    };
  }

  async onModuleInit(): Promise<void> {
    // Verify the bucket is reachable with the provided credentials. We do not
    // create it: the R2 bucket is provisioned out-of-band by the owner.
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
    } catch (err) {
      this.logger.warn(
        `Object storage bucket "${this.bucket}" not reachable at startup: ${
          err instanceof Error ? err.message : 'unknown'
        }`,
      );
    }
  }

  get connection(): S3Client {
    return this.client;
  }

  get bucketName(): string {
    return this.bucket;
  }

  /** Resolves a store-relative path into a fully-prefixed object key. */
  key(store: StorageStore, path: string): string {
    return `${this.prefixes[store]}${path.replace(/^\/+/, '')}`;
  }

  /** Cheap round-trip proving credentials and bucket access for readiness. */
  async healthy(): Promise<boolean> {
    await this.client.send(new ListObjectsV2Command({ Bucket: this.bucket, MaxKeys: 1 }));
    return true;
  }
}

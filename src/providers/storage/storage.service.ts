import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { IStorageService, UploadResult } from './storage.interface';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService implements IStorageService {
  private readonly s3Client: S3Client;
  private readonly bucketName: string;

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.getOrThrow('STORAGE_BUCKET_NAME');

    this.s3Client = new S3Client({
      region: this.configService.getOrThrow('STORAGE_REGION'),
      endpoint: this.configService.get('STORAGE_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.getOrThrow('STORAGE_ACCESS_KEY'),
        secretAccessKey: this.configService.getOrThrow('STORAGE_SECRET_KEY'),
      },
      forcePathStyle: true, // algo de MinIO
    });
  }

  async upload(file: Express.Multer.File): Promise<UploadResult> {
    const fileExtension = file.originalname.split('.').pop();
    const key = `${uuidv4()}.${fileExtension}`;

    try {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          // ACL: 'public-read', // Descomentar si el bucket es público
        }),
      );

      const endpoint = this.configService.get('STORAGE_ENDPOINT');

      if (endpoint) {
        return {
          url: `${endpoint}/${this.bucketName}/${key}`,
          key,
        };
      }
      return {
        url: `https://${this.bucketName}.s3.amazonaws.com/${key}`,
        key,
      };
    } catch (error) {
      console.error('Error subiendo archivo:', error);
      throw new InternalServerErrorException('Error al guardar el archivo');
    }
  }

  async delete(key: string): Promise<void> {
    await this.s3Client.send(
      new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }),
    );
  }
}

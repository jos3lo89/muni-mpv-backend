export interface UploadResult {
  url: string;
  key: string;
}

export interface IStorageService {
  upload(file: Express.Multer.File): Promise<UploadResult>;
  delete(key: string): Promise<void>;
}

export const STORAGE_SERVICE = 'STORAGE_SERVICE';

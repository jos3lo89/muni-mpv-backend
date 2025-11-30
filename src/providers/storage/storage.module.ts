import { Global, Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { STORAGE_SERVICE } from './storage.interface';

@Global()
@Module({
  providers: [
    {
      provide: STORAGE_SERVICE,
      useClass: StorageService,
    },
  ],
  exports: [STORAGE_SERVICE],
})
export class StorageModule {}

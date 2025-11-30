import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

@Injectable()
export class FileRequiredPipe implements PipeTransform {
  transform(file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('El archivo "file" es obligatorio.');
    }
    return file;
  }
}

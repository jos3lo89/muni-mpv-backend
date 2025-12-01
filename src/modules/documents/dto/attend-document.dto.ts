import { IsString, IsNotEmpty, IsEnum } from 'class-validator';
import { DocumentStatus } from 'src/generated/prisma/enums';

export class AttendDocumentDto {
  @IsString()
  @IsNotEmpty()
  observation: string; // Conclusión final (Ej: "Se emitió licencia N° 123")

  @IsEnum(DocumentStatus)
  @IsNotEmpty()
  finalStatus: DocumentStatus; // Solo permitir ATENDIDO o ARCHIVADO
}

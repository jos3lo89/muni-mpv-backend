import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class DeriveDocumentDto {
  @IsUUID('4', {
    message: 'El ID de la oficina destino debe ser un UUID válido.',
  })
  @IsNotEmpty({ message: 'El ID de la oficina destino es obligatorio.' })
  targetOfficeId: string;

  @IsString({ message: 'Las instrucciones de derivación deben ser un string.' })
  @IsNotEmpty({ message: 'Las instrucciones de derivación son obligatorias.' })
  instructions: string;
}

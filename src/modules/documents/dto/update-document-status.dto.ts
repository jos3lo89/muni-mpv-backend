import { IsString, IsNotEmpty } from 'class-validator';

export class RejectDocumentDto {
  @IsString()
  @IsNotEmpty({ message: 'Debe indicar el motivo del rechazo u observación.' })
  observation: string;
}

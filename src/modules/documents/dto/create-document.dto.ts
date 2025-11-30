import {
  IsEnum,
  IsEmail,
  IsString,
  IsOptional,
  IsInt,
  IsNotEmpty,
  Min,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApplicantType, DocumentType } from 'src/generated/prisma/enums';

export class CreateDocumentDto {
  @IsEnum(ApplicantType)
  @IsNotEmpty()
  applicantType: ApplicantType;

  @IsString()
  @IsNotEmpty()
  applicantIdentifier: string; // DNI o RUC

  @IsString()
  @IsNotEmpty()
  applicantName: string;

  @IsString()
  @IsNotEmpty()
  applicantLastname: string;

  @IsEmail()
  @IsNotEmpty()
  applicantEmail: string;

  @IsString()
  @IsOptional()
  applicantPhone?: string;

  @IsString()
  @IsOptional()
  applicantAddress?: string;

  @IsEnum(DocumentType)
  @IsNotEmpty()
  documentType: DocumentType;

  @IsString()
  @IsNotEmpty()
  subject: string; // Asunto del trámite

  @Transform(({ value }) => parseInt(value)) // Convierte el string del form-data a número
  @IsInt()
  @Min(1)
  pageCount: number; // Número de folios
}

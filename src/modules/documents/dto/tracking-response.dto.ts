import { DocumentStatus } from 'src/generated/prisma/enums';

export class TrackingResponseDto {
  trackingCode: string;
  currentStatus: DocumentStatus;
  currentOffice: string; // Nombre de la oficina, no el ID
  subject: string;
  lastUpdate: Date;
  history: {
    date: Date;
    status: DocumentStatus;
    officeName: string; // Dónde pasó
    observation: string; // Qué pasó
  }[];
}

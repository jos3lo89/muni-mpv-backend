import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/core/prisma/prisma.service';
import { STORAGE_SERVICE } from 'src/providers/storage/storage.interface';
import { StorageService } from 'src/providers/storage/storage.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { UserActiveI } from 'src/common/interfaces/userActive.interface';
import { DocumentStatus } from 'src/generated/prisma/enums';
import { generateTrackingCode } from 'src/common/utils/code-generator.util';
import { MailService } from 'src/providers/mail/mail.service';
import { RejectDocumentDto } from './dto/update-document-status.dto';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(STORAGE_SERVICE) private storageService: StorageService,
    private readonly mailService: MailService,
  ) {}

  async createInternal(
    dto: CreateDocumentDto,
    file: Express.Multer.File,
    user: UserActiveI,
  ) {
    const userFound = await this.prisma.user.findUnique({
      where: { id: user.userId },
      select: { officeId: true },
    });

    if (!userFound) {
      throw new NotFoundException('Usuario no encontrado.');
    }

    const currentOfficeId = userFound.officeId;

    if (!currentOfficeId) {
      throw new BadRequestException(
        'El usuario no tiene una oficina asignada para recepcionar documentos.',
      );
    }

    const trackingCode = generateTrackingCode();

    const { key: objectKey, url: objectUrl } =
      await this.storageService.upload(file);
    try {
      const newdoc = await this.prisma.$transaction(async (tx) => {
        const newDoc = await tx.document.create({
          data: {
            trackingCode: trackingCode,
            applicantType: dto.applicantType,
            applicantIdentifier: dto.applicantIdentifier,
            applicantName: dto.applicantName,
            applicantLastname: dto.applicantLastname,
            applicantEmail: dto.applicantEmail,
            applicantPhone: dto.applicantPhone,
            applicantAddress: dto.applicantAddress,
            documentType: dto.documentType,
            subject: dto.subject,
            pageCount: dto.pageCount,
            currentStatus: DocumentStatus.recibido, // Estado inicial: Recibido en Mesa de Partes
            currentOfficeId: currentOfficeId, // Se queda en la oficina del usuario (Mesa de Partes)
            ownerOfficeId: currentOfficeId, // Oficina dueña inicial
          },
        });

        await tx.documentAttachment.create({
          data: {
            fileUrl: objectUrl,
            fileName: file.originalname,
            fileType: file.mimetype,
            documentId: newDoc.id,
            fileKey: objectKey,
          },
        });

        await tx.documentHistory.create({
          data: {
            statusAtMoment: DocumentStatus.recibido,
            observation: null,
            documentId: newDoc.id,
            toOfficeId: currentOfficeId,
            userId: user.userId,
          },
        });

        await this.mailService.sendTrackingCode(
          dto.applicantEmail,
          trackingCode,
        );

        return {
          message: 'Trámite enviado correctamente',
          trackingCode: trackingCode,
          info: 'Se ha enviado el código de seguimiento a su correo electrónico.',
        };
      });
      return newdoc;
    } catch (error) {
      console.error('createInternal(): ', error);
      await this.storageService.delete(objectKey);
      throw new InternalServerErrorException(
        'Error al registrar el documento en base de datos',
      );
    }
  }

  async createExternal(dto: CreateDocumentDto, file: Express.Multer.File) {
    const mesaPartesOffice = await this.prisma.office.findUnique({
      where: { name: 'MESA_DE_PARTES' },
    });

    if (!mesaPartesOffice) {
      throw new InternalServerErrorException('Oficina MP no configurada');
    }

    const trackingCode = generateTrackingCode();

    const { key: objectKey, url: objectUrl } =
      await this.storageService.upload(file);

    try {
      const newDoc = await this.prisma.$transaction(async (tx) => {
        // A. Crear Documento
        const newDoc = await tx.document.create({
          data: {
            trackingCode: trackingCode,
            applicantType: dto.applicantType,
            applicantIdentifier: dto.applicantIdentifier,
            applicantName: dto.applicantName,
            applicantLastname: dto.applicantLastname,
            applicantEmail: dto.applicantEmail,
            applicantPhone: dto.applicantPhone,
            applicantAddress: dto.applicantAddress,
            documentType: dto.documentType,
            subject: dto.subject,
            pageCount: dto.pageCount,
            currentStatus: DocumentStatus.recibido,
            currentOfficeId: mesaPartesOffice.id,
            ownerOfficeId: mesaPartesOffice.id,
          },
        });

        // B. Crear Adjunto
        await tx.documentAttachment.create({
          data: {
            fileName: file.originalname,
            fileUrl: objectUrl,
            fileType: file.mimetype,
            fileKey: objectKey,
            documentId: newDoc.id,
          },
        });

        // C. Historial (AQUÍ ESTÁ EL CAMBIO)
        await tx.documentHistory.create({
          data: {
            statusAtMoment: DocumentStatus.creado,
            observation: 'Registro Web - Pendiente de Validación',
            documentId: newDoc.id,
            toOfficeId: mesaPartesOffice.id,
            userId: null,
          },
        });

        await this.mailService.sendTrackingCode(
          dto.applicantEmail,
          trackingCode,
        );

        return {
          message: 'Trámite enviado correctamente',
          trackingCode: trackingCode,
          info: 'Se ha enviado el código de seguimiento a su correo electrónico.',
        };
      });

      return newDoc;
    } catch (error) {
      console.error('createExternal(): ', error);
      await this.storageService.delete(objectKey);
      throw new InternalServerErrorException(
        'Error al registrar el documento en base de datos',
      );
    }
  }

  async findAllPending() {
    return this.prisma.document.findMany({
      where: {
        currentStatus: DocumentStatus.creado,
      },
      include: {
        attachments: true,
        history: {
          orderBy: { timestamp: 'desc' },
          take: 1,
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async approveDocument(id: string, user: UserActiveI) {
    const userFound = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: { office: { select: { id: true } } },
    });

    if (!userFound) {
      throw new BadRequestException('El usuario no existe.');
    }

    const { office } = userFound;

    if (!office) {
      throw new BadRequestException(
        'El usuario no pertenece a ninguna oficina.',
      );
    }

    const doc = await this.prisma.document.findUnique({ where: { id } });

    if (!doc || doc.currentStatus !== DocumentStatus.creado) {
      throw new BadRequestException(
        'El documento no existe o ya fue procesado.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedDoc = await tx.document.update({
        where: { id },
        data: {
          currentStatus: DocumentStatus.recibido, // [cite: 4] Pasa a estado oficial
          // Opcional: Podrías asignar aquí un número de expediente interno si la muni lo usa
        },
      });

      // B. Historial de Aprobación
      await tx.documentHistory.create({
        data: {
          statusAtMoment: DocumentStatus.recibido,
          observation: 'Documento Validado y Recepcionado conforme.',
          documentId: id,
          fromOfficeId: office.id,
          toOfficeId: office.id,
          userId: user.userId,
        },
      });

      return updatedDoc;
    });
  }

  async rejectDocument(id: string, dto: RejectDocumentDto, user: UserActiveI) {
    const userFound = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: { office: { select: { id: true } } },
    });

    if (!userFound) {
      throw new BadRequestException('El usuario no existe.');
    }

    const { office } = userFound;

    if (!office) {
      throw new BadRequestException(
        'El usuario no pertenece a ninguna oficina.',
      );
    }
    const doc = await this.prisma.document.findUnique({ where: { id } });

    if (!doc || doc.currentStatus !== DocumentStatus.creado) {
      throw new BadRequestException(
        'El documento no existe o ya fue procesado.',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedDoc = await tx.document.update({
        where: { id },
        data: {
          currentStatus: DocumentStatus.rechazado,
        },
      });

      await tx.documentHistory.create({
        data: {
          statusAtMoment: DocumentStatus.rechazado,
          observation: `RECHAZADO: ${dto.observation}`,
          documentId: id,
          fromOfficeId: office.id,
          toOfficeId: office.id,
          userId: user.userId,
        },
      });

      return updatedDoc;
    });
  }
}

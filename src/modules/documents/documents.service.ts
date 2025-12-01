import {
  BadRequestException,
  ForbiddenException,
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
import { DeriveDocumentDto } from './dto/derive-document.dto';
import { AttendDocumentDto } from './dto/attend-document.dto';
import { TrackingResponseDto } from './dto/tracking-response.dto';

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

  async getInbox(user: UserActiveI) {
    const userFound = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: { office: { select: { id: true } } },
    });

    if (!userFound) throw new BadRequestException('El usuario no existe.');

    const { office } = userFound;

    if (!office)
      throw new BadRequestException(
        'El usuario no pertenece a ninguna oficina.',
      );

    return this.prisma.document.findMany({
      where: {
        currentOfficeId: office.id, // FILTRO CRÍTICO
        // Excluimos los que ya murieron (archivados/atendidos) para limpiar la bandeja
        currentStatus: {
          notIn: [
            DocumentStatus.archivado,
            DocumentStatus.atendido,
            DocumentStatus.rechazado,
          ],
        },
      },
      include: {
        attachments: true,
        // Traemos el último movimiento para ver quién me lo envió
        history: {
          orderBy: { timestamp: 'desc' },
          take: 1,
          include: { fromOffice: true },
        },
      },
      orderBy: { updatedAt: 'desc' }, // Lo más reciente primero
    });
  }

  async deriveDocument(id: string, dto: DeriveDocumentDto, user: UserActiveI) {
    // A. Validar que el documento exista y ESTÉ EN MI OFICINA
    const doc = await this.prisma.document.findUnique({ where: { id } });

    if (!doc) throw new NotFoundException('Documento no encontrado');

    const userFound = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: { office: { select: { id: true } } },
    });

    if (!userFound) throw new BadRequestException('El usuario no existe.');

    const { office } = userFound;

    if (!office)
      throw new BadRequestException(
        'El usuario no pertenece a ninguna oficina.',
      );

    // SEGURIDAD: No puedes mover documentos de otra oficina
    if (doc.currentOfficeId !== office.id) {
      throw new ForbiddenException(
        'No puedes derivar un documento que no está en tu oficina actual.',
      );
    }

    // B. Validar oficina destino
    const targetOffice = await this.prisma.office.findUnique({
      where: { id: dto.targetOfficeId },
    });
    if (!targetOffice)
      throw new BadRequestException('La oficina destino no existe.');

    // C. Transacción de Derivación
    return this.prisma.$transaction(async (tx) => {
      // 1. Actualizar ubicación y estado del documento
      const updatedDoc = await tx.document.update({
        where: { id },
        data: {
          currentOfficeId: dto.targetOfficeId, // El documento "viaja"
          currentStatus: DocumentStatus.derivado,
          updatedAt: new Date(),
        },
      });

      // 2. Crear Historial (La "Hoja de Ruta")
      await tx.documentHistory.create({
        data: {
          statusAtMoment: DocumentStatus.derivado,
          observation: dto.instructions, // Instrucciones del jefe/staff
          documentId: id,
          fromOfficeId: office.id, // Sale de mi oficina
          toOfficeId: dto.targetOfficeId, // Entra a la nueva
          userId: user.userId, // Lo hice yo
        },
      });

      return updatedDoc;
    });
  }

  async attendDocument(id: string, dto: AttendDocumentDto, user: UserActiveI) {
    const userFound = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: { office: { select: { id: true } } },
    });

    if (!userFound) throw new BadRequestException('El usuario no existe.');

    const { office } = userFound;

    if (!office)
      throw new BadRequestException(
        'El usuario no pertenece a ninguna oficina.',
      );

    const doc = await this.prisma.document.findUnique({ where: { id } });

    if (!doc || doc.currentOfficeId !== office.id) {
      throw new ForbiddenException(
        'No puedes finalizar un documento que no tienes en tu poder.',
      );
    }

    // Validar que el estado final sea válido (solo atendido o archivado)
    // if (![DocumentStatus.atendido, DocumentStatus.archivado].includes(dto.finalStatus)) {
    //     throw new BadRequestException('Estado final inválido.');
    // }

    const FINAL_STATES: DocumentStatus[] = [
      DocumentStatus.atendido,
      DocumentStatus.archivado,
    ];

    if (!FINAL_STATES.includes(dto.finalStatus)) {
      throw new BadRequestException('Estado final inválido.');
    }

    return this.prisma.$transaction(async (tx) => {
      const finalDoc = await tx.document.update({
        where: { id },
        data: {
          currentStatus: dto.finalStatus, // Se cierra el trámite
          // OJO: currentOfficeId se mantiene igual, se queda en archivo de la última oficina
        },
      });

      await tx.documentHistory.create({
        data: {
          statusAtMoment: dto.finalStatus,
          observation: dto.observation, // Ej: "Respondido con Carta N° 050"
          documentId: id,
          fromOfficeId: office.id,
          toOfficeId: office.id, // Se queda aquí
          userId: user.userId,
        },
      });

      return finalDoc;
    });
  }

  async trackByCode(code: string): Promise<TrackingResponseDto> {
    const doc = await this.prisma.document.findUnique({
      where: { trackingCode: code },
      include: {
        currentOffice: true,
        history: {
          orderBy: { timestamp: 'desc' },
          include: { toOffice: true }, // Solo nos importa A DÓNDE llegó
        },
      },
    });

    if (!doc)
      throw new NotFoundException(
        'No se encontró ningún trámite con ese código.',
      );

    // Mapeo manual para proteger datos (Sanitización)
    return {
      trackingCode: doc.trackingCode,
      subject: doc.subject,
      currentStatus: doc.currentStatus,
      currentOffice: doc.currentOffice?.name || 'Finalizado',
      lastUpdate: doc.updatedAt,
      history: doc.history.map((h) => ({
        date: h.timestamp,
        status: h.statusAtMoment,
        officeName: h.toOffice.name,
        observation: h.observation || 'Sin observaciones',
      })),
    };
  }

  // 2. HISTORIAL COMPLETO (Para el Funcionario - Vista Interna)
  async getFullHistory(id: string) {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        currentOffice: true,
        attachments: true, // Ver archivos adjuntos
        history: {
          orderBy: { timestamp: 'desc' },
          include: {
            fromOffice: true,
            toOffice: true,
            user: { select: { name: true, lastName: true, username: true } }, // Ver QUIÉN lo movió
          },
        },
      },
    });

    if (!doc) throw new NotFoundException('Documento no encontrado');
    return doc;
  }

  // 3. DASHBOARD / ESTADÍSTICAS (Para Gerencia/Admin)
  async getDashboardStats() {
    // A. Conteo por Estado
    const byStatus = await this.prisma.document.groupBy({
      by: ['currentStatus'],
      _count: { id: true },
    });

    // B. Los 5 documentos más antiguos pendientes (Cuellos de botella)
    const bottlenecks = await this.prisma.document.findMany({
      where: {
        currentStatus: { in: ['derivado', 'recibido', 'en_revision'] },
      },
      orderBy: { createdAt: 'asc' }, // Los más viejos primero
      take: 5,
      include: { currentOffice: true },
    });

    // C. Carga por Oficina (Quién tiene más papeles)
    const byOffice = await this.prisma.document.groupBy({
      by: ['currentOfficeId'],
      _count: { id: true },
      where: {
        currentStatus: { notIn: ['archivado', 'atendido', 'rechazado'] },
      },
    });

    // Enriquecer IDs de oficinas con Nombres (Prisma groupBy no hace join directo fácil)
    const officeStats = await Promise.all(
      byOffice.map(async (item) => {
        const office = await this.prisma.office.findUnique({
          where: { id: item.currentOfficeId },
        });
        return { office: office?.name, count: item._count.id };
      }),
    );

    return {
      stats: byStatus.map((s) => ({
        status: s.currentStatus,
        count: s._count.id,
      })),
      urgentDocs: bottlenecks.map((b) => ({
        code: b.trackingCode,
        daysOpen: Math.floor(
          (Date.now() - b.createdAt.getTime()) / (1000 * 3600 * 24),
        ), // Días transcurridos
        office: b.currentOffice?.name,
      })),
      officeLoad: officeStats,
    };
  }
}

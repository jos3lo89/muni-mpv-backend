import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { AuthAndRoleGuard } from '../auth/decorators/auth.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { Role } from 'src/common/enums/role.enum';
import { ActiveUser } from 'src/common/decorators/activeUser.decorator';
import type { UserActiveI } from 'src/common/interfaces/userActive.interface';
import { CreateDocumentDto } from './dto/create-document.dto';
import { FileRequiredPipe } from 'src/common/pipes/file-required.pipe';
import { RejectDocumentDto } from './dto/update-document-status.dto';
import { DeriveDocumentDto } from './dto/derive-document.dto';
import { AttendDocumentDto } from './dto/attend-document.dto';
import { TrackingResponseDto } from './dto/tracking-response.dto';

@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('internal/register')
  @AuthAndRoleGuard(Role.MESA_DE_PARTES)
  @UseInterceptors(FileInterceptor('file'))
  registerInternal(
    @Body() body: CreateDocumentDto,
    @UploadedFile(FileRequiredPipe) file: Express.Multer.File,
    @ActiveUser() user: UserActiveI,
  ) {
    return this.documentsService.createInternal(body, file, user);
  }

  @Post('public/register')
  @UseInterceptors(FileInterceptor('file'))
  async registerPublic(
    @Body() createDocumentDto: CreateDocumentDto,
    @UploadedFile(FileRequiredPipe) file: Express.Multer.File,
  ) {
    return this.documentsService.createExternal(createDocumentDto, file);
  }

  @Get('pending')
  @AuthAndRoleGuard(Role.MESA_DE_PARTES, Role.SUPER_ADMIN)
  async getPendingDocuments() {
    return this.documentsService.findAllPending();
  }

  @Patch(':id/approve')
  @AuthAndRoleGuard(Role.MESA_DE_PARTES)
  async approveDocument(
    @Param('id') id: string,
    @ActiveUser() user: UserActiveI,
  ) {
    return this.documentsService.approveDocument(id, user);
  }

  @Patch(':id/reject')
  @AuthAndRoleGuard(Role.MESA_DE_PARTES)
  async rejectDocument(
    @Param('id') id: string,
    @Body() rejectDto: RejectDocumentDto,
    @ActiveUser() user: UserActiveI,
  ) {
    return this.documentsService.rejectDocument(id, rejectDto, user);
  }

  @Get('inbox')
  @AuthAndRoleGuard(
    Role.MESA_DE_PARTES,
    Role.STAFF_OFICINA,
    Role.JEFE_OFICINA,
    Role.GERENTE,
  )
  async getInbox(@ActiveUser() user: UserActiveI) {
    return this.documentsService.getInbox(user);
  }

  @Patch(':id/derive')
  @AuthAndRoleGuard(
    Role.MESA_DE_PARTES,
    Role.STAFF_OFICINA,
    Role.JEFE_OFICINA,
    Role.GERENTE,
  )
  async deriveDocument(
    @Param('id') id: string,
    @Body() deriveDto: DeriveDocumentDto,
    @ActiveUser() user: UserActiveI,
  ) {
    return this.documentsService.deriveDocument(id, deriveDto, user);
  }

  @Patch(':id/attend')
  @AuthAndRoleGuard(Role.STAFF_OFICINA, Role.JEFE_OFICINA, Role.GERENTE)
  async attendDocument(
    @Param('id') id: string,
    @Body() attendDto: AttendDocumentDto,
    @ActiveUser() user: UserActiveI,
  ) {
    return this.documentsService.attendDocument(id, attendDto, user);
  }

  @Get('track/:code')
  async trackDocument(
    @Param('code') code: string,
  ): Promise<TrackingResponseDto> {
    return this.documentsService.trackByCode(code);
  }

  // B. HISTORIAL INTERNO (Solo Personal)
  @Get(':id/history')
  @AuthAndRoleGuard(
    Role.MESA_DE_PARTES,
    Role.STAFF_OFICINA,
    Role.JEFE_OFICINA,
    Role.GERENTE,
    Role.SUPER_ADMIN,
  )
  async getDocumentHistory(@Param('id') id: string) {
    return this.documentsService.getFullHistory(id);
  }

  // C. DASHBOARD (Solo Jefes y Admins)
  @Get('stats/dashboard')
  @AuthAndRoleGuard(Role.JEFE_OFICINA, Role.GERENTE, Role.SUPER_ADMIN)
  async getDashboard() {
    return this.documentsService.getDashboardStats();
  }
}

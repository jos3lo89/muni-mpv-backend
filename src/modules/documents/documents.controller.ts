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
}

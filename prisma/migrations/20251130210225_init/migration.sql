-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MESA_DE_PARTES', 'STAFF_OFICINA', 'JEFE_OFICINA', 'GERENTE', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('creado', 'recibido', 'derivado', 'en_revision', 'observado', 'atendido', 'archivado', 'rechazado');

-- CreateEnum
CREATE TYPE "ApplicantType" AS ENUM ('natural', 'juridica');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CARTA', 'DIRECTIVA', 'EXPOSICI', 'N_DE_MOTIVOS', 'INFORME', 'MEMORANDO', 'MEMORANDO_MULTIPLE', 'NOTA_DE_ELEVACI', 'OFICIO', 'OFICIO_CIRCULAR', 'OFICIO_MULTIPLE', 'AYUDA_MEMORIA', 'OTROS', 'PROVEIDO', 'N_VICEMINISTERIAL', 'RESUMEN_EJECUTIVO', 'SOBRE_CERRADO', 'SOLICITUD');

-- CreateEnum
CREATE TYPE "OfficeType" AS ENUM ('ALCALDIA', 'GERENCIA_MUNICIPAL', 'ORGANO_STAFF', 'GERENCIA_LINEA', 'OFICINA_GENERAL', 'UNIDAD', 'COMITE_CONSULTIVO');

-- CreateTable
CREATE TABLE "Office" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "acronym" TEXT,
    "type" "OfficeType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parentOfficeId" TEXT,

    CONSTRAINT "Office_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "dni" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "officeId" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "trackingCode" TEXT NOT NULL,
    "futCode" TEXT,
    "applicantType" "ApplicantType" NOT NULL,
    "applicantIdentifier" TEXT NOT NULL,
    "applicantName" TEXT NOT NULL,
    "applicantLastname" TEXT NOT NULL,
    "applicantEmail" TEXT NOT NULL,
    "applicantPhone" TEXT,
    "applicantAddress" TEXT,
    "documentType" "DocumentType" NOT NULL,
    "subject" TEXT NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "currentStatus" "DocumentStatus" NOT NULL DEFAULT 'creado',
    "currentOfficeId" TEXT NOT NULL,
    "ownerOfficeId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentAttachment" (
    "id" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentId" TEXT NOT NULL,

    CONSTRAINT "DocumentAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentHistory" (
    "id" TEXT NOT NULL,
    "statusAtMoment" "DocumentStatus" NOT NULL,
    "observation" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "documentId" TEXT NOT NULL,
    "fromOfficeId" TEXT,
    "toOfficeId" TEXT NOT NULL,
    "userId" TEXT,

    CONSTRAINT "DocumentHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Office_name_key" ON "Office"("name");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_dni_key" ON "User"("dni");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Document_trackingCode_key" ON "Document"("trackingCode");

-- CreateIndex
CREATE UNIQUE INDEX "Document_futCode_key" ON "Document"("futCode");

-- CreateIndex
CREATE INDEX "Document_trackingCode_idx" ON "Document"("trackingCode");

-- CreateIndex
CREATE INDEX "Document_futCode_idx" ON "Document"("futCode");

-- CreateIndex
CREATE INDEX "Document_currentOfficeId_idx" ON "Document"("currentOfficeId");

-- CreateIndex
CREATE INDEX "Document_ownerOfficeId_idx" ON "Document"("ownerOfficeId");

-- CreateIndex
CREATE INDEX "DocumentHistory_documentId_idx" ON "DocumentHistory"("documentId");

-- AddForeignKey
ALTER TABLE "Office" ADD CONSTRAINT "Office_parentOfficeId_fkey" FOREIGN KEY ("parentOfficeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_officeId_fkey" FOREIGN KEY ("officeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_currentOfficeId_fkey" FOREIGN KEY ("currentOfficeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_ownerOfficeId_fkey" FOREIGN KEY ("ownerOfficeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentAttachment" ADD CONSTRAINT "DocumentAttachment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_fromOfficeId_fkey" FOREIGN KEY ("fromOfficeId") REFERENCES "Office"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_toOfficeId_fkey" FOREIGN KEY ("toOfficeId") REFERENCES "Office"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentHistory" ADD CONSTRAINT "DocumentHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

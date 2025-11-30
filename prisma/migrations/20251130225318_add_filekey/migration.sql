/*
  Warnings:

  - Added the required column `fileKey` to the `DocumentAttachment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "DocumentAttachment" ADD COLUMN     "fileKey" TEXT NOT NULL;

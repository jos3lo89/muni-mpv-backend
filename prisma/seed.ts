import { PrismaPg } from '@prisma/adapter-pg';
import {
  OfficeType,
  PrismaClient,
  UserRole,
} from 'src/generated/prisma/client';
import { config } from 'dotenv';
import * as bcrypt from 'bcrypt';

config();

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Iniciando sembrado de datos (Seeding)...');

  // 1. Limpieza de seguridad (Opcional: comenta si no quieres borrar data previa)
  // await prisma.documentHistory.deleteMany();
  // await prisma.documentAttachment.deleteMany();
  // await prisma.document.deleteMany();
  // await prisma.user.deleteMany();
  // await prisma.office.deleteMany();

  // Password genérico para todos: "123456"
  const passwordHash = await bcrypt.hash('123456', 10);

  // ===========================================================================
  // NIVEL 1: ALTA DIRECCIÓN (Padres Supremos)
  // ===========================================================================

  const alcaldia = await prisma.office.upsert({
    where: { name: 'ALCALDÍA' },
    update: {},
    create: {
      name: 'ALCALDÍA',
      acronym: 'ALC',
      type: OfficeType.ALCALDIA,
    },
  });

  const gerenciaMunicipal = await prisma.office.upsert({
    where: { name: 'GERENCIA MUNICIPAL' },
    update: { parentOfficeId: alcaldia.id },
    create: {
      name: 'GERENCIA MUNICIPAL',
      acronym: 'GM',
      type: OfficeType.GERENCIA_MUNICIPAL,
      parentOfficeId: alcaldia.id,
    },
  });

  // ===========================================================================
  // NIVEL 2: ÓRGANOS DE ASESORAMIENTO Y APOYO (Dependen de GM o Alcaldía)
  // ===========================================================================

  // --- Órganos de Control y Defensa ---
  await prisma.office.upsert({
    where: { name: 'ÓRGANO DE CONTROL INSTITUCIONAL' },
    update: { parentOfficeId: alcaldia.id },
    create: {
      name: 'ÓRGANO DE CONTROL INSTITUCIONAL',
      acronym: 'OCI',
      type: OfficeType.ORGANO_STAFF,
      parentOfficeId: alcaldia.id,
    },
  });

  await prisma.office.upsert({
    where: { name: 'PROCURADURÍA PÚBLICA MUNICIPAL' },
    update: { parentOfficeId: alcaldia.id },
    create: {
      name: 'PROCURADURÍA PÚBLICA MUNICIPAL',
      acronym: 'PPM',
      type: OfficeType.ORGANO_STAFF,
      parentOfficeId: alcaldia.id,
    },
  });

  // --- Secretarías y Oficinas Generales ---
  const secretariaGeneral = await prisma.office.upsert({
    where: { name: 'SECRETARÍA GENERAL' },
    update: { parentOfficeId: alcaldia.id },
    create: {
      name: 'SECRETARÍA GENERAL',
      acronym: 'SG',
      type: OfficeType.OFICINA_GENERAL,
      parentOfficeId: alcaldia.id,
    },
  });

  const ofAsesoriaJuridica = await prisma.office.upsert({
    where: { name: 'OFICINA GENERAL DE ASESORÍA JURÍDICA' },
    update: { parentOfficeId: gerenciaMunicipal.id },
    create: {
      name: 'OFICINA GENERAL DE ASESORÍA JURÍDICA',
      acronym: 'OGAJ',
      type: OfficeType.OFICINA_GENERAL,
      parentOfficeId: gerenciaMunicipal.id,
    },
  });

  const ofPlaneamiento = await prisma.office.upsert({
    where: { name: 'OFICINA GENERAL DE PLANEAMIENTO Y PRESUPUESTO' },
    update: { parentOfficeId: gerenciaMunicipal.id },
    create: {
      name: 'OFICINA GENERAL DE PLANEAMIENTO Y PRESUPUESTO',
      acronym: 'OGPP',
      type: OfficeType.OFICINA_GENERAL,
      parentOfficeId: gerenciaMunicipal.id,
    },
  });

  const ofAdministracion = await prisma.office.upsert({
    where: { name: 'OFICINA GENERAL DE ADMINISTRACIÓN' },
    update: { parentOfficeId: gerenciaMunicipal.id },
    create: {
      name: 'OFICINA GENERAL DE ADMINISTRACIÓN',
      acronym: 'OGA',
      type: OfficeType.OFICINA_GENERAL,
      parentOfficeId: gerenciaMunicipal.id,
    },
  });

  // ===========================================================================
  // NIVEL 3: UNIDADES Y SUBGERENCIAS (Hijos de Nivel 2)
  // ===========================================================================

  // --- Hijos de Secretaría General ---
  // IMPORTANTE: Aquí creamos "MESA DE PARTES" (Unidad de Trámite Documentario)
  const mesaPartes = await prisma.office.upsert({
    where: { name: 'MESA_DE_PARTES' }, // Nombre técnico para el código
    update: { parentOfficeId: secretariaGeneral.id },
    create: {
      name: 'MESA_DE_PARTES', // Usamos este nombre clave para que tu backend lo encuentre
      acronym: 'MP',
      type: OfficeType.UNIDAD,
      parentOfficeId: secretariaGeneral.id,
    },
  });

  // Nota: También creamos la unidad "humana" por si acaso se refieren a ella así
  await prisma.office.upsert({
    where: { name: 'UNIDAD DE TRÁMITE DOCUMENTARIO' },
    update: { parentOfficeId: secretariaGeneral.id },
    create: {
      name: 'UNIDAD DE TRÁMITE DOCUMENTARIO',
      acronym: 'UTD',
      type: OfficeType.UNIDAD,
      parentOfficeId: secretariaGeneral.id,
    },
  });

  await prisma.office.upsert({
    where: { name: 'UNIDAD DE REGISTRO CIVIL' },
    update: { parentOfficeId: secretariaGeneral.id },
    create: {
      name: 'UNIDAD DE REGISTRO CIVIL',
      acronym: 'URC',
      type: OfficeType.UNIDAD,
      parentOfficeId: secretariaGeneral.id,
    },
  });

  // --- Hijos de Administración (OGA) ---
  await prisma.office.upsert({
    where: { name: 'UNIDAD DE LOGÍSTICA' },
    update: { parentOfficeId: ofAdministracion.id },
    create: {
      name: 'UNIDAD DE LOGÍSTICA',
      acronym: 'LOG',
      type: OfficeType.UNIDAD,
      parentOfficeId: ofAdministracion.id,
    },
  });

  await prisma.office.upsert({
    where: { name: 'UNIDAD DE RECURSOS HUMANOS' },
    update: { parentOfficeId: ofAdministracion.id },
    create: {
      name: 'UNIDAD DE RECURSOS HUMANOS',
      acronym: 'RRHH',
      type: OfficeType.UNIDAD,
      parentOfficeId: ofAdministracion.id,
    },
  });

  const utics = await prisma.office.upsert({
    where: { name: 'UNIDAD DE TECNOLOGÍAS DE INFORMACIÓN Y COMUNICACIONES' },
    update: { parentOfficeId: ofAdministracion.id },
    create: {
      name: 'UNIDAD DE TECNOLOGÍAS DE INFORMACIÓN Y COMUNICACIONES',
      acronym: 'UTICS',
      type: OfficeType.UNIDAD,
      parentOfficeId: ofAdministracion.id,
    },
  });

  // ===========================================================================
  // NIVEL 2.5: GERENCIAS DE LÍNEA (Grandes Gerencias Operativas)
  // ===========================================================================

  const gDesarrolloUrbano = await prisma.office.upsert({
    where: { name: 'GERENCIA DE DESARROLLO URBANO Y RURAL' },
    update: { parentOfficeId: gerenciaMunicipal.id },
    create: {
      name: 'GERENCIA DE DESARROLLO URBANO Y RURAL',
      acronym: 'GDUR',
      type: OfficeType.GERENCIA_LINEA,
      parentOfficeId: gerenciaMunicipal.id,
    },
  });

  const gDesarrolloSocial = await prisma.office.upsert({
    where: { name: 'GERENCIA DE DESARROLLO SOCIAL' },
    update: { parentOfficeId: gerenciaMunicipal.id },
    create: {
      name: 'GERENCIA DE DESARROLLO SOCIAL',
      acronym: 'GDS',
      type: OfficeType.GERENCIA_LINEA,
      parentOfficeId: gerenciaMunicipal.id,
    },
  });

  const gServiciosPublicos = await prisma.office.upsert({
    where: { name: 'GERENCIA DE SERVICIOS PÚBLICOS MUNICIPALES' },
    update: { parentOfficeId: gerenciaMunicipal.id },
    create: {
      name: 'GERENCIA DE SERVICIOS PÚBLICOS MUNICIPALES',
      acronym: 'GSPM',
      type: OfficeType.GERENCIA_LINEA,
      parentOfficeId: gerenciaMunicipal.id,
    },
  });

  const gDesarrolloEconomico = await prisma.office.upsert({
    where: { name: 'GERENCIA DE DESARROLLO ECONÓMICO' },
    update: { parentOfficeId: gerenciaMunicipal.id },
    create: {
      name: 'GERENCIA DE DESARROLLO ECONÓMICO',
      acronym: 'GDE',
      type: OfficeType.GERENCIA_LINEA,
      parentOfficeId: gerenciaMunicipal.id,
    },
  });

  // ===========================================================================
  // USUARIOS (PERSONAS REALES CON ROLES)
  // ===========================================================================

  console.log('👤 Creando usuarios...');

  // 1. EL SUPER ADMIN (Tú)
  await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      email: 'admin@sanjeronimo.gob.pe',
      dni: '00000000',
      name: 'Super',
      lastName: 'Administrador',
      username: 'admin',
      passwordHash: passwordHash,
      role: UserRole.SUPER_ADMIN,
      officeId: utics.id, // El de sistemas suele estar en UTICS
    },
  });

  // 2. MESA DE PARTES (La Secretaria Principal)
  await prisma.user.upsert({
    where: { username: 'mp_recepcion' },
    update: { officeId: mesaPartes.id },
    create: {
      email: 'mesadepartes@sanjeronimo.gob.pe',
      dni: '11111111',
      name: 'María',
      lastName: 'Recepción',
      username: 'mp_recepcion',
      passwordHash: passwordHash,
      role: UserRole.MESA_DE_PARTES,
      officeId: mesaPartes.id,
    },
  });

  // 3. GERENTE MUNICIPAL
  await prisma.user.upsert({
    where: { username: 'gerente_municipal' },
    update: { officeId: gerenciaMunicipal.id },
    create: {
      email: 'gerencia@sanjeronimo.gob.pe',
      dni: '22222222',
      name: 'Carlos',
      lastName: 'Gerente',
      username: 'gerente_municipal',
      passwordHash: passwordHash,
      role: UserRole.GERENTE,
      officeId: gerenciaMunicipal.id,
    },
  });

  // 4. ALCALDE
  await prisma.user.upsert({
    where: { username: 'alcalde' },
    update: { officeId: alcaldia.id },
    create: {
      email: 'alcaldia@sanjeronimo.gob.pe',
      dni: '33333333',
      name: 'Sr. Alcalde',
      lastName: 'San Jerónimo',
      username: 'alcalde',
      passwordHash: passwordHash,
      role: UserRole.GERENTE, // Rol alto
      officeId: alcaldia.id,
    },
  });

  // 5. JEFE DE UTICS
  await prisma.user.upsert({
    where: { username: 'jefe_utics' },
    update: { officeId: utics.id },
    create: {
      email: 'utics@sanjeronimo.gob.pe',
      dni: '44444444',
      name: 'Ingeniero',
      lastName: 'Sistemas',
      username: 'jefe_utics',
      passwordHash: passwordHash,
      role: UserRole.JEFE_OFICINA,
      officeId: utics.id,
    },
  });

  // 6. GERENTE DE DESARROLLO URBANO (Para pruebas de derivación)
  await prisma.user.upsert({
    where: { username: 'gerente_obras' },
    update: { officeId: gDesarrolloUrbano.id },
    create: {
      email: 'gdur@sanjeronimo.gob.pe',
      dni: '55555555',
      name: 'Arquitecto',
      lastName: 'Obras',
      username: 'gerente_obras',
      passwordHash: passwordHash,
      role: UserRole.GERENTE, // Es gerente de línea
      officeId: gDesarrolloUrbano.id,
    },
  });

  // 7. ASISTENTE EN DESARROLLO URBANO (Staff normal)
  await prisma.user.upsert({
    where: { username: 'asistente_obras' },
    update: { officeId: gDesarrolloUrbano.id },
    create: {
      email: 'asistente_gdur@sanjeronimo.gob.pe',
      dni: '66666666',
      name: 'Juan',
      lastName: 'Asistente',
      username: 'asistente_obras',
      passwordHash: passwordHash,
      role: UserRole.STAFF_OFICINA,
      officeId: gDesarrolloUrbano.id,
    },
  });

  console.log(
    '✅ Base de datos sembrada correctamente con el Organigrama Municipal.',
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

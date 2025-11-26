import { applyDecorators, UseGuards } from '@nestjs/common';
import { Role } from 'src/common/enums/role.enum';
import { AuthGuard } from 'src/common/guards/auth.guard';
import { RolesGuard } from 'src/common/guards/role.guard';
import { Roles } from './role.decorator';

export function AuthAndRoleGuard(...roles: Role[]) {
  return applyDecorators(Roles(...roles), UseGuards(AuthGuard, RolesGuard));
}

// export function AuthGuardOnly() {
//   return applyDecorators(UseGuards(AuthGuard));
// }

// export function RolesGuardOnly(...roles: Role[]) {
//   return applyDecorators(Roles(...roles), UseGuards(RolesGuard));
// }

// import { applyDecorators, UseGuards } from '@nestjs/common';
// import { AuthGuard } from 'src/common/guards/auth.guard';

// export function Auth() {
//   return applyDecorators(UseGuards(AuthGuard));
// }

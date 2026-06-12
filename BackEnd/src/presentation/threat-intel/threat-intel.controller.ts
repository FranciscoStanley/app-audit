import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CheckAssetThreatUseCase } from '../../application/use-cases/check-asset-threat.use-case';
import { SyncThreatIntelligenceUseCase } from '../../application/use-cases/sync-threat-intelligence.use-case';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { ThreatIntelligenceStore } from '../../infrastructure/threat-intel/threat-intelligence.store';
import { Permissions } from '../auth/decorators/permissions.decorator';
import {
  CheckAssetQueryDto,
  CompromisedPackageDto,
  SyncThreatIntelResponseDto,
  ThreatIntelStatusDto,
} from './dto/threat-intel.dto';
import { ListPackagesQueryDto } from './dto/list-packages-query.dto';
import type { PaginatedResult } from '../../domain/pagination/pagination';

@ApiTags('Threat Intelligence')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('threat-intel')
export class ThreatIntelController {
  constructor(
    private readonly store: ThreatIntelligenceStore,
    private readonly syncThreatIntel: SyncThreatIntelligenceUseCase,
    private readonly checkAsset: CheckAssetThreatUseCase,
  ) {}

  @Get('status')
  @Permissions('threat-intel:read')
  @ApiOperation({ summary: 'Status da inteligência de ameaças' })
  @ApiResponse({ status: 200, type: ThreatIntelStatusDto })
  getStatus(): ThreatIntelStatusDto {
    return this.store.getStatus();
  }

  @Post('sync')
  @Permissions('threat-intel:sync')
  @ApiOperation({ summary: 'Sincronizar threat intelligence' })
  @ApiResponse({ status: 200, type: SyncThreatIntelResponseDto })
  async sync(): Promise<SyncThreatIntelResponseDto> {
    return this.syncThreatIntel.execute();
  }

  @Get('packages')
  @Permissions('threat-intel:read')
  @ApiOperation({ summary: 'Listar pacotes comprometidos (paginado)' })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de pacotes',
  })
  listPackages(
    @Query() query: ListPackagesQueryDto,
  ): PaginatedResult<CompromisedPackageDto> {
    const { page, pageSize } = query.toParams();
    return this.store.getPackagesPaginated(page, pageSize, query.ecosystem);
  }

  @Get('check')
  @Permissions('threat-intel:read')
  @ApiOperation({ summary: 'Verificar ativo contra bases de threat intel' })
  async check(@Query() query: CheckAssetQueryDto) {
    return this.checkAsset.execute(query);
  }
}

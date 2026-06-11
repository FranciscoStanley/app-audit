import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
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
  @ApiOperation({ summary: 'Listar pacotes comprometidos' })
  @ApiQuery({ name: 'ecosystem', required: false })
  @ApiResponse({ status: 200, type: [CompromisedPackageDto] })
  listPackages(
    @Query('ecosystem') ecosystem?: string,
  ): CompromisedPackageDto[] {
    const packages = this.store.getPackages();
    if (!ecosystem) return packages;
    return packages.filter((p) => p.ecosystem === ecosystem);
  }

  @Get('check')
  @Permissions('threat-intel:read')
  @ApiOperation({ summary: 'Verificar ativo contra bases de threat intel' })
  async check(@Query() query: CheckAssetQueryDto) {
    return this.checkAsset.execute(query);
  }
}

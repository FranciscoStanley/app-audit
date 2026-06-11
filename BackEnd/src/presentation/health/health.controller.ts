import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { HealthService } from '../../application/services/health.service';

@ApiTags('Health')
@Controller('health')
@SkipThrottle()
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness — serviço respondendo' })
  @ApiResponse({ status: 200 })
  liveness() {
    return { status: 'ok', service: 'app-audit' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness — dependências e storage' })
  @ApiResponse({ status: 200 })
  readiness() {
    return this.health.check();
  }
}

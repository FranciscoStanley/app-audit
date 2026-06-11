import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  @Get()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, schema: { example: { status: 'ok', service: 'app-audit' } } })
  check() {
    return { status: 'ok', service: 'app-audit' };
  }
}

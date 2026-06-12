import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Query,
  Req,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RunMiasmaAuditUseCase } from '../../application/use-cases/run-miasma-audit.use-case';
import { BackgroundJobUseCase } from '../../application/use-cases/background-job.use-case';
import { RemediationUseCase } from '../../application/use-cases/remediation.use-case';
import { RemediationConsentUseCase } from '../../application/use-cases/remediation-consent.use-case';
import { RemediationConsentAcceptDto } from '../auth/dto/auth.dto';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { PdfReportGenerator } from '../../infrastructure/report/pdf-report.generator';
import { VulnerabilityReportGenerator } from '../../infrastructure/report/vulnerability-report.generator';
import { AuditReportStore } from '../../infrastructure/storage/audit-report.store';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AuditRunResponseDto } from './dto/audit-report-response.dto';
import { BackgroundJob } from '../../domain/entities/background-job.entity';
import {
  BackgroundJobResponseDto,
  CreateBackgroundJobResponseDto,
  CreateRemediationAllJobDto,
  CreateRemediationJobDto,
  ListJobsQueryDto,
} from './dto/background-job.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import {
  AuditReportSummaryDto,
  ListFindingsQueryDto,
} from './dto/audit-list.dto';
import type { PaginatedResult } from '../../domain/pagination/pagination';

@ApiTags('Security Audit')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditUseCase: RunMiasmaAuditUseCase,
    private readonly backgroundJobs: BackgroundJobUseCase,
    private readonly auditStore: AuditReportStore,
    private readonly pdfGenerator: PdfReportGenerator,
    private readonly vulnerabilityReportGenerator: VulnerabilityReportGenerator,
    private readonly remediation: RemediationUseCase,
    private readonly remediationConsent: RemediationConsentUseCase,
  ) {}

  @Post('jobs/audit-run')
  @HttpCode(HttpStatus.ACCEPTED)
  @Permissions('audit:run')
  @ApiOperation({
    summary: 'Enfileirar varredura de segurança (execução assíncrona)',
  })
  @ApiResponse({ status: 202, type: CreateBackgroundJobResponseDto })
  async enqueueAuditRun(
    @CurrentUser() user: { id: string },
  ): Promise<CreateBackgroundJobResponseDto> {
    const job = await this.backgroundJobs.createAuditJob(user.id);
    return { jobId: job.id, status: job.status };
  }

  @Post('jobs/remediation')
  @HttpCode(HttpStatus.ACCEPTED)
  @Permissions('remediation:apply')
  @ApiOperation({
    summary: 'Enfileirar remediação de uma vulnerabilidade (assíncrona)',
  })
  @ApiResponse({ status: 202, type: CreateBackgroundJobResponseDto })
  async enqueueRemediation(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRemediationJobDto,
  ): Promise<CreateBackgroundJobResponseDto> {
    const job = await this.backgroundJobs.createRemediationJob(
      user.id,
      dto.findingId,
    );
    return { jobId: job.id, status: job.status };
  }

  @Post('jobs/remediation-all')
  @HttpCode(HttpStatus.ACCEPTED)
  @Permissions('remediation:apply')
  @ApiOperation({
    summary: 'Enfileirar remediação em lote (assíncrona)',
  })
  @ApiResponse({ status: 202, type: CreateBackgroundJobResponseDto })
  async enqueueRemediationAll(
    @CurrentUser() user: { id: string },
    @Body() dto: CreateRemediationAllJobDto,
  ): Promise<CreateBackgroundJobResponseDto> {
    const job = await this.backgroundJobs.createRemediationAllJob(
      user.id,
      dto.auditId,
    );
    return { jobId: job.id, status: job.status };
  }

  @Get('jobs')
  @Permissions('audit:read')
  @ApiOperation({
    summary: 'Listar jobs assíncronos do usuário autenticado (paginado)',
  })
  @ApiResponse({
    status: 200,
    description: 'Lista paginada de jobs',
    schema: {
      properties: {
        data: {
          type: 'array',
          items: { $ref: '#/components/schemas/BackgroundJobResponseDto' },
        },
        meta: { $ref: '#/components/schemas/PaginationMetaDto' },
      },
    },
  })
  async listJobs(
    @CurrentUser() user: { id: string },
    @Query() query: ListJobsQueryDto,
  ): Promise<PaginatedResult<BackgroundJobResponseDto>> {
    const { page, pageSize } = query.toParams();
    const result = await this.backgroundJobs.listJobs(
      user.id,
      page,
      pageSize,
      query.status,
    );
    return {
      data: result.data.map((job) => this.toJobDto(job)),
      meta: result.meta,
    };
  }

  @Get('jobs/:id')
  @Permissions('audit:read')
  @ApiOperation({ summary: 'Status de um job assíncrono (polling)' })
  @ApiResponse({ status: 200, type: BackgroundJobResponseDto })
  async getJob(
    @CurrentUser() user: { id: string },
    @Param('id') id: string,
  ): Promise<BackgroundJobResponseDto> {
    const job = await this.backgroundJobs.getJob(user.id, id);
    return this.toJobDto(job);
  }

  @Post('run')
  @Permissions('audit:run')
  @ApiOperation({ summary: 'Executar auditoria completa de segurança' })
  @ApiQuery({ name: 'save', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: AuditRunResponseDto })
  async runAudit(
    @CurrentUser() user: { id: string },
    @Query('save') save?: string,
  ): Promise<AuditRunResponseDto> {
    const shouldSave = save === 'true' || save === '1';
    const result = await this.auditUseCase.execute({
      userId: user.id,
      saveReportPath: shouldSave
        ? 'docs/security/miasma-worm-audit-report.md'
        : undefined,
    });
    return {
      report: result.report,
      savedTo: result.savedTo,
      auditId: result.auditId,
    };
  }

  @Post('miasma')
  @Permissions('audit:run')
  @ApiOperation({ summary: 'Alias — executar auditoria Miasma/completa' })
  async executeMiasmaAudit(
    @CurrentUser() user: { id: string },
    @Query('save') save?: string,
  ) {
    return this.runAudit(user, save);
  }

  @Get('reports')
  @Permissions('audit:read')
  @ApiOperation({ summary: 'Listar relatórios de auditoria (resumo paginado)' })
  @ApiResponse({
    status: 200,
    description:
      'Lista paginada de resumos — sem payload completo do relatório',
  })
  async listReports(
    @Query() query: PaginationQueryDto,
  ): Promise<PaginatedResult<AuditReportSummaryDto>> {
    const { page, pageSize } = query.toParams();
    return this.auditStore.listSummariesPaginated(page, pageSize);
  }

  @Get('reports/:id')
  @Permissions('audit:read')
  @ApiOperation({ summary: 'Obter relatório por ID' })
  async getReport(@Param('id') id: string) {
    const report = await this.auditStore.getById(id);
    if (!report) throw new NotFoundException('Relatório não encontrado');
    return report;
  }

  @Get('reports/:id/markdown')
  @Permissions('audit:download')
  @ApiOperation({ summary: 'Download do relatório em Markdown' })
  async downloadMarkdown(
    @Param('id') id: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const markdown = await this.auditStore.getMarkdown(id);
    if (!markdown) throw new NotFoundException('Relatório não encontrado');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="audit-${id}.md"`,
    );
    return markdown;
  }

  @Get('reports/:id/pdf')
  @Permissions('audit:download')
  @ApiOperation({ summary: 'Download do relatório em PDF' })
  async downloadPdf(@Param('id') id: string): Promise<StreamableFile> {
    const stored = await this.auditStore.getById(id);
    if (!stored) throw new NotFoundException('Relatório não encontrado');

    const pdfPath = join(process.cwd(), 'data', 'audits', id, 'report.pdf');
    try {
      await access(pdfPath);
    } catch {
      const markdown = await this.auditStore.getMarkdown(id);
      if (!markdown) throw new NotFoundException('Markdown não encontrado');
      await this.pdfGenerator.generateFromMarkdown(markdown, pdfPath);
      await this.auditStore.setPdfPath(id, pdfPath);
    }

    const buffer = await readFile(pdfPath);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="audit-${id}.pdf"`,
    });
  }

  @Get('reports/:id/findings')
  @Permissions('audit:read')
  @ApiOperation({
    summary: 'Listar vulnerabilidades de um relatório (paginado)',
  })
  async listFindings(
    @Param('id') id: string,
    @Query() query: ListFindingsQueryDto,
  ) {
    const stored = await this.auditStore.getById(id);
    if (!stored) throw new NotFoundException('Relatório não encontrado');

    const { page, pageSize } = query.toParams();
    return this.auditStore.listFindingsPaginated(id, page, pageSize, {
      category: query.category,
      severity: query.severity,
      remediationAvailable: query.remediationAvailable,
    });
  }

  @Get('reports/:id/findings/:findingId/markdown')
  @Permissions('audit:download')
  @ApiOperation({ summary: 'Download do relatório individual em Markdown' })
  async downloadFindingMarkdown(
    @Param('id') id: string,
    @Param('findingId') findingId: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const markdown = await this.resolveFindingMarkdown(id, findingId);
    const slug = this.findingFilenameSlug(id, findingId);
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.md"`);
    return markdown;
  }

  @Get('reports/:id/findings/:findingId/pdf')
  @Permissions('audit:download')
  @ApiOperation({ summary: 'Download do relatório individual em PDF' })
  async downloadFindingPdf(
    @Param('id') id: string,
    @Param('findingId') findingId: string,
  ): Promise<StreamableFile> {
    const markdown = await this.resolveFindingMarkdown(id, findingId);
    const pdfPath = this.auditStore.findingReportPath(id, findingId, 'pdf');

    try {
      await access(pdfPath);
    } catch {
      await this.pdfGenerator.generateFromMarkdown(markdown, pdfPath);
    }

    const buffer = await readFile(pdfPath);
    const slug = this.findingFilenameSlug(id, findingId);
    return new StreamableFile(buffer, {
      type: 'application/pdf',
      disposition: `attachment; filename="${slug}.pdf"`,
    });
  }

  @Get('remediation/consent')
  @Permissions('remediation:preview')
  @ApiOperation({
    summary:
      'Status e informações do consentimento de remediação automática (LGPD)',
  })
  remediationConsentStatus(@CurrentUser() user: { id: string }) {
    return this.remediationConsent.getConsentStatus(user.id);
  }

  @Post('remediation/consent/accept')
  @Permissions('remediation:apply')
  @ApiOperation({
    summary:
      'Registrar consentimento para remediação automática em repositórios GitHub',
  })
  acceptRemediationConsent(
    @CurrentUser() user: { id: string },
    @Body() dto: RemediationConsentAcceptDto,
    @Req() req: Request,
  ) {
    return this.remediationConsent.acceptConsent(
      user.id,
      {
        termsAccepted: dto.termsAccepted,
        privacyAccepted: dto.privacyAccepted,
        dataProcessingAccepted: dto.termsAccepted && dto.privacyAccepted,
        remediationAcknowledged: dto.remediationAcknowledged,
        risksAcknowledged: dto.risksAcknowledged,
      },
      { ip: req.ip, userAgent: req.headers['user-agent'] },
    );
  }

  @Post('reports/:id/remediate-all')
  @Permissions('remediation:apply')
  @ApiOperation({
    summary:
      'Aplicar remediação automática em todas as vulnerabilidades do relatório',
  })
  remediateAll(
    @CurrentUser() user: { id: string },
    @Param('id') auditId: string,
  ) {
    return this.remediation.applyAll(auditId, user.id);
  }

  @Get('remediation/:findingId/preview')
  @Permissions('remediation:preview')
  @ApiOperation({ summary: 'Preview do plano de remediação' })
  previewRemediation(@Param('findingId') findingId: string) {
    return this.remediation.preview(findingId);
  }

  @Post('remediation/:findingId/apply')
  @Permissions('remediation:apply')
  @ApiOperation({ summary: 'Aplicar remediação da vulnerabilidade' })
  applyRemediation(
    @CurrentUser() user: { id: string },
    @Param('findingId') findingId: string,
  ) {
    return this.remediation.apply(findingId, user.id);
  }

  private async resolveFindingMarkdown(
    auditId: string,
    findingId: string,
  ): Promise<string> {
    let markdown = await this.auditStore.getFindingMarkdown(auditId, findingId);
    if (markdown) return markdown;

    const stored = await this.auditStore.getById(auditId);
    if (!stored) throw new NotFoundException('Relatório não encontrado');

    const match = this.auditStore.findInReport(
      auditId,
      stored.report,
      findingId,
    );
    if (!match) throw new NotFoundException('Vulnerabilidade não encontrada');

    markdown = this.vulnerabilityReportGenerator.generate({
      auditId,
      report: stored.report,
      repository: match.repositoryScan,
      finding: match,
    });
    await this.auditStore.saveFindingMarkdown(auditId, findingId, markdown);
    return markdown;
  }

  private findingFilenameSlug(auditId: string, findingId: string): string {
    return `vulnerability-${findingId.slice(0, 8)}`;
  }

  private toJobDto(job: BackgroundJob): BackgroundJobResponseDto {
    return {
      id: job.id,
      type: job.type,
      status: job.status,
      label: job.label,
      findingId: job.payload.findingId,
      auditId: job.payload.auditId,
      progress: job.progress,
      result: job.result,
      error: job.error,
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    };
  }
}

import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { access, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { RunMiasmaAuditUseCase } from '../../application/use-cases/run-miasma-audit.use-case';
import { RemediationUseCase } from '../../application/use-cases/remediation.use-case';
import { RolesGuard } from '../../infrastructure/auth/roles.guard';
import { PdfReportGenerator } from '../../infrastructure/report/pdf-report.generator';
import { VulnerabilityReportGenerator } from '../../infrastructure/report/vulnerability-report.generator';
import { AuditReportStore } from '../../infrastructure/storage/audit-report.store';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AuditRunResponseDto } from './dto/audit-report-response.dto';

@ApiTags('Security Audit')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('audit')
export class AuditController {
  constructor(
    private readonly auditUseCase: RunMiasmaAuditUseCase,
    private readonly auditStore: AuditReportStore,
    private readonly pdfGenerator: PdfReportGenerator,
    private readonly vulnerabilityReportGenerator: VulnerabilityReportGenerator,
    private readonly remediation: RemediationUseCase,
  ) {}

  @Post('run')
  @Permissions('audit:run')
  @ApiOperation({ summary: 'Executar auditoria completa de segurança' })
  @ApiQuery({ name: 'save', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: AuditRunResponseDto })
  async runAudit(@Query('save') save?: string): Promise<AuditRunResponseDto> {
    const shouldSave = save === 'true' || save === '1';
    const result = await this.auditUseCase.execute({
      saveReportPath: shouldSave ? 'docs/security/miasma-worm-audit-report.md' : undefined,
    });
    return { report: result.report, savedTo: result.savedTo, auditId: result.auditId };
  }

  @Post('miasma')
  @Permissions('audit:run')
  @ApiOperation({ summary: 'Alias — executar auditoria Miasma/completa' })
  async executeMiasmaAudit(@Query('save') save?: string) {
    return this.runAudit(save);
  }

  @Get('reports')
  @Permissions('audit:read')
  @ApiOperation({ summary: 'Listar relatórios de auditoria' })
  listReports() {
    return this.auditStore.list();
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
  async downloadMarkdown(@Param('id') id: string, @Res({ passthrough: true }) res: Response) {
    const markdown = await this.auditStore.getMarkdown(id);
    if (!markdown) throw new NotFoundException('Relatório não encontrado');
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="audit-${id}.md"`);
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
  @ApiOperation({ summary: 'Listar vulnerabilidades de um relatório' })
  async listFindings(@Param('id') id: string) {
    const stored = await this.auditStore.getById(id);
    if (!stored) throw new NotFoundException('Relatório não encontrado');

    const repos = stored.report.allRepositories ?? stored.report.affectedRepositories;
    return repos.flatMap((repo) =>
      repo.findings.map((f) => ({
        ...f,
        repository: repo.fullName,
        auditId: id,
      })),
    );
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

  @Get('remediation/:findingId/preview')
  @Permissions('remediation:preview')
  @ApiOperation({ summary: 'Preview do plano de remediação' })
  previewRemediation(@Param('findingId') findingId: string) {
    return this.remediation.preview(findingId);
  }

  @Post('remediation/:findingId/apply')
  @Permissions('remediation:apply')
  @ApiOperation({ summary: 'Aplicar remediação da vulnerabilidade' })
  applyRemediation(@Param('findingId') findingId: string) {
    return this.remediation.apply(findingId);
  }

  private async resolveFindingMarkdown(auditId: string, findingId: string): Promise<string> {
    let markdown = await this.auditStore.getFindingMarkdown(auditId, findingId);
    if (markdown) return markdown;

    const stored = await this.auditStore.getById(auditId);
    if (!stored) throw new NotFoundException('Relatório não encontrado');

    const match = this.auditStore.findInReport(auditId, stored.report, findingId);
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

}

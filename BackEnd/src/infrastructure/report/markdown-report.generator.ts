import { Injectable } from '@nestjs/common';
import {
  MIASMA_ATTACK_START_DATE,
  MIASMA_C2_DOMAINS,
  MIASMA_SOURCE_URL,
} from '../../domain/constants/miasma-threat.constants';
import { AuditReport } from '../../domain/entities/audit-report.entity';
import { RepositoryScan } from '../../domain/entities/repository-scan.entity';

@Injectable()
export class MarkdownReportGenerator {
  generate(report: AuditReport): string {
    const lines: string[] = [
      '# Relatório de Auditoria de Segurança',
      '## Worm Miasma — Supply Chain Attack (Junho 2026)',
      '',
      `| Campo | Valor |`,
      `|-------|-------|`,
      `| **Conta auditada** | [@${report.githubUsername}](https://github.com/${report.githubUsername}) |`,
      `| **Data da auditoria** | ${this.formatDate(report.auditedAt)} |`,
      `| **Veredito** | ${this.verdictBadge(report.verdict)} |`,
      `| **Fonte de inteligência** | [StepSecurity — Miasma Worm](${MIASMA_SOURCE_URL}) |`,
      '',
      '---',
      '',
      '## Resumo Executivo',
      '',
      this.executiveSummary(report),
      '',
      '## Escopo da Auditoria',
      '',
      `| Métrica | Quantidade |`,
      `|---------|------------|`,
      `| Repositórios analisados | **${report.totalRepositories}** |`,
      `| Repositórios públicos | ${report.publicRepositories} |`,
      `| Repositórios privados | ${report.privateRepositories} |`,
      `| Repositórios afetados | **${report.affectedRepositories.length}** |`,
      `| Repositórios limpos | ${report.cleanRepositories} |`,
      `| Total de vulnerabilidades | **${report.totalVulnerabilities ?? 0}** |`,
      '',
    ];

    const categories = this.groupByCategory(report);
    if (categories.size > 0) {
      lines.push('## Vulnerabilidades por Categoria', '');
      for (const [category, count] of categories) {
        lines.push(`- **${category}:** ${count}`);
      }
      lines.push('');
    }

    if (report.affectedRepositories.length > 0) {
      lines.push('## Repositórios Afetados', '');
      for (const repo of report.affectedRepositories) {
        lines.push(...this.formatAffectedRepo(repo));
      }
    } else {
      lines.push(
        '## Repositórios Afetados',
        '',
        '> Nenhum repositório apresentou indicadores do ataque Miasma.',
        '',
      );
    }

    lines.push(
      '## Tecnologias Identificadas',
      '',
      '| Tecnologia | Repositórios | Afetados | Nível de Risco |',
      '|------------|--------------|----------|----------------|',
    );

    for (const tech of report.technologies) {
      lines.push(
        `| ${tech.name} | ${tech.repositoryCount} | ${tech.affectedCount} | ${this.riskBadge(tech.riskLevel)} |`,
      );
    }

    lines.push(
      '',
      '## Threat Intelligence — Status da Sincronização',
      '',
      `| Campo | Valor |`,
      `|-------|-------|`,
      `| Última sincronização | ${report.threatIntel.lastSyncedAt ? this.formatDate(report.threatIntel.lastSyncedAt) : 'N/A'} |`,
      `| Pacotes na base | **${report.threatIntel.totalPackages}** |`,
      `| Repositórios na base | **${report.threatIntel.totalRepositories}** |`,
      `| GitHub Advisories | ${report.threatIntel.githubAdvisoryEnabled ? '✅ Ativo' : '❌ Inativo'} |`,
      `| OpenSourceMalware | ${report.threatIntel.openSourceMalwareEnabled ? '✅ Ativo' : '⚠️ Token ausente'} |`,
      '',
      '## Fontes de Threat Intelligence (atualização automática)',
      '',
      '| Fonte | Endpoint | Frequência |',
      '|-------|----------|------------|',
      '| [GitHub Advisory Database](https://github.com/advisories) | `GET /advisories?type=malware` | A cada 6h |',
      '| [OpenSourceMalware](https://opensourcemalware.com/) | `GET /functions/v1/check-malicious` | Por dependência + sync |',
      '| Baseline Miasma | Constantes locais | Fallback permanente |',
      '',
      '## Indicadores Verificados',
      '',
      '### Arquivos maliciosos (execução ao abrir pasta no IDE/AI)',
      '- `.github/setup.js` — payload obfuscado (~4,6 MB)',
      '- `.claude/settings.json` — hook SessionStart',
      '- `.gemini/settings.json` — hook SessionStart',
      '- `.cursor/rules/setup.mdc` — prompt injection com `alwaysApply: true`',
      '- `.vscode/tasks.json` — task com `runOn: folderOpen`',
      '',
      '### Dependências comprometidas',
      '- **PyPI:** `durabletask` versões 1.4.1, 1.4.2, 1.4.3',
      '- **npm:** `@redhatcloudservices/*`, `@tiledesk/tiledesk-server`, ecossistema `@antv`, TanStack',
      '- **GitHub Actions:** `Azure/functions-action`, `Azure/functions-container-action`',
      '',
      '### Domínios C2',
      ...MIASMA_C2_DOMAINS.map((d) => `- \`${d}\``),
      '',
      '## Medidas Imediatas',
      '',
    );

    for (const action of report.immediateActions) {
      lines.push(
        `### ${action.priority}. ${action.title}`,
        '',
        action.description,
        '',
      );
    }

    if (report.limitations.length > 0) {
      lines.push('## Limitações da Auditoria', '');
      for (const limit of report.limitations) {
        lines.push(`- ${limit}`);
      }
      lines.push('');
    }

    lines.push(
      '---',
      '',
      `*Relatório gerado automaticamente por **app-audit** (NestJS) em ${this.formatDate(report.auditedAt)}.*`,
      `*Autor das convenções: Francisco Stanley Rodrigues Albuquerque*`,
    );

    return lines.join('\n');
  }

  private executiveSummary(report: AuditReport): string {
    if (report.verdict === 'not_affected') {
      return (
        `A conta **@${report.githubUsername}** foi auditada em **${report.totalRepositories}** repositórios ` +
        `(${report.publicRepositories} públicos, ${report.privateRepositories} privados). ` +
        `**Nenhum indicador do worm Miasma foi detectado.** ` +
        `Recomenda-se seguir as medidas preventivas listadas abaixo.`
      );
    }

    if (report.verdict === 'affected') {
      return (
        `**ALERTA:** Foram detectados **${report.affectedRepositories.length}** repositório(s) com indicadores ` +
        `relacionados ao ataque Miasma. Ação imediata necessária — consulte a seção de medidas.`
      );
    }

    return 'A auditoria não pôde ser concluída integralmente. Verifique as limitações.';
  }

  private formatAffectedRepo(repo: RepositoryScan): string[] {
    const lines = [
      `### [\`${repo.fullName}\`](${repo.url})`,
      '',
      `| Propriedade | Valor |`,
      `|-------------|-------|`,
      `| Visibilidade | ${repo.isPrivate ? 'Privado' : 'Público'} |`,
      `| Linguagem | ${repo.language ?? 'N/A'} |`,
      `| Última atualização | ${this.formatDate(repo.updatedAt)} |`,
      '',
      '**Achados:**',
      '',
    ];

    for (const finding of repo.findings) {
      lines.push(
        `- **[${finding.severity.toUpperCase()}]** ${finding.message}${finding.evidence ? ` — \`${finding.evidence}\`` : ''}`,
      );
    }

    lines.push('');
    return lines;
  }

  private formatDate(iso: string): string {
    return new Date(iso).toLocaleString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
    });
  }

  private verdictBadge(verdict: AuditReport['verdict']): string {
    const map = {
      affected: '🔴 **AFETADO**',
      not_affected: '🟢 **NÃO AFETADO**',
      inconclusive: '🟡 **INCONCLUSIVO**',
    };
    return map[verdict];
  }

  private groupByCategory(report: AuditReport): Map<string, number> {
    const map = new Map<string, number>();
    const repos = report.allRepositories ?? report.affectedRepositories;
    for (const repo of repos) {
      for (const f of repo.findings) {
        map.set(f.category, (map.get(f.category) ?? 0) + 1);
      }
    }
    return map;
  }

  private riskBadge(level: string): string {
    const map: Record<string, string> = {
      none: '🟢 Nenhum',
      low: '🟡 Baixo',
      medium: '🟠 Médio',
      high: '🔴 Alto',
      critical: '⛔ Crítico',
    };
    return map[level] ?? level;
  }
}

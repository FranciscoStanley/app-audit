import { AuditReport } from './audit-report.entity';

export interface StoredAuditReport {
  id: string;
  createdAt: string;
  report: AuditReport;
  markdownPath: string;
  pdfPath?: string;
}

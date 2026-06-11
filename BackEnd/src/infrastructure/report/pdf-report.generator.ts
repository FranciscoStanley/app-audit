import { Injectable, Logger } from '@nestjs/common';
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { mdToPdf } from 'md-to-pdf';

@Injectable()
export class PdfReportGenerator {
  private readonly logger = new Logger(PdfReportGenerator.name);

  async generateFromMarkdown(
    markdown: string,
    outputPath: string,
  ): Promise<string> {
    await mkdir(join(outputPath, '..'), { recursive: true });

    const pdf = await mdToPdf(
      { content: markdown },
      {
        dest: outputPath,
        pdf_options: {
          format: 'A4',
          margin: { top: '20mm', bottom: '20mm', left: '15mm', right: '15mm' },
          printBackground: true,
        },
      },
    );

    if (!pdf?.filename) {
      this.logger.warn('PDF generation returned no filename');
    }

    return outputPath;
  }
}

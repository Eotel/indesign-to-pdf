import { chromium, Browser, Page } from 'playwright';
import { PageUrl, ConversionProgress } from './types';
import * as fs from 'fs/promises';
import * as path from 'path';

export class PdfGenerator {
  private browser: Browser | null = null;
  private tempDir: string;

  constructor(tempDir: string) {
    this.tempDir = tempDir;
  }

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({
      headless: true,
    });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async generatePdfFromUrl(
    pageInfo: PageUrl,
    outputPath: string
  ): Promise<void> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage({
      viewport: {
        width: parseInt(pageInfo.width, 10),
        height: parseInt(pageInfo.height, 10),
      },
    });
    
    try {
      await page.goto(pageInfo.url, { waitUntil: 'networkidle', timeout: 60000 });
      
      await page.pdf({
        path: outputPath,
        width: pageInfo.width,
        height: pageInfo.height,
        printBackground: true,
        preferCSSPageSize: false,
      });
    } finally {
      await page.close();
    }
  }

  async generateAllPdfs(
    pageUrls: PageUrl[],
    progressCallback?: (progress: ConversionProgress) => void
  ): Promise<string[]> {
    const pdfPaths: string[] = [];
    const totalPages = pageUrls.length;

    for (let index = 0; index < pageUrls.length; index++) {
      const pageInfo = pageUrls[index];

      if (progressCallback) {
        progressCallback({
          currentPage: index + 1,
          totalPages,
          stage: 'converting',
          message: `Converting page ${pageInfo.pageNumber} to PDF...`,
        });
      }

      const pdfPath = path.join(this.tempDir, `page-${pageInfo.pageNumber}.pdf`);
      await this.generatePdfFromUrl(pageInfo, pdfPath);
      pdfPaths.push(pdfPath);
    }

    return pdfPaths;
  }
}

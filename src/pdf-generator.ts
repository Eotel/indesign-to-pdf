import { chromium, Browser } from "playwright";
import { PageUrl, ConversionProgress } from "./types";
import * as path from "path";

export class PdfGenerator {
  private browser: Browser | null = null;
  private tempDir: string;
  private concurrency: number;

  constructor(tempDir: string, concurrency: number = 3) {
    this.tempDir = tempDir;
    this.concurrency = concurrency;
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

  async generatePdfFromUrl(pageInfo: PageUrl, outputPath: string): Promise<void> {
    if (!this.browser) {
      throw new Error("Browser not initialized");
    }

    const page = await this.browser.newPage({
      viewport: {
        width: parseInt(pageInfo.width, 10),
        height: parseInt(pageInfo.height, 10),
      },
    });

    try {
      await page.goto(pageInfo.url, { waitUntil: "networkidle", timeout: 60000 });

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
    progressCallback?: (progress: ConversionProgress) => void,
  ): Promise<string[]> {
    const pdfPaths: string[] = Array.from({ length: pageUrls.length });
    const totalPages = pageUrls.length;
    let completedCount = 0;

    const convertPage = async (pageInfo: PageUrl, index: number) => {
      const pdfPath = path.join(this.tempDir, `page-${pageInfo.pageNumber}.pdf`);
      await this.generatePdfFromUrl(pageInfo, pdfPath);
      pdfPaths[index] = pdfPath;

      completedCount++;
      if (progressCallback) {
        progressCallback({
          currentPage: completedCount,
          totalPages,
          stage: "converting",
          message: `Converting page ${pageInfo.pageNumber} to PDF...`,
        });
      }
    };

    for (let i = 0; i < pageUrls.length; i += this.concurrency) {
      const batch = pageUrls.slice(i, i + this.concurrency);
      const batchPromises = batch.map((pageInfo, batchIndex) =>
        convertPage(pageInfo, i + batchIndex),
      );
      await Promise.all(batchPromises);
    }

    return pdfPaths;
  }
}

import { PlaywrightDiscovery } from "./playwright-discovery";
import { PdfGenerator } from "./pdf-generator";
import { PdfMerger } from "./pdf-merger";
import { ConversionOptions, ConversionProgress, PageUrl } from "./types";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

export class IndesignToPdfConverter {
  private options: ConversionOptions;
  private progressCallback?: (progress: ConversionProgress) => void;

  constructor(
    options: ConversionOptions,
    progressCallback?: (progress: ConversionProgress) => void,
  ) {
    this.options = {
      concurrency: 3,
      timeout: 30000,
      retries: 3,
      ...options,
    };
    this.progressCallback = progressCallback;
  }

  async convert(viewUrl: string): Promise<void> {
    const tempDir = await this.createTempDir();

    try {
      await this.reportProgress({
        currentPage: 0,
        totalPages: 0,
        stage: "fetching",
        message: "Fetching publication metadata...",
      });

      const { pageUrls } = await this.discoverPages(viewUrl);

      const filteredPages = this.applyPageRange(pageUrls);

      await this.reportProgress({
        currentPage: 0,
        totalPages: filteredPages.length,
        stage: "converting",
        message: `Converting ${filteredPages.length} pages to PDF...`,
      });

      const pdfGenerator = new PdfGenerator(tempDir, this.options.concurrency);
      await pdfGenerator.initialize();

      try {
        const pdfPaths = await pdfGenerator.generateAllPdfs(filteredPages, this.progressCallback);

        await this.reportProgress({
          currentPage: filteredPages.length,
          totalPages: filteredPages.length,
          stage: "merging",
          message: "Merging PDFs...",
        });

        const pdfMerger = new PdfMerger();
        await pdfMerger.mergePdfs(pdfPaths, this.options.outputPath);

        await this.reportProgress({
          currentPage: filteredPages.length,
          totalPages: filteredPages.length,
          stage: "complete",
          message: `PDF saved to ${this.options.outputPath}`,
        });
      } finally {
        await pdfGenerator.close();
      }
    } finally {
      await this.cleanup(tempDir);
    }
  }

  private async discoverPages(
    viewUrl: string,
  ): Promise<{ pageUrls: PageUrl[]; totalPages: number }> {
    const discovery = new PlaywrightDiscovery();
    await discovery.initialize();

    try {
      const { pageUrls } = await discovery.discover(viewUrl);
      return { pageUrls, totalPages: pageUrls.length };
    } finally {
      await discovery.close();
    }
  }

  private applyPageRange(pageUrls: PageUrl[]): PageUrl[] {
    if (!this.options.pageRange) {
      return pageUrls;
    }

    const { start, end } = this.options.pageRange;
    return pageUrls.filter((p) => p.pageNumber >= start && p.pageNumber <= end);
  }

  private async createTempDir(): Promise<string> {
    const tempDir =
      this.options.tempDir || (await fs.mkdtemp(path.join(os.tmpdir(), "indesign-pdf-")));
    await fs.mkdir(tempDir, { recursive: true });
    return tempDir;
  }

  private async cleanup(tempDir: string): Promise<void> {
    if (!this.options.tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch {}
    }
  }

  private async reportProgress(progress: ConversionProgress): Promise<void> {
    if (this.progressCallback) {
      this.progressCallback(progress);
    }
  }
}

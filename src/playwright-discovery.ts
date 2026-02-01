import { chromium, Browser, Page } from 'playwright';
import { ManifestParser } from './manifest-parser';
import { ParsedPublication, PageUrl } from './types';

export class PlaywrightDiscovery {
  private browser: Browser | null = null;

  async initialize(): Promise<void> {
    this.browser = await chromium.launch({ headless: true });
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  async discover(viewUrl: string): Promise<{ parsed: ParsedPublication; pageUrls: PageUrl[] }> {
    if (!this.browser) {
      throw new Error('Browser not initialized');
    }

    const page = await this.browser.newPage();

    try {
      await page.goto(viewUrl, { waitUntil: 'load', timeout: 60000 });

      const html = await page.content();
      const parser = new ManifestParser(viewUrl);
      const publicationId = parser.extractPublicationId();
      const readerData = parser.extractReaderViewData(html);
      const manifest = parser.parseManifestBody(readerData.MANIFEST_BODY);
      const packageId = readerData.VERSION_PREFIX;

      await page.waitForTimeout(2000);
      
      let numericId: string | null = null;
      let contentBaseUrl: string | null = null;
      
      const dummyFrames = page.locator('iframe[name="dummyFrame"]');
      const count = await dummyFrames.count();
      
      for (let i = 0; i < count && !numericId; i++) {
        const src = await dummyFrames.nth(i).getAttribute('src');
        if (src) {
          const match = src.match(/(https:\/\/indd\.adobe\.com\/content\/2\/[^/]+\/(\d+)\/package\/[^/]+)\//);
          if (match) {
            contentBaseUrl = match[1];
            numericId = match[2];
          }
        }
      }
      
      if (!numericId || !contentBaseUrl) {
        const iframeSrc = await page.locator('iframe#contentIFrame').getAttribute('src');
        if (iframeSrc) {
          const match = iframeSrc.match(/\/content\/2\/[^/]+\/(\d+)\/package\//);
          if (match) {
            numericId = match[1];
          }
        }
      }
      
      if (!numericId) {
        throw new Error('Could not extract numeric ID from any iframe');
      }

      const baseContentUrl = `https://indd.adobe.com/content/2/${publicationId}/${numericId}/package/${packageId}`;

      const parsed: ParsedPublication = {
        publicationId,
        numericId,
        packageId,
        manifest,
        baseContentUrl,
      };

      const pageUrls = parser.buildPageUrls(parsed);

      return { parsed, pageUrls };
    } finally {
      await page.close();
    }
  }
}

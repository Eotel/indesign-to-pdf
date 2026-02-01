import { ReaderViewData, PublicationManifest, ParsedPublication, PageUrl } from './types';

export class ManifestParser {
  private viewUrl: string;

  constructor(viewUrl: string) {
    this.viewUrl = viewUrl;
  }

  extractPublicationId(): string {
    const match = this.viewUrl.match(/\/view\/([a-f0-9-]+)/);
    if (!match) {
      throw new Error(`Invalid InDesign view URL: ${this.viewUrl}`);
    }
    return match[1];
  }

  extractReaderViewData(html: string): ReaderViewData {
    const scriptMatch = html.match(/readerViewDataFromServer\s*=\s*({[\s\S]*?})\s*(?:<\/script>|\n)/);
    if (!scriptMatch) {
      throw new Error('Could not find readerViewDataFromServer in HTML');
    }

    try {
      const data = JSON.parse(scriptMatch[1]) as ReaderViewData;
      return data;
    } catch (error) {
      throw new Error(`Failed to parse readerViewDataFromServer: ${error}`);
    }
  }

  parseManifestBody(manifestBody: string): PublicationManifest {
    try {
      const manifest = JSON.parse(manifestBody) as PublicationManifest;
      
      if (!manifest.pages || !Array.isArray(manifest.pages)) {
        throw new Error('Manifest does not contain pages array');
      }

      return manifest;
    } catch (error) {
      throw new Error(`Failed to parse MANIFEST_BODY: ${error}`);
    }
  }

  extractNumericId(html: string): string {
    const iframeMatch = html.match(
      /relativepath=\/content\/2\/[a-f0-9-]+\/(\d+)\/package\//
    );
    if (iframeMatch) {
      return iframeMatch[1];
    }

    const contentUrlMatch = html.match(
      /indd\.adobe\.com\/content\/2\/[a-f0-9-]+\/(\d+)\/package/
    );
    if (contentUrlMatch) {
      return contentUrlMatch[1];
    }

    throw new Error('Could not extract numeric ID from HTML');
  }

  parse(html: string): ParsedPublication {
    const publicationId = this.extractPublicationId();
    const readerData = this.extractReaderViewData(html);
    const manifest = this.parseManifestBody(readerData.MANIFEST_BODY);
    const numericId = this.extractNumericId(html);
    const packageId = readerData.VERSION_PREFIX;
    const baseContentUrl = `https://indd.adobe.com/content/2/${publicationId}/${numericId}/package/${packageId}`;

    return {
      publicationId,
      numericId,
      packageId,
      manifest,
      baseContentUrl,
    };
  }

  buildPageUrls(parsed: ParsedPublication): PageUrl[] {
    return parsed.manifest.pages.map((page, index) => ({
      pageNumber: index + 1,
      url: `${parsed.baseContentUrl}/${page.html}`,
      filename: page.html,
      width: page.width,
      height: page.height,
    }));
  }
}

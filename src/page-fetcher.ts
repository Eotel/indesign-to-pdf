import { PageUrl } from "./types";

export class PageFetcher {
  async fetchPage(url: string, retries = 3): Promise<string> {
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const response = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          },
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        if (attempt < retries) {
          await this.delay(1000 * attempt);
        }
      }
    }

    throw lastError || new Error(`Failed to fetch ${url} after ${retries} attempts`);
  }

  async fetchAllPages(pages: PageUrl[], concurrency = 3): Promise<Map<number, string>> {
    const results = new Map<number, string>();
    const queue = [...pages];
    const inProgress: Promise<void>[] = [];

    const processPage = async (page: PageUrl): Promise<void> => {
      const html = await this.fetchPage(page.url);
      results.set(page.pageNumber, html);
    };

    while (queue.length > 0 || inProgress.length > 0) {
      while (inProgress.length < concurrency && queue.length > 0) {
        const page = queue.shift();
        if (page) {
          inProgress.push(
            processPage(page).finally(() => {
              const index = inProgress.findIndex((p) => p === inProgress[inProgress.length - 1]);
              if (index > -1) {
                inProgress.splice(index, 1);
              }
            }),
          );
        }
      }

      if (inProgress.length > 0) {
        await Promise.race(inProgress);
      }
    }

    return results;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

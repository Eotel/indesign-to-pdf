import { Command } from "commander";
import { IndesignToPdfConverter } from "./converter";
import { ConversionOptions, ConversionProgress } from "./types";
import * as path from "path";

const program = new Command();

program
  .name("indd2pdf")
  .description("Convert Adobe InDesign Online Publications to PDF")
  .version("1.0.0")
  .argument("<view-url>", "InDesign Online Publication view URL")
  .option("-o, --output <path>", "Output PDF file path", "output.pdf")
  .option("-t, --temp-dir <path>", "Temporary directory for intermediate files")
  .option("-k, --keep-temp", "Keep temporary files after conversion", false)
  .option("-c, --concurrency <number>", "Number of concurrent page fetches", "3")
  .option("-r, --range <range>", "Page range (e.g., 1-10 or 5)")
  .option("--timeout <ms>", "Request timeout in milliseconds", "30000")
  .option("--retries <number>", "Number of retry attempts", "3")
  .action(async (viewUrl: string, options) => {
    try {
      const concurrency = parseInt(options.concurrency, 10);
      const timeout = parseInt(options.timeout, 10);
      const retries = parseInt(options.retries, 10);

      let pageRange: { start: number; end: number } | undefined;
      if (options.range) {
        if (options.range.includes("-")) {
          const [start, end] = options.range.split("-").map((n: string) => parseInt(n, 10));
          pageRange = { start, end };
        } else {
          const page = parseInt(options.range, 10);
          pageRange = { start: page, end: page };
        }
      }

      const conversionOptions: ConversionOptions = {
        outputPath: path.resolve(options.output),
        tempDir: options.tempDir ? path.resolve(options.tempDir) : undefined,
        concurrency,
        pageRange,
        timeout,
        retries,
      };

      const converter = new IndesignToPdfConverter(
        conversionOptions,
        (progress: ConversionProgress) => {
          const percentage =
            progress.totalPages > 0
              ? Math.round((progress.currentPage / progress.totalPages) * 100)
              : 0;
          console.log(`[${progress.stage}] ${percentage}% - ${progress.message}`);
        },
      );

      console.log(`Converting: ${viewUrl}`);
      console.log(`Output: ${conversionOptions.outputPath}`);
      if (pageRange) {
        console.log(`Page range: ${pageRange.start}-${pageRange.end}`);
      }
      console.log("");

      await converter.convert(viewUrl);

      console.log("");
      console.log("Conversion completed successfully!");
      console.log(`PDF saved to: ${conversionOptions.outputPath}`);
    } catch (error) {
      console.error("");
      console.error("Error:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

export async function run(): Promise<void> {
  await program.parseAsync();
}

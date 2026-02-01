# InDesign to PDF Converter

Convert Adobe InDesign Online Publications to PDF format.

## Overview

This utility script extracts pages from Adobe InDesign Online Publications and converts them to a single PDF file. It uses Playwright for browser automation and discovery, and supports concurrent processing with progress reporting.

## Features

- Automatic discovery of publication structure using Playwright
- Concurrent page fetching and PDF generation
- Progress reporting with stage indicators
- Page range selection (convert specific pages only)
- Configurable concurrency and timeouts
- Temporary file management with optional preservation

## Installation

```bash
npm install
npx playwright install chromium
```

## Usage

### Basic Usage

```bash
npx ts-node src/index.ts <view-url> -o output.pdf
```

### Examples

Convert all pages:
```bash
npx ts-node src/index.ts "https://indd.adobe.com/view/YOUR-PUBLICATION-ID" -o output.pdf
```

Convert specific page range (pages 1-10):
```bash
npx ts-node src/index.ts "https://indd.adobe.com/view/YOUR-PUBLICATION-ID" -o output.pdf -r 1-10
```

Convert single page:
```bash
npx ts-node src/index.ts "https://indd.adobe.com/view/YOUR-PUBLICATION-ID" -o output.pdf -r 5
```

With custom concurrency (for faster processing):
```bash
npx ts-node src/index.ts "https://indd.adobe.com/view/..." -o output.pdf -c 5
```

With custom temporary directory:
```bash
npx ts-node src/index.ts "https://indd.adobe.com/view/..." -o output.pdf -t /tmp/my-temp-dir
```

Keep temporary files for debugging:
```bash
npx ts-node src/index.ts "https://indd.adobe.com/view/..." -o output.pdf -k
```

### CLI Options

| Option | Description | Default |
|--------|-------------|---------|
| `-o, --output <path>` | Output PDF file path | `output.pdf` |
| `-t, --temp-dir <path>` | Temporary directory for intermediate files | Auto-generated |
| `-k, --keep-temp` | Keep temporary files after conversion | `false` |
| `-c, --concurrency <number>` | Number of concurrent PDF page renders | `3` |
| `-r, --range <range>` | Page range (e.g., `1-10` or `5`) | All pages |
| `--timeout <ms>` | Request timeout in milliseconds | `30000` |
| `--retries <number>` | Number of retry attempts | `3` |

## Architecture

The converter follows a pipeline architecture:

1. **Discovery** (`PlaywrightDiscovery`): Uses Playwright to load the view URL and extract:
   - Publication ID from the URL
   - Manifest data from `readerViewDataFromServer`
   - Numeric ID from prefetch iframes
   - Package ID from `VERSION_PREFIX`

2. **Page Fetching** (`PageFetcher`): Concurrently fetches HTML content for all pages

3. **PDF Generation** (`PdfGenerator`): Uses Playwright with Chromium to render HTML pages to PDF in parallel batches

4. **PDF Merging** (`PdfMerger`): Uses pdf-lib to combine individual page PDFs into a single output file

## Technical Details

### URL Pattern

InDesign Online Publications follow this pattern:
- **View URL**: `https://indd.adobe.com/view/{publication-id}`
- **Content URL**: `https://indd.adobe.com/content/2/{publication-id}/{numeric-id}/package/{package-id}/{page-file}`

Page files follow the naming convention:
- Page 1: `publication.html`
- Page 2+: `publication-{n}.html` (where n = page number - 1)

### Discovery Process

The script uses Playwright to:
1. Load the view URL
2. Extract the manifest from embedded JavaScript (`readerViewDataFromServer`)
3. Wait for prefetch iframes (`dummyFrame`) to load with full content URLs
4. Extract the numeric ID from the content URLs
5. Build the complete list of page URLs

## Limitations

- **Memory Usage**: For very large publications (>100 pages) with high-resolution content, PDF merging may require significant memory
- **No Authentication**: Only works with publicly accessible publications

## Development

```bash
# Build TypeScript
npm run build

# Run in development mode
npm run dev -- <view-url> -o output.pdf
```

## License

MIT

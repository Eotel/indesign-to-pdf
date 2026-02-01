/**
 * Type definitions for InDesign Online Publication to PDF converter
 */

export interface PageInfo {
  html: string;
  width: string;
  height: string;
  thumbnail?: string;
  [key: string]: unknown;
}

export interface PublicationManifest {
  Creator: string;
  documentName: string;
  pages: PageInfo[];
  coverImage?: string;
  shareImage?: string;
  [key: string]: unknown;
}

export interface ReaderViewData {
  MANIFEST_BODY: string;
  VERSION_PREFIX: string;
  [key: string]: string | number | boolean | unknown;
}

export interface ParsedPublication {
  publicationId: string;
  numericId: string;
  packageId: string;
  manifest: PublicationManifest;
  baseContentUrl: string;
}

export interface ConversionOptions {
  outputPath: string;
  tempDir?: string;
  concurrency?: number;
  pageRange?: { start: number; end: number };
  timeout?: number;
  retries?: number;
}

export interface PageUrl {
  pageNumber: number;
  url: string;
  filename: string;
  width: string;
  height: string;
}

export interface ConversionProgress {
  currentPage: number;
  totalPages: number;
  stage: "fetching" | "converting" | "merging" | "complete";
  message: string;
}

export type ProgressCallback = (progress: ConversionProgress) => void;

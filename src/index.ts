#!/usr/bin/env node

import { run } from "./cli";

run().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

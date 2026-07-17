import dotenv from 'dotenv';
import path from 'path';

// Side-effect-only module: importing it loads the repo-root .env.
//
// This cannot live in server.ts. ES import declarations are hoisted, so any
// `dotenv.config()` written at the top of an entrypoint still runs *after*
// every imported module has been evaluated — and modules that read
// process.env at import time (config/env.ts) would see an unpopulated env.
// Importing this module first, and from each config module that reads
// process.env, guarantees the .env is loaded before the first read.
//
// __dirname is server/src here, and server/dist once built; the .env sits one
// level above the server package in both cases.
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

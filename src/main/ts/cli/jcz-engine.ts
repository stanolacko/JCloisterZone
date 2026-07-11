#!/usr/bin/env node
// Node host for the TypeScript jCloisterZone engine — a drop-in for `Engine.jar`.
//
// This file is COMPILED by `npm run build` into `dist/cli/jcz-engine.js`; run that.
// It lives outside `com/jcloisterzone/` so the engine core stays Node-free/portable.
//
// Speaks the same line protocol FanCloisterZone expects:
//   * stdin: `%`-directives (%load/%bulk/%compat/%state), GAME_SETUP json, then
//     one message json per line.
//   * stdout: one full-state JSON object per `\n` (suppressed in `%bulk on`).
//   * stderr: diagnostics are prefixed with `#` (the client ignores those lines).
//
// Modes (mirrors the jar):
//   jcz-engine --version          → print version and exit
//   jcz-engine                    → stdin/stdout pipe (default; what `spawn` uses)
//   jcz-engine -p <port>          → TCP socket server (matches SocketEngine)
//
// Debugging the protocol:
//   --log <file>   append every command-in (`>>`) and response-out (`<<`) to a file
//   -v|--verbose   also echo them to stderr (`#`-prefixed, so the client ignores them)

import { createInterface } from "node:readline";
import { readFileSync, createWriteStream } from "node:fs";
import { createServer, type Socket } from "node:net";
import { DOMParser } from "@xmldom/xmldom";
import { setDomParserFactory, type XmlDOMParser } from "../com/jcloisterzone/XmlUtils.js";
import { Engine } from "../com/jcloisterzone/engine/Engine.js";
import { ENGINE_VERSION } from "../version.js";

const VERSION = "jcloisterzone-engine-ts " + ENGINE_VERSION;

if (process.argv.includes("--version")) {
  process.stdout.write(VERSION + "\n");
  process.exit(0);
}

// xmldom satisfies the minimal W3C-DOM interface the core codes against
setDomParserFactory(() => new DOMParser() as unknown as XmlDOMParser);

const newEngine = (): Engine => new Engine((p: string) => readFileSync(p, "utf8"));

// --- protocol logging ---------------------------------------------------------
const argVal = (flag: string): string | null => {
  const i = process.argv.indexOf(flag);
  return i >= 0 ? process.argv[i + 1] ?? null : null;
};
const logFile = argVal("--log");
const verbose = process.argv.includes("-v") || process.argv.includes("--verbose");
const logStream = logFile ? createWriteStream(logFile, { flags: "a" }) : null;

/** dir: ">>" = client→engine command, "<<" = engine→client response. */
function logLine(dir: string, line: string): void {
  if (logStream) logStream.write(`${dir} ${line}\n`);
  if (verbose) {
    const shown =
      dir === "<<" && line.length > 300 ? `${line.slice(0, 300)}…(${line.length} bytes)` : line;
    process.stderr.write(`#${dir} ${shown}\n`);
  }
}

/** Drive one Engine from a line-reader, writing responses via `write`. */
function driveLines(write: (s: string) => void, onError: (s: string) => void): (line: string) => void {
  const engine = newEngine();
  return (line: string) => {
    logLine(">>", line);
    try {
      const out = engine.processInput(line);
      if (out !== null) {
        logLine("<<", out);
        write(out + "\n");
      }
    } catch (e) {
      // `#`-prefixed → client treats as ignorable diagnostic
      onError("#error " + (e instanceof Error && e.stack ? e.stack : String(e)));
    }
  };
}

const portArgIdx = process.argv.findIndex((a) => a === "-p" || a === "--port");
if (portArgIdx >= 0 && process.argv[portArgIdx + 1]) {
  // --- socket mode (matches SocketEngine) ---
  const port = parseInt(process.argv[portArgIdx + 1] as string, 10);
  const server = createServer((socket: Socket) => {
    socket.setEncoding("utf8");
    // A client disconnect/reset emits 'error' (e.g. ECONNRESET). Without a handler Node
    // re-throws it as an uncaught exception and the whole server process dies — so one
    // dropped connection would take the engine down. Swallow it as a diagnostic.
    socket.on("error", (err: Error) => process.stderr.write(`#socket error: ${err.message}\n`));
    const handle = driveLines(
      (s) => socket.write(s, "utf8"),
      (s) => process.stderr.write(s + "\n"),
    );
    let buf = "";
    socket.on("data", (chunk: Buffer | string) => {
      buf += chunk;
      let nl: number;
      while ((nl = buf.indexOf("\n")) >= 0) {
        const line = buf.slice(0, nl);
        buf = buf.slice(nl + 1);
        handle(line.replace(/\r$/, ""));
      }
    });
  });
  server.on("error", (err: Error) => process.stderr.write(`#server error: ${err.message}\n`));
  // a stray throw anywhere in message handling must not kill the long-lived server
  process.on("uncaughtException", (err) =>
    process.stderr.write(`#uncaught: ${err && err.stack ? err.stack : String(err)}\n`),
  );
  server.listen(port, () =>
    process.stdout.write(`#listening on port ${port}${logFile ? ` (logging to ${logFile})` : ""}\n`),
  );
} else {
  // --- stdin/stdout pipe mode (default; what `spawn(java, ['-jar', ...])` uses) ---
  const rl = createInterface({ input: process.stdin, terminal: false });
  const handle = driveLines(
    (s) => process.stdout.write(s, "utf8"),
    (s) => process.stderr.write(s + "\n"),
  );
  rl.on("line", (line: string) => handle(line.replace(/\r$/, "")));
  rl.on("close", () => process.exit(0));
}

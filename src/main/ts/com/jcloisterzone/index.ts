// Public entry point for embedding the engine in-process (the package's `exports["."]`).
//
//   import { Engine, setDomParserFactory } from "jcloisterzone-engine";
//   setDomParserFactory(() => new DOMParser());          // browser/Electron native DOM
//   const engine = new Engine((path) => readFileSync(path, "utf8"));
//   const responseJson = engine.processInput(line);      // same line protocol as the CLI
//
// The core under com/jcloisterzone/ has no Node imports, so it runs anywhere (Electron
// renderer/main, Node, browser). Only the host (file reading, the DOM parser) is injected.

export { Engine } from "./engine/Engine.js";
export { setDomParserFactory, type XmlDOMParser } from "./XmlUtils.js";

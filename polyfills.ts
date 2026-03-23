import { Buffer } from "buffer";

if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

if (typeof global.TextEncoder === "undefined" || typeof global.TextDecoder === "undefined") {
  try {
    const enc = require("@stardazed/streams-text-encoding");
    if (typeof global.TextEncoder === "undefined" && enc.TextEncoder) {
      global.TextEncoder = enc.TextEncoder;
    }
    if (typeof global.TextDecoder === "undefined" && enc.TextDecoder) {
      global.TextDecoder = enc.TextDecoder;
    }
  } catch {
    // TextEncoder/TextDecoder are natively available in Hermes — this is a fallback only
  }
}

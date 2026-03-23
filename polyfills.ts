import { Buffer } from "buffer";

if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

if (typeof global.TextEncoder === "undefined" || typeof global.TextDecoder === "undefined") {
  const { TextEncoder, TextDecoder } = require("@stardazed/streams-text-encoding");
  if (typeof global.TextEncoder === "undefined") global.TextEncoder = TextEncoder;
  if (typeof global.TextDecoder === "undefined") global.TextDecoder = TextDecoder;
}

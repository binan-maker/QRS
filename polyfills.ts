import { Buffer } from "buffer";
import { Text, TextInput } from "react-native";
if (typeof DOMException === 'undefined') {
  global.DOMException = class DOMException extends Error {
    constructor(message: string, name?: string) {
      super(message);
      this.name = name || 'Error';
    }
  } as any;
}

// Also assign to globalThis for broader compatibility
if (typeof globalThis.DOMException === 'undefined') {
  globalThis.DOMException = global.DOMException;
}

if (typeof global.Buffer === "undefined") {
  global.Buffer = Buffer;
}

(Text as any).defaultProps = (Text as any).defaultProps || {};
(Text as any).defaultProps.allowFontScaling = false;
(TextInput as any).defaultProps = (TextInput as any).defaultProps || {};
(TextInput as any).defaultProps.allowFontScaling = false;

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
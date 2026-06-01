import { Buffer } from "buffer";
import { Text, TextInput } from "react-native";

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

// ─── Browser DOM API stubs for Hermes / React Native ─────────────────────────
// Libraries like Firebase, semver, and others reference browser globals at
// module-load time. Hermes does not define these, so we stub them here before
// any other module is required. Without this, Hermes throws
// "Property 'Range' doesn't exist" (and similar) which cascades into 20+ errors.

if (typeof (global as any).Range === "undefined") {
  (global as any).Range = class Range {
    startOffset = 0;
    endOffset = 0;
    startContainer: any = null;
    endContainer: any = null;
    collapsed = true;
    commonAncestorContainer: any = null;
    setStart() {}
    setEnd() {}
    setStartBefore() {}
    setStartAfter() {}
    setEndBefore() {}
    setEndAfter() {}
    selectNode() {}
    selectNodeContents() {}
    collapse() {}
    cloneContents() { return null; }
    deleteContents() {}
    extractContents() { return null; }
    insertNode() {}
    surroundContents() {}
    cloneRange() { return new (global as any).Range(); }
    detach() {}
    isPointInRange() { return false; }
    comparePoint() { return 0; }
    intersectsNode() { return false; }
    toString() { return ""; }
    getBoundingClientRect() { return { top: 0, left: 0, bottom: 0, right: 0, width: 0, height: 0 }; }
    getClientRects() { return []; }
  };
}

if (typeof (global as any).document === "undefined") {
  (global as any).document = {
    createRange: () => new (global as any).Range(),
    createElement: (_tag: string) => ({
      style: {},
      setAttribute: () => {},
      getAttribute: () => null,
      appendChild: () => {},
      removeChild: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
      childNodes: [],
      children: [],
      innerHTML: "",
      textContent: "",
    }),
    createTextNode: (text: string) => ({ textContent: text, nodeValue: text }),
    createDocumentFragment: () => ({
      appendChild: () => {},
      childNodes: [],
    }),
    getElementById: () => null,
    getElementsByTagName: () => [],
    querySelector: () => null,
    querySelectorAll: () => [],
    head: { appendChild: () => {}, removeChild: () => {} },
    body: { appendChild: () => {}, removeChild: () => {}, style: {} },
    documentElement: { style: {}, lang: "en" },
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  };
}

if (typeof (global as any).window === "undefined") {
  (global as any).window = global;
}

if (typeof (global as any).navigator === "undefined") {
  (global as any).navigator = {
    userAgent: "ReactNative",
    platform: "android",
    language: "en",
    languages: ["en"],
    onLine: true,
  };
}

if (typeof (global as any).location === "undefined") {
  (global as any).location = {
    href: "",
    origin: "",
    protocol: "https:",
    host: "",
    hostname: "",
    port: "",
    pathname: "/",
    search: "",
    hash: "",
    assign: () => {},
    replace: () => {},
    reload: () => {},
  };
}

// ─── Fix: Event phase constants are non-writable in React Native 0.74+ ───────
// React Native's DOM-compatible Event class defines NONE / CAPTURING_PHASE /
// AT_TARGET / BUBBLING_PHASE on both Event and Event.prototype via
// Object.defineProperty without writable:true (defaults to false) AND without
// configurable:true (defaults to false).  Any subclass that tries
//   this.NONE = 0   (class field or constructor assignment)
// in strict mode throws: "TypeError: Cannot assign to read-only property 'NONE'"
//
// Fix: wrap the global Event in a subclass that shadows each constant on the
// intermediate prototype with a writable descriptor.  All downstream
// subclasses (Firebase, Expo, etc.) extend our wrapper and find the writable
// version first in the prototype chain, so the assignment succeeds.
try {
  const _OriginalEvent = (global as any).Event;
  if (typeof _OriginalEvent === "function") {
    class _PatchedEvent extends _OriginalEvent {}

    const _phaseConstants: [string, number][] = [
      ["NONE", 0],
      ["CAPTURING_PHASE", 1],
      ["AT_TARGET", 2],
      ["BUBBLING_PHASE", 3],
    ];

    for (const [name, value] of _phaseConstants) {
      try {
        Object.defineProperty(_PatchedEvent.prototype, name, {
          value,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } catch (_) {}
      try {
        Object.defineProperty(_PatchedEvent, name, {
          value,
          writable: true,
          configurable: true,
          enumerable: true,
        });
      } catch (_) {}
    }

    (global as any).Event = _PatchedEvent;
  }
} catch (_) {}

// ─── Fix: Firebase Firestore internal User class global lookup ────────────────
// Firebase Firestore's React-Native bundle defines a lightweight internal
// User class (NOT the firebase/auth User) and immediately sets static
// properties on it at module scope:
//   User.UNAUTHENTICATED = new User(null)
//   User.GOOGLE_CREDENTIALS = new User("google-credentials-uid")
// In Hermes, when the module-scope class binding is not resolvable through the
// local scope, the engine falls back to global lookup and throws
// "ReferenceError: Property 'User' doesn't exist".
// Providing a global stub prevents the ReferenceError; Firebase's own module-
// scoped class overrides the stub's static properties once fully loaded.
if (typeof (global as any).User === "undefined") {
  class _UserStub {
    uid: string | null;
    constructor(uid: string | null) {
      this.uid = uid;
    }
    isAuthenticated() { return this.uid != null; }
    isUnauthenticated() { return this.uid == null; }
    toKey() { return this.uid ? "uid:" + this.uid : "anonymous-user"; }
    isEqual(other: any) { return other != null && other.uid === this.uid; }
  }
  (global as any).User = _UserStub;
}

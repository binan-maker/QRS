/**
 * early-polyfills.js
 *
 * Injected via metro.config.js serializer.getPolyfills — runs as a raw global
 * script BEFORE any __d() module is registered or required, including
 * react-native/Libraries/Core/InitializeCore.
 *
 * Purpose: provide DOM global stubs that React Native 0.74+ internals
 * reference during setUpDefaultReactNativeEnvironment / setUpDOM /
 * setUpPerformance before those same globals are formally installed.
 * Without these stubs Hermes throws:
 *   [runtime not ready]: ReferenceError: Property 'X' doesn't exist
 *
 * Rules for this file:
 *  - Plain ES5/ES6 JavaScript only — no TypeScript, no `require()`.
 *  - Must not use private class fields (#field) — no Babel runs on polyfill
 *    scripts before the Metro bundler embeds them.
 *  - Guards every stub with `typeof global.X === 'undefined'` so the real
 *    React Native implementation (installed later via polyfillGlobal) wins.
 */

/* ─── DOMException ──────────────────────────────────────────────────────────
 *
 * Referenced at module-load time by:
 *   react-native/src/private/webapis/structuredClone/structuredClone.js
 *   react-native/src/private/webapis/performance/Performance.js
 * both of which are required during setUpPerformance (called inside
 * setUpDefaultReactNativeEnvironment → InitializeCore).
 *
 * The real DOMException lives in react-native/src/private/webapis/errors/ and
 * uses private class fields (#name, #code) + setPlatformObject.  Our stub is
 * intentionally simpler; it satisfies `instanceof DOMException` checks, the
 * constructor signature (message?, name?), numeric .code, and all 25 static /
 * prototype error-code constants.
 */
if (typeof global.DOMException === 'undefined') {
  var _domExErrorCodes = {
    INDEX_SIZE_ERR: 1,
    DOMSTRING_SIZE_ERR: 2,
    HIERARCHY_REQUEST_ERR: 3,
    WRONG_DOCUMENT_ERR: 4,
    INVALID_CHARACTER_ERR: 5,
    NO_DATA_ALLOWED_ERR: 6,
    NO_MODIFICATION_ALLOWED_ERR: 7,
    NOT_FOUND_ERR: 8,
    NOT_SUPPORTED_ERR: 9,
    INUSE_ATTRIBUTE_ERR: 10,
    INVALID_STATE_ERR: 11,
    SYNTAX_ERR: 12,
    INVALID_MODIFICATION_ERR: 13,
    NAMESPACE_ERR: 14,
    INVALID_ACCESS_ERR: 15,
    VALIDATION_ERR: 16,
    TYPE_MISMATCH_ERR: 17,
    SECURITY_ERR: 18,
    NETWORK_ERR: 19,
    ABORT_ERR: 20,
    URL_MISMATCH_ERR: 21,
    QUOTA_EXCEEDED_ERR: 22,
    TIMEOUT_ERR: 23,
    INVALID_NODE_TYPE_ERR: 24,
    DATA_CLONE_ERR: 25,
  };

  var _domExNameToCode = {
    IndexSizeError: 1,
    HierarchyRequestError: 3,
    WrongDocumentError: 4,
    InvalidCharacterError: 5,
    NoModificationAllowedError: 7,
    NotFoundError: 8,
    NotSupportedError: 9,
    InUseAttributeError: 10,
    InvalidStateError: 11,
    SyntaxError: 12,
    InvalidModificationError: 13,
    NamespaceError: 14,
    InvalidAccessError: 15,
    TypeMismatchError: 17,
    SecurityError: 18,
    NetworkError: 19,
    AbortError: 20,
    URLMismatchError: 21,
    QuotaExceededError: 22,
    TimeoutError: 23,
    InvalidNodeTypeError: 24,
    DataCloneError: 25,
  };

  function DOMException(message, name) {
    if (!(this instanceof DOMException)) {
      return new DOMException(message, name);
    }
    this.message = message != null ? String(message) : '';
    this._domExName = name != null ? String(name) : 'Error';
    this._domExCode = _domExNameToCode[this._domExName] || 0;
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, DOMException);
    } else {
      this.stack = (new Error(this.message)).stack;
    }
  }

  DOMException.prototype = Object.create(Error.prototype);
  DOMException.prototype.constructor = DOMException;

  Object.defineProperty(DOMException.prototype, 'name', {
    get: function () { return this._domExName; },
    configurable: true,
    enumerable: true,
  });

  Object.defineProperty(DOMException.prototype, 'code', {
    get: function () { return this._domExCode; },
    configurable: true,
    enumerable: true,
  });

  for (var _domExKey in _domExErrorCodes) {
    var _domExVal = _domExErrorCodes[_domExKey];
    Object.defineProperty(DOMException, _domExKey, {
      value: _domExVal,
      writable: true,
      configurable: true,
      enumerable: true,
    });
    Object.defineProperty(DOMException.prototype, _domExKey, {
      value: _domExVal,
      writable: true,
      configurable: true,
      enumerable: true,
    });
  }

  global.DOMException = DOMException;
}

/* ─── EventTarget stub ──────────────────────────────────────────────────────
 *
 * Provides a minimal EventTarget so that the abort-controller npm package
 * (required by setUpXHR → polyfillGlobal('AbortController')) and
 * event-target-shim can resolve `EventTarget` globally if needed.
 *
 * React Native 0.74+ installs the real EventTarget later via polyfillGlobal;
 * all properties here are configurable so that override succeeds.
 */
if (typeof global.EventTarget === 'undefined') {
  function EventTarget() {
    this._etListeners = Object.create(null);
  }

  EventTarget.prototype.addEventListener = function (type, listener, _options) {
    if (typeof listener !== 'function' && typeof listener !== 'object') return;
    if (!this._etListeners[type]) this._etListeners[type] = [];
    var list = this._etListeners[type];
    for (var i = 0; i < list.length; i++) {
      if (list[i] === listener) return;
    }
    list.push(listener);
  };

  EventTarget.prototype.removeEventListener = function (type, listener, _options) {
    var list = this._etListeners[type];
    if (!list) return;
    for (var i = 0; i < list.length; i++) {
      if (list[i] === listener) { list.splice(i, 1); return; }
    }
  };

  EventTarget.prototype.dispatchEvent = function (event) {
    var list = this._etListeners[event && event.type];
    if (!list) return true;
    var snapshot = list.slice();
    for (var i = 0; i < snapshot.length; i++) {
      var fn = snapshot[i];
      if (typeof fn === 'function') {
        fn.call(this, event);
      } else if (fn && typeof fn.handleEvent === 'function') {
        fn.handleEvent(event);
      }
    }
    return !(event && event.defaultPrevented);
  };

  global.EventTarget = EventTarget;
}

/* ─── CustomEvent stub ──────────────────────────────────────────────────────
 *
 * Some React Native / Expo modules dispatch CustomEvent instances.
 * Extends our Event (if already defined) or the global Event.
 */
if (typeof global.CustomEvent === 'undefined') {
  var _CEBase = typeof global.Event === 'function' ? global.Event : function Event(type) { this.type = type; };
  function CustomEvent(type, init) {
    _CEBase.call(this, type, init);
    this.detail = (init && init.detail !== undefined) ? init.detail : null;
  }
  CustomEvent.prototype = Object.create(_CEBase.prototype);
  CustomEvent.prototype.constructor = CustomEvent;
  global.CustomEvent = CustomEvent;
}

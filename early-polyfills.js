/**
 * early-polyfills.js
 *
 * Injected via metro.config.js serializer.getPolyfills — runs as a raw global
 * script BEFORE any __d() module is registered or required, including
 * react-native/Libraries/Core/InitializeCore.
 *
 * Purpose: provide DOM/WebAPI global stubs that React Native 0.74+ internals
 * reference during setUpDefaultReactNativeEnvironment / setUpDOM /
 * setUpPerformance before those same globals are formally installed.
 * Without these stubs Hermes throws:
 *   [runtime not ready]: ReferenceError: Property 'X' doesn't exist
 *
 * ROOT CAUSE: RN 0.74+ webapi modules use `export class Foo { #privateField }`.
 * Babel's private-field transform renames the outer binding so that calls like
 * `setPlatformObject(Foo)` after the class body become global lookups.
 * Hermes then throws "Property 'Foo' doesn't exist" when Foo is not a known global.
 *
 * Rules for this file:
 *  - Plain ES5/ES6 JavaScript only — no TypeScript, no `require()`.
 *  - No private class fields (#field) — no Babel runs on polyfill scripts.
 *  - Every stub guarded with `typeof global.X === 'undefined'` so the real
 *    React Native implementation (installed later) wins.
 *  - All stubs use simple assignment (not Object.defineProperty) so that
 *    polyfillGlobal() (which respects configurable:true) can override them.
 */

/* ─── DOMException ──────────────────────────────────────────────────────────
 * Required by: structuredClone.js, Performance.js (both via setUpPerformance)
 * Pattern: `export default class DOMException extends Error { #name; #code }`
 *           then `setPlatformObject(DOMException, {...})` → global lookup.
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
    this.stack = (new Error(this.message)).stack;
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
      value: _domExVal, writable: true, configurable: true, enumerable: true,
    });
    Object.defineProperty(DOMException.prototype, _domExKey, {
      value: _domExVal, writable: true, configurable: true, enumerable: true,
    });
  }

  global.DOMException = DOMException;
}

/* ─── PerformanceEntry ───────────────────────────────────────────────────────
 * Required by: EventTiming.js, UserTiming.js (both imported by Performance.js)
 * Pattern: `export class PerformanceEntry { #name; #entryType; ... }`
 *           then `setPlatformObject(PerformanceEntry)` → global lookup.
 */
if (typeof global.PerformanceEntry === 'undefined') {
  function PerformanceEntry(init) {
    init = init || {};
    this._peName = init.name || '';
    this._peEntryType = init.entryType || '';
    this._peStartTime = init.startTime != null ? init.startTime : 0;
    this._peDuration = init.duration != null ? init.duration : 0;
  }

  Object.defineProperty(PerformanceEntry.prototype, 'name', {
    get: function () { return this._peName; },
    configurable: true, enumerable: true,
  });
  Object.defineProperty(PerformanceEntry.prototype, 'entryType', {
    get: function () { return this._peEntryType; },
    configurable: true, enumerable: true,
  });
  Object.defineProperty(PerformanceEntry.prototype, 'startTime', {
    get: function () { return this._peStartTime; },
    configurable: true, enumerable: true,
  });
  Object.defineProperty(PerformanceEntry.prototype, 'duration', {
    get: function () { return this._peDuration; },
    configurable: true, enumerable: true,
  });

  PerformanceEntry.prototype.toJSON = function () {
    return {
      name: this._peName,
      entryType: this._peEntryType,
      startTime: this._peStartTime,
      duration: this._peDuration,
    };
  };

  global.PerformanceEntry = PerformanceEntry;
}

/* ─── PerformanceMark ────────────────────────────────────────────────────────
 * From UserTiming.js: `export class PerformanceMark extends PerformanceEntry`
 * Both PerformanceMark and its module's `setPlatformObject(PerformanceMark)`
 * call may resolve PerformanceMark as a global.
 */
if (typeof global.PerformanceMark === 'undefined') {
  function PerformanceMark(name, options) {
    global.PerformanceEntry.call(this, {
      name: name,
      entryType: 'mark',
      startTime: (options && options.startTime != null) ? options.startTime : 0,
      duration: 0,
    });
    this.detail = (options && options.detail !== undefined) ? options.detail : null;
  }
  PerformanceMark.prototype = Object.create(global.PerformanceEntry.prototype);
  PerformanceMark.prototype.constructor = PerformanceMark;
  global.PerformanceMark = PerformanceMark;
}

/* ─── PerformanceMeasure ─────────────────────────────────────────────────────
 * From UserTiming.js: `export class PerformanceMeasure extends PerformanceEntry`
 */
if (typeof global.PerformanceMeasure === 'undefined') {
  function PerformanceMeasure(name, init) {
    global.PerformanceEntry.call(this, {
      name: name,
      entryType: 'measure',
      startTime: (init && init.startTime != null) ? init.startTime : 0,
      duration: (init && init.duration != null) ? init.duration : 0,
    });
    this.detail = (init && init.detail !== undefined) ? init.detail : null;
  }
  PerformanceMeasure.prototype = Object.create(global.PerformanceEntry.prototype);
  PerformanceMeasure.prototype.constructor = PerformanceMeasure;
  global.PerformanceMeasure = PerformanceMeasure;
}

/* ─── PerformanceEventTiming ─────────────────────────────────────────────────
 * From EventTiming.js:
 *   `export class PerformanceEventTiming extends PerformanceEntry { ... }`
 * Imported by Performance.js which uses EventCounts from the same file.
 */
if (typeof global.PerformanceEventTiming === 'undefined') {
  function PerformanceEventTiming(init) {
    global.PerformanceEntry.call(this, init || { name: '', entryType: 'event', startTime: 0, duration: 0 });
    this.processingStart = (init && init.processingStart) || 0;
    this.processingEnd = (init && init.processingEnd) || 0;
    this.cancelable = (init && init.cancelable) || false;
    this.target = (init && init.target) || null;
    this.interactionId = (init && init.interactionId) || 0;
  }
  PerformanceEventTiming.prototype = Object.create(global.PerformanceEntry.prototype);
  PerformanceEventTiming.prototype.constructor = PerformanceEventTiming;
  global.PerformanceEventTiming = PerformanceEventTiming;
}

/* ─── EventCounts ────────────────────────────────────────────────────────────
 * From EventTiming.js: `export class EventCounts` (no extends)
 * Used by Performance.js: `this.eventCounts = new EventCounts()`
 */
if (typeof global.EventCounts === 'undefined') {
  function EventCounts() {
    this._map = Object.create(null);
  }
  EventCounts.prototype.get = function (key) { return this._map[key] || 0; };
  EventCounts.prototype.has = function (key) { return key in this._map; };
  EventCounts.prototype.keys = function () { return Object.keys(this._map); };
  EventCounts.prototype.values = function () { return Object.keys(this._map).map(function(k) { return this._map[k]; }, this); };
  EventCounts.prototype.entries = function () { return Object.keys(this._map).map(function(k) { return [k, this._map[k]]; }, this); };
  EventCounts.prototype.forEach = function (cb) { Object.keys(this._map).forEach(function(k) { cb(this._map[k], k, this); }, this); };
  Object.defineProperty(EventCounts.prototype, 'size', {
    get: function () { return Object.keys(this._map).length; },
    configurable: true, enumerable: true,
  });
  global.EventCounts = EventCounts;
}

/* ─── PerformanceObserver ────────────────────────────────────────────────────
 * May be referenced globally from Performance.js or from user code that
 * runs during the boot chain.
 */
if (typeof global.PerformanceObserver === 'undefined') {
  function PerformanceObserver(callback) {
    this._poCallback = callback;
    this._poEntryTypes = [];
  }
  PerformanceObserver.prototype.observe = function (options) {
    if (options && options.entryTypes) this._poEntryTypes = options.entryTypes;
  };
  PerformanceObserver.prototype.disconnect = function () {
    this._poEntryTypes = [];
  };
  PerformanceObserver.prototype.takeRecords = function () { return []; };
  PerformanceObserver.supportedEntryTypes = ['mark', 'measure', 'event', 'longtask', 'resource'];
  global.PerformanceObserver = PerformanceObserver;
}

/* ─── EventTarget stub ───────────────────────────────────────────────────────
 * Provides a minimal EventTarget so abort-controller / event-target-shim can
 * resolve it globally. React Native 0.74+ installs the real EventTarget later
 * via polyfillGlobal (configurable, so the override succeeds).
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

/* ─── CustomEvent stub ───────────────────────────────────────────────────────
 * Some React Native / Expo modules dispatch CustomEvent instances.
 */
if (typeof global.CustomEvent === 'undefined') {
  var _CEBase = typeof global.Event === 'function'
    ? global.Event
    : function Event(type) { this.type = type; };

  function CustomEvent(type, init) {
    _CEBase.call(this, type, init);
    this.detail = (init && init.detail !== undefined) ? init.detail : null;
  }
  CustomEvent.prototype = Object.create(_CEBase.prototype);
  CustomEvent.prototype.constructor = CustomEvent;
  global.CustomEvent = CustomEvent;
}

/* ─── MutationObserver stub ──────────────────────────────────────────────────
 * React Native 0.74+ adds MutationObserver via polyfillGlobal (lazy).
 * If anything accesses it before the lazy getter fires, provide a safe stub.
 */
if (typeof global.MutationObserver === 'undefined') {
  function MutationObserver(callback) {
    this._moCallback = callback;
  }
  MutationObserver.prototype.observe = function (_target, _options) {};
  MutationObserver.prototype.disconnect = function () {};
  MutationObserver.prototype.takeRecords = function () { return []; };
  global.MutationObserver = MutationObserver;
}

/* ─── MutationRecord stub ────────────────────────────────────────────────────
 * From MutationRecord.js: `export default class MutationRecord { ... }`
 * then `setPlatformObject(MutationRecord)` → global lookup.
 */
if (typeof global.MutationRecord === 'undefined') {
  function MutationRecord() {
    this.type = '';
    this.target = null;
    this.addedNodes = [];
    this.removedNodes = [];
    this.previousSibling = null;
    this.nextSibling = null;
    this.attributeName = null;
    this.attributeNamespace = null;
    this.oldValue = null;
  }
  global.MutationRecord = MutationRecord;
}

/* ─── IntersectionObserver stub ──────────────────────────────────────────────
 * React Native 0.74+ adds IntersectionObserver. Stub for early global lookup.
 */
if (typeof global.IntersectionObserver === 'undefined') {
  function IntersectionObserver(callback, _options) {
    this._ioCallback = callback;
  }
  IntersectionObserver.prototype.observe = function (_target) {};
  IntersectionObserver.prototype.unobserve = function (_target) {};
  IntersectionObserver.prototype.disconnect = function () {};
  IntersectionObserver.prototype.takeRecords = function () { return []; };
  global.IntersectionObserver = IntersectionObserver;
}

/* ─── IntersectionObserverEntry stub ─────────────────────────────────────────
 * From IntersectionObserverEntry.js: `export default class IntersectionObserverEntry`
 * then `setPlatformObject(IntersectionObserverEntry)` → global lookup.
 */
if (typeof global.IntersectionObserverEntry === 'undefined') {
  function IntersectionObserverEntry(init) {
    init = init || {};
    this.time = init.time || 0;
    this.rootBounds = init.rootBounds || null;
    this.boundingClientRect = init.boundingClientRect || null;
    this.intersectionRect = init.intersectionRect || null;
    this.isIntersecting = init.isIntersecting || false;
    this.intersectionRatio = init.intersectionRatio || 0;
    this.target = init.target || null;
  }
  global.IntersectionObserverEntry = IntersectionObserverEntry;
}

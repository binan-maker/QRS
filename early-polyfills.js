/**
 * early-polyfills.js
 *
 * Injected via metro.config.js serializer.getPolyfills — runs as a raw global
 * script BEFORE any __d() module is registered or required, including
 * react-native/Libraries/Core/InitializeCore.
 *
 * PRIMARY FIX: Remove @babel/plugin-transform-class-properties {loose:true}
 * and @babel/plugin-transform-private-methods {loose:true} from babel.config.js.
 * Those plugins convert `export class Foo { #field }` to a class EXPRESSION
 * whose name is scoped only inside the class body, making any post-class
 * reference (`setPlatformObject(Foo)`, `export default Foo`) a global lookup
 * in Hermes → "ReferenceError: Property 'Foo' doesn't exist".
 *
 * SECONDARY SAFETY NET (this file): provide stubs for every global that
 * React Native 0.74+ webapi modules may access as a bare global during the
 * setUpDefaultReactNativeEnvironment bootstrap chain. These stubs:
 *   • use simple assignment (not Object.defineProperty) so polyfillGlobal()
 *     can override them later with the real implementations.
 *   • are guarded with `typeof global.X === 'undefined'` so they never
 *     shadow a global that was already installed correctly.
 *   • use plain ES5/ES6 — no TypeScript, no private fields, no require().
 *
 * Affected classes (all call setPlatformObject(ClassName) at module scope):
 *   DOMException, PerformanceEntry, PerformanceMark, PerformanceMeasure,
 *   PerformanceEventTiming, EventCounts, PerformanceObserver, Performance,
 *   MemoryInfo, ReactNativeStartupTiming, EventTarget, Event,
 *   DOMRect, DOMRectReadOnly, DOMRectList,
 *   HTMLCollection, NodeList, ReadOnlyNode,
 *   IntersectionObserver, IntersectionObserverEntry,
 *   MutationObserver, MutationRecord,
 *   MessageQueue (old bridge — export default class).
 */

/* ─── DOMException ───────────────────────────────────────────────────────── */
if (typeof global.DOMException === 'undefined') {
  var _domExCodes = {
    INDEX_SIZE_ERR:1, DOMSTRING_SIZE_ERR:2, HIERARCHY_REQUEST_ERR:3,
    WRONG_DOCUMENT_ERR:4, INVALID_CHARACTER_ERR:5, NO_DATA_ALLOWED_ERR:6,
    NO_MODIFICATION_ALLOWED_ERR:7, NOT_FOUND_ERR:8, NOT_SUPPORTED_ERR:9,
    INUSE_ATTRIBUTE_ERR:10, INVALID_STATE_ERR:11, SYNTAX_ERR:12,
    INVALID_MODIFICATION_ERR:13, NAMESPACE_ERR:14, INVALID_ACCESS_ERR:15,
    VALIDATION_ERR:16, TYPE_MISMATCH_ERR:17, SECURITY_ERR:18,
    NETWORK_ERR:19, ABORT_ERR:20, URL_MISMATCH_ERR:21,
    QUOTA_EXCEEDED_ERR:22, TIMEOUT_ERR:23, INVALID_NODE_TYPE_ERR:24,
    DATA_CLONE_ERR:25,
  };
  var _domExNames = {
    IndexSizeError:1, HierarchyRequestError:3, WrongDocumentError:4,
    InvalidCharacterError:5, NoModificationAllowedError:7, NotFoundError:8,
    NotSupportedError:9, InUseAttributeError:10, InvalidStateError:11,
    SyntaxError:12, InvalidModificationError:13, NamespaceError:14,
    InvalidAccessError:15, TypeMismatchError:17, SecurityError:18,
    NetworkError:19, AbortError:20, URLMismatchError:21,
    QuotaExceededError:22, TimeoutError:23, InvalidNodeTypeError:24,
    DataCloneError:25,
  };
  function DOMException(message, name) {
    if (!(this instanceof DOMException)) return new DOMException(message, name);
    this.message = message != null ? String(message) : '';
    this._domExName = name != null ? String(name) : 'Error';
    this._domExCode = _domExNames[this._domExName] || 0;
    this.stack = (new Error(this.message)).stack;
  }
  DOMException.prototype = Object.create(Error.prototype);
  DOMException.prototype.constructor = DOMException;
  Object.defineProperty(DOMException.prototype, 'name', { get: function() { return this._domExName; }, configurable: true, enumerable: true });
  Object.defineProperty(DOMException.prototype, 'code', { get: function() { return this._domExCode; }, configurable: true, enumerable: true });
  for (var _k in _domExCodes) {
    var _v = _domExCodes[_k];
    Object.defineProperty(DOMException, _k, { value: _v, writable: true, configurable: true, enumerable: true });
    Object.defineProperty(DOMException.prototype, _k, { value: _v, writable: true, configurable: true, enumerable: true });
  }
  global.DOMException = DOMException;
}

/* ─── PerformanceEntry ───────────────────────────────────────────────────── */
if (typeof global.PerformanceEntry === 'undefined') {
  function PerformanceEntry(init) {
    init = init || {};
    this._peName = init.name || '';
    this._peType = init.entryType || '';
    this._peStart = init.startTime != null ? init.startTime : 0;
    this._peDur = init.duration != null ? init.duration : 0;
  }
  Object.defineProperty(PerformanceEntry.prototype, 'name',      { get: function() { return this._peName;  }, configurable: true, enumerable: true });
  Object.defineProperty(PerformanceEntry.prototype, 'entryType', { get: function() { return this._peType;  }, configurable: true, enumerable: true });
  Object.defineProperty(PerformanceEntry.prototype, 'startTime', { get: function() { return this._peStart; }, configurable: true, enumerable: true });
  Object.defineProperty(PerformanceEntry.prototype, 'duration',  { get: function() { return this._peDur;   }, configurable: true, enumerable: true });
  PerformanceEntry.prototype.toJSON = function() {
    return { name: this._peName, entryType: this._peType, startTime: this._peStart, duration: this._peDur };
  };
  global.PerformanceEntry = PerformanceEntry;
}

/* ─── PerformanceMark ────────────────────────────────────────────────────── */
if (typeof global.PerformanceMark === 'undefined') {
  function PerformanceMark(name, opts) {
    global.PerformanceEntry.call(this, { name: name, entryType: 'mark', startTime: (opts && opts.startTime != null ? opts.startTime : 0), duration: 0 });
    this.detail = opts && opts.detail !== undefined ? opts.detail : null;
  }
  PerformanceMark.prototype = Object.create(global.PerformanceEntry.prototype);
  PerformanceMark.prototype.constructor = PerformanceMark;
  global.PerformanceMark = PerformanceMark;
}

/* ─── PerformanceMeasure ─────────────────────────────────────────────────── */
if (typeof global.PerformanceMeasure === 'undefined') {
  function PerformanceMeasure(name, init) {
    global.PerformanceEntry.call(this, { name: name, entryType: 'measure', startTime: (init && init.startTime != null ? init.startTime : 0), duration: (init && init.duration != null ? init.duration : 0) });
    this.detail = init && init.detail !== undefined ? init.detail : null;
  }
  PerformanceMeasure.prototype = Object.create(global.PerformanceEntry.prototype);
  PerformanceMeasure.prototype.constructor = PerformanceMeasure;
  global.PerformanceMeasure = PerformanceMeasure;
}

/* ─── PerformanceEventTiming ─────────────────────────────────────────────── */
if (typeof global.PerformanceEventTiming === 'undefined') {
  function PerformanceEventTiming(init) {
    global.PerformanceEntry.call(this, init || { name: '', entryType: 'event', startTime: 0, duration: 0 });
    this.processingStart = (init && init.processingStart) || 0;
    this.processingEnd   = (init && init.processingEnd)   || 0;
    this.cancelable      = (init && init.cancelable)      || false;
    this.target          = (init && init.target)          || null;
    this.interactionId   = (init && init.interactionId)   || 0;
  }
  PerformanceEventTiming.prototype = Object.create(global.PerformanceEntry.prototype);
  PerformanceEventTiming.prototype.constructor = PerformanceEventTiming;
  global.PerformanceEventTiming = PerformanceEventTiming;
}

/* ─── EventCounts ────────────────────────────────────────────────────────── */
if (typeof global.EventCounts === 'undefined') {
  function EventCounts() { this._m = Object.create(null); }
  EventCounts.prototype.get = function(k) { return this._m[k] || 0; };
  EventCounts.prototype.has = function(k) { return k in this._m; };
  Object.defineProperty(EventCounts.prototype, 'size', { get: function() { return Object.keys(this._m).length; }, configurable: true });
  global.EventCounts = EventCounts;
}

/* ─── MemoryInfo ─────────────────────────────────────────────────────────── */
if (typeof global.MemoryInfo === 'undefined') {
  function MemoryInfo() {
    this.totalJSHeapSize = 0;
    this.usedJSHeapSize  = 0;
    this.jsHeapSizeLimit = 0;
  }
  global.MemoryInfo = MemoryInfo;
}

/* ─── ReactNativeStartupTiming ───────────────────────────────────────────── */
if (typeof global.ReactNativeStartupTiming === 'undefined') {
  function ReactNativeStartupTiming() {
    this.startTime         = 0;
    this.endTime           = 0;
    this.initializeRuntimeStart = 0;
    this.initializeRuntimeEnd   = 0;
  }
  global.ReactNativeStartupTiming = ReactNativeStartupTiming;
}

/* ─── PerformanceObserver ────────────────────────────────────────────────── */
if (typeof global.PerformanceObserver === 'undefined') {
  function PerformanceObserver(cb) { this._cb = cb; this._types = []; }
  PerformanceObserver.prototype.observe     = function(o) { if (o && o.entryTypes) this._types = o.entryTypes; };
  PerformanceObserver.prototype.disconnect  = function() { this._types = []; };
  PerformanceObserver.prototype.takeRecords = function() { return []; };
  PerformanceObserver.supportedEntryTypes   = ['mark', 'measure', 'event', 'longtask', 'resource'];
  global.PerformanceObserver = PerformanceObserver;
}

/* ─── Performance (class) ────────────────────────────────────────────────── */
// Only stub the CLASS constructor; the `performance` instance (lowercase) is
// left to React Native's setUpPerformance which sets global.performance.
if (typeof global.Performance === 'undefined') {
  function Performance() {
    this.eventCounts = new global.EventCounts();
    this.memory      = null;
    this.timeOrigin  = Date.now();
  }
  Performance.prototype.now        = function() { return Date.now() - this.timeOrigin; };
  Performance.prototype.mark       = function() {};
  Performance.prototype.measure    = function() {};
  Performance.prototype.clearMarks = function() {};
  Performance.prototype.clearMeasures  = function() {};
  Performance.prototype.getEntries     = function() { return []; };
  Performance.prototype.getEntriesByName = function() { return []; };
  Performance.prototype.getEntriesByType = function() { return []; };
  global.Performance = Performance;
}

/* ─── EventTarget ────────────────────────────────────────────────────────── */
if (typeof global.EventTarget === 'undefined') {
  function EventTarget() { this._etL = Object.create(null); }
  EventTarget.prototype.addEventListener = function(type, fn) {
    if (!this._etL[type]) this._etL[type] = [];
    if (this._etL[type].indexOf(fn) === -1) this._etL[type].push(fn);
  };
  EventTarget.prototype.removeEventListener = function(type, fn) {
    var l = this._etL[type]; if (!l) return;
    var i = l.indexOf(fn); if (i !== -1) l.splice(i, 1);
  };
  EventTarget.prototype.dispatchEvent = function(ev) {
    var l = this._etL[ev && ev.type]; if (!l) return true;
    l.slice().forEach(function(f) { typeof f === 'function' ? f(ev) : (f && f.handleEvent && f.handleEvent(ev)); });
    return !(ev && ev.defaultPrevented);
  };
  global.EventTarget = EventTarget;
}

/* ─── CustomEvent ────────────────────────────────────────────────────────── */
if (typeof global.CustomEvent === 'undefined') {
  var _CEBase = typeof global.Event === 'function' ? global.Event : function Event(t) { this.type = t; };
  function CustomEvent(type, init) {
    _CEBase.call(this, type, init);
    this.detail = (init && init.detail !== undefined) ? init.detail : null;
  }
  CustomEvent.prototype = Object.create(_CEBase.prototype);
  CustomEvent.prototype.constructor = CustomEvent;
  global.CustomEvent = CustomEvent;
}

/* ─── DOMRect / DOMRectReadOnly / DOMRectList ────────────────────────────── */
if (typeof global.DOMRectReadOnly === 'undefined') {
  function DOMRectReadOnly(x, y, w, h) { this.x=x||0; this.y=y||0; this.width=w||0; this.height=h||0; }
  Object.defineProperty(DOMRectReadOnly.prototype, 'top',    { get: function() { return this.y; }, configurable: true });
  Object.defineProperty(DOMRectReadOnly.prototype, 'left',   { get: function() { return this.x; }, configurable: true });
  Object.defineProperty(DOMRectReadOnly.prototype, 'right',  { get: function() { return this.x + this.width; }, configurable: true });
  Object.defineProperty(DOMRectReadOnly.prototype, 'bottom', { get: function() { return this.y + this.height; }, configurable: true });
  DOMRectReadOnly.prototype.toJSON = function() { return { x:this.x, y:this.y, width:this.width, height:this.height, top:this.top, left:this.left, right:this.right, bottom:this.bottom }; };
  DOMRectReadOnly.fromRect = function(r) { r=r||{}; return new DOMRectReadOnly(r.x,r.y,r.width,r.height); };
  global.DOMRectReadOnly = DOMRectReadOnly;
}

if (typeof global.DOMRect === 'undefined') {
  function DOMRect(x, y, w, h) { global.DOMRectReadOnly.call(this, x, y, w, h); }
  DOMRect.prototype = Object.create(global.DOMRectReadOnly.prototype);
  DOMRect.prototype.constructor = DOMRect;
  DOMRect.fromRect = function(r) { r=r||{}; return new DOMRect(r.x,r.y,r.width,r.height); };
  global.DOMRect = DOMRect;
}

if (typeof global.DOMRectList === 'undefined') {
  function DOMRectList(rects) { this._r = rects || []; this.length = this._r.length; }
  DOMRectList.prototype.item = function(i) { return this._r[i] || null; };
  global.DOMRectList = DOMRectList;
}

/* ─── HTMLCollection / NodeList ──────────────────────────────────────────── */
if (typeof global.HTMLCollection === 'undefined') {
  function HTMLCollection(items) { this._i = items || []; this.length = this._i.length; }
  HTMLCollection.prototype.item       = function(i) { return this._i[i] || null; };
  HTMLCollection.prototype.namedItem  = function() { return null; };
  global.HTMLCollection = HTMLCollection;
}

if (typeof global.NodeList === 'undefined') {
  function NodeList(items) { this._i = items || []; this.length = this._i.length; }
  NodeList.prototype.item    = function(i) { return this._i[i] || null; };
  NodeList.prototype.forEach = function(cb) { this._i.forEach(cb); };
  NodeList.prototype[Symbol.iterator] = function() { return this._i[Symbol.iterator](); };
  global.NodeList = NodeList;
}

/* ─── ReadOnlyNode ───────────────────────────────────────────────────────── */
if (typeof global.ReadOnlyNode === 'undefined') {
  function ReadOnlyNode() { this.childNodes = new global.NodeList([]); this.parentNode = null; }
  Object.defineProperty(ReadOnlyNode.prototype, 'nodeType',   { get: function() { return 1; }, configurable: true });
  Object.defineProperty(ReadOnlyNode.prototype, 'nodeName',   { get: function() { return ''; }, configurable: true });
  Object.defineProperty(ReadOnlyNode.prototype, 'nodeValue',  { get: function() { return null; }, configurable: true });
  Object.defineProperty(ReadOnlyNode.prototype, 'textContent',{ get: function() { return ''; }, configurable: true });
  ReadOnlyNode.prototype.hasChildNodes     = function() { return false; };
  ReadOnlyNode.prototype.getRootNode       = function() { return this; };
  ReadOnlyNode.prototype.contains          = function() { return false; };
  ReadOnlyNode.prototype.compareDocumentPosition = function() { return 0; };
  global.ReadOnlyNode = ReadOnlyNode;
}

/* ─── MutationObserver / MutationRecord ──────────────────────────────────── */
if (typeof global.MutationObserver === 'undefined') {
  function MutationObserver(cb) { this._cb = cb; }
  MutationObserver.prototype.observe     = function() {};
  MutationObserver.prototype.disconnect  = function() {};
  MutationObserver.prototype.takeRecords = function() { return []; };
  global.MutationObserver = MutationObserver;
}

if (typeof global.MutationRecord === 'undefined') {
  function MutationRecord() {
    this.type = ''; this.target = null; this.addedNodes = []; this.removedNodes = [];
    this.previousSibling = null; this.nextSibling = null; this.attributeName = null;
    this.attributeNamespace = null; this.oldValue = null;
  }
  global.MutationRecord = MutationRecord;
}

/* ─── IntersectionObserver / IntersectionObserverEntry ───────────────────── */
if (typeof global.IntersectionObserver === 'undefined') {
  function IntersectionObserver(cb) { this._cb = cb; }
  IntersectionObserver.prototype.observe     = function() {};
  IntersectionObserver.prototype.unobserve   = function() {};
  IntersectionObserver.prototype.disconnect  = function() {};
  IntersectionObserver.prototype.takeRecords = function() { return []; };
  global.IntersectionObserver = IntersectionObserver;
}

if (typeof global.IntersectionObserverEntry === 'undefined') {
  function IntersectionObserverEntry(init) {
    init = init || {};
    this.time = init.time || 0; this.rootBounds = init.rootBounds || null;
    this.boundingClientRect = init.boundingClientRect || null;
    this.intersectionRect = init.intersectionRect || null;
    this.isIntersecting = init.isIntersecting || false;
    this.intersectionRatio = init.intersectionRatio || 0;
    this.target = init.target || null;
  }
  global.IntersectionObserverEntry = IntersectionObserverEntry;
}

/* ─── MessageQueue ───────────────────────────────────────────────────────── */
// The old React Native bridge class. With the Babel loose-mode bug, the
// `export default MessageQueue` statement at the end of MessageQueue.js
// becomes a global lookup. This stub lets that lookup succeed; the real
// MessageQueue module overrides it once its factory runs successfully.
if (typeof global.MessageQueue === 'undefined') {
  function MessageQueue() {
    this._lazyCallableModules = {};
    this._queue = [[], [], [], 0];
    this._successCallbacks = new Map();
    this._failureCallbacks = new Map();
    this._callID = 0;
    this._lastFlush = 0;
    this._eventLoopStartTime = Date.now();
    this._reactNativeMicrotasksCallback = null;
  }
  MessageQueue.prototype.callFunctionReturnFlushedQueue = function() { return this._queue; };
  MessageQueue.prototype.callFunctionReturnResultAndFlushedQueue = function() { return [undefined, this._queue]; };
  MessageQueue.prototype.flushedQueue = function() { return this._queue; };
  MessageQueue.prototype.invokeCallbackAndReturnFlushedQueue = function() { return this._queue; };
  MessageQueue.prototype.registerCallableModule  = function() {};
  MessageQueue.prototype.registerLazyCallableModule = function(name, factory) {
    this._lazyCallableModules[name] = factory;
  };
  MessageQueue.prototype.getCallableModule = function(name) {
    var factory = this._lazyCallableModules[name];
    return factory ? factory() : null;
  };
  global.MessageQueue = MessageQueue;
}

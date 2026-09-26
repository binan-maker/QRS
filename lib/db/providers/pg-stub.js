// Universal empty stub for server-only and unsupported Node.js packages in React Native / Hermes
const noop = () => {};
const emptyObject = {};

const stubProxy = new Proxy(noop, {
  get: (_target, prop) => {
    if (prop === "__esModule") return true;
    if (prop === "default") return stubProxy;
    if (prop === Symbol.toPrimitive) return () => "";
    if (prop === "toString") return () => "[StubModule]";
    return stubProxy;
  },
  apply: () => emptyObject,
  construct: () => emptyObject,
});

module.exports = stubProxy;
module.exports.default = stubProxy;

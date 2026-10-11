const fs = require("fs");
const path = require("path");

const root = __dirname;
const bunNodeModules = path.join(root, "node_modules/.bun/node_modules");

if (!fs.existsSync(bunNodeModules)) {
  process.exit(0);
}

// 1. Symlink top-level packages if missing from node_modules
const topLevelPackages = ["buffer"];
for (const pkg of topLevelPackages) {
  const target = path.join(bunNodeModules, pkg);
  const link = path.join(root, "node_modules", pkg);
  if (fs.existsSync(target) && !fs.existsSync(link)) {
    try {
      fs.symlinkSync(target, link);
    } catch {}
  }
}

// 2. Symlink @babel scoped packages if missing
const babelPackages = [
  "@babel/plugin-transform-class-properties",
  "@babel/plugin-transform-private-methods",
  "@babel/plugin-transform-private-property-in-object",
];
const babelDir = path.join(root, "node_modules/@babel");
if (fs.existsSync(babelDir)) {
  for (const pkg of babelPackages) {
    const shortName = pkg.replace("@babel/", "");
    const target = path.join(bunNodeModules, pkg);
    const link = path.join(babelDir, shortName);
    if (fs.existsSync(target) && !fs.existsSync(link)) {
      try {
        fs.symlinkSync(target, link);
      } catch {}
    }
  }
}

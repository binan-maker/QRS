const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true">
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </base-config>

  <domain-config cleartextTrafficPermitted="true">
    <domain includeSubdomains="true">localhost</domain>
    <domain includeSubdomains="true">127.0.0.1</domain>
    <domain includeSubdomains="true">10.0.2.2</domain>
    <domain includeSubdomains="true">10.0.3.2</domain>
    <domain includeSubdomains="true">replit.dev</domain>
    <domain includeSubdomains="true">replit.app</domain>
    <domain includeSubdomains="true">replit.co</domain>
  </domain-config>

  <debug-overrides>
    <trust-anchors>
      <certificates src="system" />
      <certificates src="user" />
    </trust-anchors>
  </debug-overrides>
</network-security-config>
`;

function withAndroidNetworkSecurity(config) {
  config = withDangerousMod(config, [
    "android",
    async (cfg) => {
      const xmlDir = path.join(
        cfg.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml"
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, "network_security_config.xml"),
        NETWORK_SECURITY_CONFIG_XML,
        "utf8"
      );
      return cfg;
    },
  ]);

  config = withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;
    if (!manifest.application) manifest.application = [{}];
    const application = manifest.application[0];
    if (!application.$) application.$ = {};
    application.$["android:networkSecurityConfig"] =
      "@xml/network_security_config";
    application.$["android:usesCleartextTraffic"] = "true";
    return cfg;
  });

  return config;
}

module.exports = withAndroidNetworkSecurity;

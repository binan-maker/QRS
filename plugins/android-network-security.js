const { withAndroidManifest, withDangerousMod } = require("@expo/config-plugins");
const fs = require("fs");
const path = require("path");

const NETWORK_SECURITY_CONFIG_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <!--
    Cleartext (HTTP) traffic is completely blocked.
    Only HTTPS connections are allowed.
  -->
  <base-config cleartextTrafficPermitted="false">
    <trust-anchors>
      <!-- Trust only system-installed CAs, not user-installed ones.
           This blocks MITM attacks using rogue certificates installed
           by the attacker on the device's user store. -->
      <certificates src="system" />
    </trust-anchors>
  </base-config>

  <!--
    Debug-only override: allow cleartext on localhost for Metro
    bundler and development server connections.
  -->
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
    return cfg;
  });

  return config;
}

module.exports = withAndroidNetworkSecurity;

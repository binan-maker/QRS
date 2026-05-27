import type { QrSchema } from "../types";

export const wifiSchema: QrSchema = {
  key: "wifi",
  label: "Wi-Fi Network",
  icon: "wifi-outline",
  category: "utility",
  description: "Auto-connect to a Wi-Fi network on scan",
  primaryField: {
    key: "ssid",
    label: "Network Name (SSID)",
    placeholder: "MyHomeNetwork",
    type: "text",
    required: true,
    hint: "The exact name of your Wi-Fi network",
  },
  extraFields: [
    {
      key: "password",
      label: "Password",
      placeholder: "Wi-Fi password",
      type: "password",
      maxLength: 63,
    },
    {
      key: "encryption",
      label: "Security Type",
      placeholder: "WPA",
      type: "select",
      optional: true,
      options: [
        { label: "WPA / WPA2", value: "WPA" },
        { label: "WEP", value: "WEP" },
        { label: "None (Open)", value: "nopass" },
      ],
    },
    {
      key: "hidden",
      label: "Hidden Network",
      placeholder: "false",
      type: "toggle",
      optional: true,
    },
  ],
  build: (v, extra) => {
    const password = extra.password?.trim() ?? "";
    const enc = (extra.encryption?.trim().toUpperCase() || "WPA");
    const hidden = extra.hidden === "true" ? "true" : "false";
    return `WIFI:T:${enc};S:${v};P:${password};H:${hidden};;`;
  },
  validate: (v) => {
    if (!v.trim()) return "Please enter the Wi-Fi network name (SSID).";
    return null;
  },
};

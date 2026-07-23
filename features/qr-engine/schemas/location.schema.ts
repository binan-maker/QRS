import type { QrSchema } from "../types";
import { EXTERNAL } from "@/config/app";

export const locationSchema: QrSchema = {
  key: "location",
  label: "Location / Map",
  icon: "location-outline",
  category: "location",
  description: "Open a specific location in Google Maps or any map app",
  primaryField: {
    key: "query",
    label: "Location Name or Address",
    placeholder: "Taj Mahal, Agra, India",
    type: "text",
    required: true,
    hint: "Enter an address, landmark, or 'lat,lng' coordinates",
  },
  extraFields: [
    {
      key: "lat",
      label: "Latitude (optional, for precise location)",
      placeholder: "27.1751",
      type: "number",
      optional: true,
    },
    {
      key: "lng",
      label: "Longitude (optional)",
      placeholder: "78.0421",
      type: "number",
      optional: true,
    },
  ],
  build: (v, extra) => {
    const lat = extra.lat?.trim() ?? "";
    const lng = extra.lng?.trim() ?? "";
    if (lat && lng) return `geo:${lat},${lng}?q=${encodeURIComponent(v)}`;
    return `${EXTERNAL.GOOGLE_MAPS}${encodeURIComponent(v)}`;
  },
  validate: (v) => {
    if (!v.trim()) return "Please enter a location name or address.";
    return null;
  },
};

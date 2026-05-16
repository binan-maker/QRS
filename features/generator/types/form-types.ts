export type QrMode = "individual" | "business" | "private";

export type LogoPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export const LOGO_POSITIONS: { key: LogoPosition; label: string }[] = [
  { key: "center",       label: "Center"     },
  { key: "top-left",     label: "Top Left"   },
  { key: "top-right",    label: "Top Right"  },
  { key: "bottom-left",  label: "Bot. Left"  },
  { key: "bottom-right", label: "Bot. Right" },
];

export const FORM_MODE_META: Record<"individual" | "private" | "business", { label: string; color: string }> = {
  individual: { label: "Standard",  color: "#3B82F6" },
  private:    { label: "Private",   color: "#64748B" },
  business:   { label: "Business",  color: "#F59E0B" },
};

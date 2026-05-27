import type { QrSchema } from "../types";

export const emailSchema: QrSchema = {
  key: "email",
  label: "Email",
  icon: "mail-outline",
  category: "communication",
  description: "Open email app with pre-filled recipient and subject",
  primaryField: {
    key: "address",
    label: "Email Address",
    placeholder: "recipient@example.com",
    type: "email",
    required: true,
  },
  extraFields: [
    {
      key: "subject",
      label: "Subject",
      placeholder: "Hello!",
      type: "text",
      optional: true,
    },
    {
      key: "body",
      label: "Message Body",
      placeholder: "Write your message here…",
      type: "textarea",
      optional: true,
    },
  ],
  build: (v, extra) => {
    const subject = extra.subject?.trim() ?? "";
    const body = extra.body?.trim() ?? "";
    let uri = `mailto:${v}`;
    const params: string[] = [];
    if (subject) params.push(`subject=${encodeURIComponent(subject)}`);
    if (body) params.push(`body=${encodeURIComponent(body)}`);
    if (params.length) uri += `?${params.join("&")}`;
    return uri;
  },
  validate: (v) => {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v))
      return "Invalid email address (e.g. name@example.com).";
    return null;
  },
};

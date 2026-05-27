import type { QrSchema } from "../types";

export const contactSchema: QrSchema = {
  key: "contact",
  label: "Contact Card",
  icon: "person-circle-outline",
  category: "utility",
  description: "Share contact details — scanners can save directly to their address book",
  primaryField: {
    key: "name",
    label: "Full Name",
    placeholder: "John Smith",
    type: "text",
    required: true,
  },
  extraFields: [
    {
      key: "phone",
      label: "Phone Number",
      placeholder: "+91 98765 43210",
      type: "phone",
      required: true,
    },
    {
      key: "email",
      label: "Email Address",
      placeholder: "john@example.com",
      type: "email",
      optional: true,
    },
    {
      key: "org",
      label: "Organisation / Company",
      placeholder: "Acme Corp",
      type: "text",
      optional: true,
    },
    {
      key: "title",
      label: "Job Title",
      placeholder: "Software Engineer",
      type: "text",
      optional: true,
    },
    {
      key: "url",
      label: "Website",
      placeholder: "https://example.com",
      type: "url",
      optional: true,
    },
    {
      key: "address",
      label: "Address",
      placeholder: "123 Main St, City",
      type: "text",
      optional: true,
    },
  ],
  build: (v, extra) => {
    const phone = extra.phone?.trim() ?? "";
    const email = extra.email?.trim() ?? "";
    const org = extra.org?.trim() ?? "";
    const title = extra.title?.trim() ?? "";
    const url = extra.url?.trim() ?? "";
    const address = extra.address?.trim() ?? "";
    let vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${v}\nN:${v};;;;\n`;
    if (phone) vcard += `TEL;TYPE=CELL:${phone}\n`;
    if (email) vcard += `EMAIL;TYPE=INTERNET:${email}\n`;
    if (org) vcard += `ORG:${org}\n`;
    if (title) vcard += `TITLE:${title}\n`;
    if (url) vcard += `URL:${url}\n`;
    if (address) vcard += `ADR:;;${address};;;;\n`;
    vcard += `END:VCARD`;
    return vcard;
  },
  validate: (_v, extra) => {
    if (!extra.phone?.trim()) return "Please enter at least a phone number.";
    return null;
  },
};

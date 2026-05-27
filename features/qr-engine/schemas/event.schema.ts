import type { QrSchema } from "../types";

export const eventSchema: QrSchema = {
  key: "event",
  label: "Calendar Event",
  icon: "calendar-outline",
  category: "utility",
  description: "Add an event directly to the scanner's calendar",
  primaryField: {
    key: "summary",
    label: "Event Title",
    placeholder: "Team Meeting",
    type: "text",
    required: true,
  },
  extraFields: [
    {
      key: "start",
      label: "Start Date/Time (YYYYMMDDTHHMMSS)",
      placeholder: "20250101T090000",
      type: "text",
      required: true,
    },
    {
      key: "end",
      label: "End Date/Time (YYYYMMDDTHHMMSS)",
      placeholder: "20250101T100000",
      type: "text",
      optional: true,
    },
    {
      key: "location",
      label: "Location",
      placeholder: "123 Main St, City",
      type: "text",
      optional: true,
    },
    {
      key: "description",
      label: "Description",
      placeholder: "Meeting details…",
      type: "textarea",
      optional: true,
    },
  ],
  build: (v, extra) => {
    const start = extra.start?.trim() ?? "";
    const end = extra.end?.trim() ?? start;
    const location = extra.location?.trim() ?? "";
    const description = extra.description?.trim() ?? "";
    let cal = `BEGIN:VCALENDAR\nVERSION:2.0\nBEGIN:VEVENT\nSUMMARY:${v}\n`;
    if (start) cal += `DTSTART:${start}\n`;
    if (end) cal += `DTEND:${end}\n`;
    if (location) cal += `LOCATION:${location}\n`;
    if (description) cal += `DESCRIPTION:${description}\n`;
    cal += `END:VEVENT\nEND:VCALENDAR`;
    return cal;
  },
  validate: (_v, extra) => {
    if (!extra.start?.trim()) return "Please enter a start date/time.";
    return null;
  },
};

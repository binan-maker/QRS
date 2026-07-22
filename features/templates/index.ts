/**
 * features/templates — public API
 *
 * Only export what external consumers genuinely need.
 * Keep this list short; internals stay internal.
 */
export {
  TEMPLATE_CONTENT_TYPE_MAP,
  getContentTypeForTemplate,
  type TemplateId,
} from "./content-meta";

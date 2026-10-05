import { formatFirstName } from "@/shared/utils/formatters/names";

export function getFirstName(name: string): string {
  return formatFirstName(name);
}

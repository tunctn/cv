import type { TemplateDef } from "../engine";
import { academic } from "./academic";
import { ats } from "./ats";
import { classic } from "./classic";
import { clinical } from "./clinical";
import { collegiate } from "./collegiate";
import { compact } from "./compact";
import { editorial } from "./editorial";
import { elegant } from "./elegant";
import { europa } from "./europa";
import { executive } from "./executive";
import { finance } from "./finance";
import { graduate } from "./graduate";
import { minimal } from "./minimal";
import { modern } from "./modern";
import { nordic } from "./nordic";
import { portfolio } from "./portfolio";
import { skillbar } from "./skillbar";
import { startup } from "./startup";
import { studio } from "./studio";
import { swiss } from "./swiss";
import { teacher } from "./teacher";
import { tech } from "./tech";
import { terminal } from "./terminal";
import { timeline } from "./timeline";
import { twoTone } from "./two-tone";

export const TEMPLATES: TemplateDef[] = [
  classic,
  modern,
  studio,
  compact,
  minimal,
  editorial,
  collegiate,
  academic,
  executive,
  ats,
  nordic,
  finance,
  clinical,
  teacher,
  graduate,
  europa,
  skillbar,
  startup,
  portfolio,
  timeline,
  twoTone,
  swiss,
  terminal,
  elegant,
  tech,
];

export type TemplateId = string;

export const TEMPLATE_IDS = TEMPLATES.map((t) => t.id) as [string, ...string[]];

/** Template ids that were renamed, so older CVs keep their look. */
const RENAMED: Record<string, string> = { harvard: "collegiate" };

export function getTemplate(id: string): TemplateDef {
  const want = RENAMED[id] ?? id;
  return TEMPLATES.find((t) => t.id === want) ?? TEMPLATES[0];
}

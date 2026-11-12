// Build-time only: the example certificate shown on the website
import { writeFileSync } from "node:fs";
import { chartHtml } from "../../waris-geneology-v2/lib/chart";
import { FamilyGraph } from "../../waris-geneology-v2/lib/graph";
import { layoutTree } from "../../waris-geneology-v2/lib/layout";
import { demoSnapshot } from "./demo";
const g = new FamilyGraph(demoSnapshot());
const l = layoutTree(g, "ismail", { up: 0, down: 3, showAdd: false })!;
const life = (p: { living: boolean; birthDate?: string; deathDate?: string }) => (p.living ? `${p.birthDate}–Masih hidup` : `${p.birthDate}–${p.deathDate}`);
writeFileSync(process.argv[2], chartHtml(l, "a4", { kicker: "SIJIL SALASILAH", title: "Keturunan Haji Ismail bin Daud", subtitle: "Keluarga contoh", footer: "12 orang · 4 generasi", life, deceased: "Meninggal dunia" }));

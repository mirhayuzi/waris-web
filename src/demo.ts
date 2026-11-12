import type { FamilySnapshot, LinkKind, Person, Sex } from "../../waris-geneology-v2/lib/model";

/**
 * A made-up family for the website and the "try an example" button. No real people.
 *
 *   Haji Ismail bin Daud = Hajah Fatimah binti Omar
 *        |
 *   Rahman = Zaleha     Aminah = Kamal     Yusof
 *      |                   |
 *   Aiman, Nurul Huda    Sofea, Hakim
 *      |
 *   Adam
 */
export function demoSnapshot(): FamilySnapshot {
  const t = "2026-01-01T00:00:00.000Z";
  const persons: Person[] = [];
  const P = (id: string, givenName: string, sex: Sex, fatherName: string | undefined, birthDate?: string, living = true, prefix?: string, deathDate?: string) =>
    persons.push({ id, givenName, sex, fatherName, birthDate, deathDate, living, prefix, createdAt: t, updatedAt: t });
  P("ismail", "Ismail", "male", "Daud", "1938", false, "Haji", "2009");
  P("fatimah", "Fatimah", "female", "Omar", "1942", false, "Hajah", "2015");
  P("rahman", "Rahman", "male", "Ismail", "1964");
  P("zaleha", "Zaleha", "female", "Ahmad", "1967");
  P("aminah", "Aminah", "female", "Ismail", "1968");
  P("kamal", "Kamal", "male", "Hassan", "1965");
  P("yusof", "Yusof", "male", "Ismail", "1972");
  P("aiman", "Aiman", "male", "Rahman", "1990");
  P("huda", "Nurul Huda", "female", "Rahman", "1993");
  P("sofea", "Sofea", "female", "Kamal", "1995");
  P("hakim", "Hakim", "male", "Kamal", "1998");
  P("adam", "Adam", "male", "Aiman", "2019");
  const links: FamilySnapshot["links"] = [];
  const L = (parentId: string, childId: string, kind: LinkKind = "birth") => links.push({ id: `${parentId}>${childId}`, parentId, childId, kind });
  for (const k of ["rahman", "aminah", "yusof"]) {
    L("ismail", k);
    L("fatimah", k);
  }
  for (const k of ["aiman", "huda"]) {
    L("rahman", k);
    L("zaleha", k);
  }
  for (const k of ["sofea", "hakim"]) {
    L("kamal", k);
    L("aminah", k);
  }
  L("aiman", "adam");
  const U = (a: string, b: string, i: number) => ({ id: `u-${a}`, partnerA: a, partnerB: b, status: "married" as const, sortOrder: i });
  const unions = [U("ismail", "fatimah", 0), U("rahman", "zaleha", 0), U("kamal", "aminah", 0)];
  return { persons, unions, links, familyName: "Keluarga Haji Ismail (contoh)", homePersonId: "aiman" } as FamilySnapshot;
}

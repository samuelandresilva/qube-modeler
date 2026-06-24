import type { QbmFile, QbmFlywayVersion } from "./qbm-file";

export function hasFlywayVersions(qbmFile: QbmFile): boolean {
  return qbmFile.flyway.versions.length > 0;
}

export function getFlywayVersions(qbmFile: QbmFile): QbmFlywayVersion[] {
  return qbmFile.flyway.versions;
}

export function getLastFlywayVersion(qbmFile: QbmFile): QbmFlywayVersion | null {
  const versions = qbmFile.flyway.versions;
  return versions.length > 0 ? versions[versions.length - 1] : null;
}

export function getLastFlywayVersionLabel(qbmFile: QbmFile): string | null {
  const lastVersion = getLastFlywayVersion(qbmFile);
  return lastVersion ? lastVersion.fileName : null;
}

export function buildFlywayFileName(version: string, description: string): string {
  let cleanDescription = description
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_");

  if (!cleanDescription) {
    cleanDescription = "migration";
  }

  // O padrão do Flyway usa 'V' seguido da versão, dois underscores '__' e a descrição
  return `V${version}__${cleanDescription}.sql`;
}

export function buildFlywayVersionSql(version: QbmFlywayVersion): string {
  const parts: string[] = [];

  const beforeScripts = (version.manualScripts || [])
    .filter((s) => s.sql && s.sql.trim() !== "" && s.execution === "before")
    .sort((a, b) => a.order - b.order);

  if (beforeScripts.length > 0) {
    for (const s of beforeScripts) {
      parts.push(`-- --- BEGIN BEFORE MANUAL SCRIPT: ${s.name} ---`);
      parts.push(s.sql);
      parts.push(`-- --- END BEFORE MANUAL SCRIPT: ${s.name} ---`);
      parts.push("");
    }
  }

  parts.push(version.generatedSql);

  const afterScripts = (version.manualScripts || [])
    .filter((s) => s.sql && s.sql.trim() !== "" && s.execution === "after")
    .sort((a, b) => a.order - b.order);

  if (afterScripts.length > 0) {
    parts.push("");
    for (const s of afterScripts) {
      parts.push(`-- --- BEGIN AFTER MANUAL SCRIPT: ${s.name} ---`);
      parts.push(s.sql);
      parts.push(`-- --- END AFTER MANUAL SCRIPT: ${s.name} ---`);
      parts.push("");
    }
    if (parts[parts.length - 1] === "") {
      parts.pop();
    }
  }

  return parts.join("\n");
}

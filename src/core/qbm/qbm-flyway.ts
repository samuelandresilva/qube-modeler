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

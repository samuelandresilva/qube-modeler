export type CanvasDialogState =
  | { kind: "schema"; schemaId?: string }
  | { kind: "sequence"; schemaId: string; sequenceId?: string }
  | { kind: "column"; columnId?: string }
  | { kind: "foreign-key"; foreignKeyId?: string }
  | { kind: "unique-constraint"; constraintId?: string }
  | { kind: "check-constraint"; constraintId?: string }
  | { kind: "index"; indexId?: string }
  | null;

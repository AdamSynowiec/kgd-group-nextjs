import type { ComponentType } from "react";
import type { FieldType } from "@/lib/fieldType";
import type { FieldEditorProps } from "./types";
import StringEditor from "./StringEditor";
import BooleanEditor from "./BooleanEditor";
import NumberEditor from "./NumberEditor";
import TableEditor from "./TableEditor";
import AssetEditor from "./AssetEditor";

/**
 * JEDYNE miejsce, które łączy field.type z komponentem edytora. Panel
 * (EditableField.tsx) robi wyłącznie `fieldEditors[node.type]` — żadnego
 * sprawdzania nazwy pola, żadnego zgadywania z typeof(value). Nowy typ w
 * przyszłości (richtext/date/relation/select/media/json) to jeden nowy wpis
 * tutaj plus nowy plik edytora — reszta panelu się nie zmienia.
 */
export const fieldEditors: Record<FieldType, ComponentType<FieldEditorProps>> = {
  string: StringEditor,
  bool: BooleanEditor,
  number: NumberEditor,
  table: TableEditor,
  asset: AssetEditor,
};

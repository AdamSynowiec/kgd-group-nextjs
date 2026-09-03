import { unwrap, type EditableValue } from "@/lib/editable";
import PriceHistoryTable, { type PriceHistoryColumn, type PriceHistoryRow } from "@/components/shared/PriceHistoryTable";

type PriceHistoryFields = {
  columns?: EditableValue<PriceHistoryColumn[]> | PriceHistoryColumn[];
  rows?: EditableValue<PriceHistoryRow[]> | PriceHistoryRow[];
  exportFileName?: EditableValue<string> | string;
};

export default function PriceHistory({ fields }: { fields: PriceHistoryFields }) {
  const columns = unwrap(fields.columns) ?? [];
  const rows = unwrap(fields.rows) ?? [];
  const exportFileName = unwrap(fields.exportFileName) || "pod-stokiem-apartamenty-historia-cen.xlsx";

  return (
    <section className="pt-[150px] pb-[100px] px-4">
      <PriceHistoryTable columns={columns} rows={rows} exportFileName={exportFileName} />
    </section>
  );
}

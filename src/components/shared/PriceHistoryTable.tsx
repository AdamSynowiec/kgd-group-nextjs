"use client";

export type PriceHistoryColumn = { key: string; label: string };
export type PriceHistoryRow = Record<string, string | number>;

/**
 * Ustawowy rejestr cen — współdzielony przez wszystkie inwestycje (ten sam
 * komponent renderował go stary projekt w src/components/shared/PriceHistoryTable.jsx).
 * W przeciwieństwie do oryginału nie pobiera danych z zewnętrznego API —
 * `columns`/`rows` przychodzą jako statyczne dane z pól sekcji (baza danych).
 */
export default function PriceHistoryTable({
  columns,
  rows,
  exportFileName,
}: {
  columns: PriceHistoryColumn[];
  rows: PriceHistoryRow[];
  exportFileName: string;
}) {
  const handleExportXLSX = async () => {
    const XLSX = await import("xlsx");
    const { saveAs } = await import("file-saver");

    const exportData = rows.map((row) => {
      const clean: Record<string, string | number> = {};
      columns.forEach((col) => {
        clean[col.label] = row[col.key] ?? "-";
      });
      return clean;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Dane");

    const buffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

    saveAs(blob, exportFileName);
  };

  return (
    <div>
      <div className="overflow-auto border border-gray-300 bg-white">
        <table className="text-sm border-collapse min-w-[1200px]">
          <thead className="sticky top-0 z-20 bg-gray-100">
            <tr>
              <th className="sticky left-0 z-30 bg-gray-200 border border-gray-300 px-3 py-2 text-center w-12">#</th>
              {columns.map((col) => (
                <th key={col.key} className="border border-gray-300 px-4 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-blue-50 odd:bg-white even:bg-gray-50">
                <td className="sticky left-0 bg-gray-100 border border-gray-300 text-center font-medium text-gray-500">{i + 1}</td>
                {columns.map((col) => (
                  <td key={col.key} className="border border-gray-200 px-3 py-2 align-top whitespace-nowrap">
                    {row[col.key] ?? "-"}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleExportXLSX}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md cursor-pointer"
        >
          Pobierz raport
        </button>
      </div>
    </div>
  );
}

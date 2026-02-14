import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useDropzone } from "react-dropzone";

export default function UploadExcel() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);

  /* =========================================
     HELPERS
  ========================================= */

  const safe = (n) => Number(n || 0).toFixed(2);

  const recalculate = (row) => {
    const total = Number(row.totalReceived || 0);
    const percent = Number(row.commissionPercent || 1);

    const commission = (total * percent) / 100;
    const gst = commission * 0.18;

    return {
      ...row,
      commissionAmount: commission,
      gstAmount: gst,
      netIncome: commission - gst,
      returnAmount: total - commission
    };
  };

  /* =========================================
     DRAG & DROP
  ========================================= */

  const onDrop = (acceptedFiles) => {
    if (acceptedFiles.length) {
      setFile(acceptedFiles[0]);
      toast.success("Excel selected");
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [],
      "application/vnd.ms-excel": []
    }
  });

  /* =========================================
     EDIT TABLE
  ========================================= */

  const handleEdit = (index, field, value) => {
    const updated = [...preview];
    updated[index][field] = value;
    updated[index] = recalculate(updated[index]);
    setPreview(updated);
  };

  /* =========================================
     PREVIEW EXCEL
  ========================================= */

  const handlePreview = async () => {
    if (!file) return toast.error("Select Excel file");

    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);
    setProgress(0);

    try {
      const res = await axios.post(
        "/transactions/preview-excel",
        formData,
        {
          onUploadProgress: (event) => {
            const percent = Math.round(
              (event.loaded * 100) / event.total
            );
            setProgress(percent);
          }
        }
      );

      setPreview(res.data.preview || []);
      toast.success("Preview loaded");
      setProgress(0);
    } catch (err) {
      toast.error(err.response?.data?.message || "Preview failed");
    }

    setLoading(false);
  };

  /* =========================================
     CONFIRM IMPORT
  ========================================= */

  const handleConfirm = async () => {
    try {
      await axios.post("/transactions/confirm-excel", {
        transactions: preview
      });

      toast.success("Imported successfully");

      setPreview([]);
      setFile(null);
      setProgress(0);
    } catch {
      toast.error("Import failed");
    }
  };

  /* =========================================
     SUMMARY TOTALS
  ========================================= */

  const totals = preview.reduce(
    (acc, row) => {
      acc.total += Number(row.totalReceived || 0);
      acc.commission += Number(row.commissionAmount || 0);
      acc.gst += Number(row.gstAmount || 0);
      acc.net += Number(row.netIncome || 0);
      return acc;
    },
    { total: 0, commission: 0, gst: 0, net: 0 }
  );

  /* =========================================
     UI
  ========================================= */

  return (
    <div className="space-y-6 text-slate-300">

      <h1 className="text-3xl font-bold text-white">
        Upload Excel (Preview Mode)
      </h1>

      {/* Upload Box */}
      <div className="bg-[#1e293b]/80 rounded-xl border border-slate-700/50 p-6">

        <div
          {...getRootProps()}
          className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-indigo-500 transition"
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-indigo-400">Drop Excel here...</p>
          ) : (
            <p className="text-slate-400">
              Drag & Drop Excel OR Click to Select
            </p>
          )}
        </div>

        {file && (
          <div className="mt-3 flex items-center gap-3">
            <p className="text-sm text-emerald-400">
              Selected: {file.name}
            </p>

            <button
              onClick={() => {
                setFile(null);
                setPreview([]);
              }}
              className="text-xs text-red-400"
            >
              Remove
            </button>
          </div>
        )}

        {/* Progress */}
        {progress > 0 && (
          <div className="w-full bg-slate-700 rounded-full h-3 mt-4">
            <div
              className="bg-indigo-600 h-3 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        <button
          onClick={handlePreview}
          disabled={loading}
          className="mt-4 bg-indigo-600 px-4 py-2 rounded text-white disabled:opacity-50"
        >
          {loading ? "Loading..." : "Preview Data"}
        </button>
      </div>

      {/* Preview Table */}
      {preview.length > 0 && (
        <div className="bg-[#1e293b]/80 rounded-xl border border-slate-700/50 overflow-hidden">

          <div className="p-4 border-b border-slate-700">
            <h2 className="text-xl font-bold text-white">
              Preview ({preview.length} rows)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800">
                <tr>
                  {["Date","Total","%","Commission","GST","Net"].map(h=>(
                    <th key={h} className="px-4 py-2 text-xs text-slate-400">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {preview.map((p,i)=>(
                  <tr key={i} className="hover:bg-slate-700/30">

                    <td className="px-4 py-2">{p.date}</td>

                    <td className="px-4 py-2">
                      <input
                        value={p.totalReceived}
                        onChange={(e)=>handleEdit(i,"totalReceived",e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 w-24 text-white"
                      />
                    </td>

                    <td className="px-4 py-2">
                      <input
                        value={p.commissionPercent}
                        onChange={(e)=>handleEdit(i,"commissionPercent",e.target.value)}
                        className="bg-slate-800 border border-slate-600 rounded px-2 py-1 w-16 text-white"
                      />
                    </td>

                    <td className="px-4 py-2 text-blue-400">{safe(p.commissionAmount)}</td>
                    <td className="px-4 py-2 text-red-400">{safe(p.gstAmount)}</td>
                    <td className="px-4 py-2 text-emerald-400">{safe(p.netIncome)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="p-4 bg-slate-800 text-sm border-t border-slate-700">
            Total: ₹{safe(totals.total)} | Commission: ₹{safe(totals.commission)} | GST: ₹{safe(totals.gst)} | Net: ₹{safe(totals.net)}
          </div>

          <div className="p-4 border-t border-slate-700">
            <button
              onClick={handleConfirm}
              className="bg-emerald-600 hover:bg-emerald-500 px-4 py-2 rounded text-white"
            >
              Confirm Import
            </button>
          </div>

        </div>
      )}
    </div>
  );
}

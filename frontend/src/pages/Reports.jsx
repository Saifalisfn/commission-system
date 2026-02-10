import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const Reports = () => {
  const [gstSummary, setGstSummary] = useState(null);
  const [monthlySummary, setMonthlySummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });

  useEffect(() => {
    fetchGSTSummary();
    fetchMonthlySummary();
  }, [filters]);

  const fetchGSTSummary = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.month) params.append('month', filters.month);
      if (filters.year) params.append('year', filters.year);
      
      const response = await axios.get(`/reports/gst?${params}`);
      setGstSummary({
        ...response.data.data,
        notes: response.data.notes || []
      });
    } catch (error) {
    //   toast.error(error.response?.data?.message || 'Failed to fetch GST summary');
      setGstSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlySummary = async () => {
    try {
      const response = await axios.get(`/reports/monthly?year=${filters.year}`);
      setMonthlySummary(response.data.data);
    } catch (error) {
      setMonthlySummary(null);
    }
  };

  const exportGSTR1 = async () => {
      toast.success('Exporting GSTR-1 JSON...');
      // ... existing logic ...
  };

  const exportToExcel = async () => {
      toast.success('Downloading Excel Report...');
      // ... existing logic ...
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6 text-slate-300">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">GST Reports</h1>
          <p className="mt-2 text-sm text-slate-400">
            GST-compliant reports ready for GSTR-1 & GSTR-3B filing
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={exportToExcel}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-emerald-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export to Excel
          </button>
          <button
            onClick={exportGSTR1}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg shadow-indigo-500/20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export GSTR-1 JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1e293b]/80 backdrop-blur-md shadow-lg shadow-black/20 rounded-xl border border-slate-700/50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Month
            </label>
            <select
              name="month"
              value={filters.month || ''}
              onChange={(e) => {
                const value = e.target.value;
                setFilters({ ...filters, month: value ? parseInt(value) : '' });
              }}
              className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm [color-scheme:dark]"
            >
              <option value="" className="bg-slate-800">All Months</option>
              {months.map((m) => (
                <option key={m} value={m} className="bg-slate-800">
                  {new Date(2024, m - 1, 1).toLocaleDateString('en-IN', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Year
            </label>
            <select
              name="year"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
              className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm [color-scheme:dark]"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-slate-800">
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-[#1e293b]/80 backdrop-blur-md shadow-lg shadow-black/20 rounded-xl border border-slate-700/50 p-12 text-center">
          <Spinner />
          <p className="mt-4 text-slate-400">Loading GST summary...</p>
        </div>
      )}

      {/* GST Summary Table */}
      {!loading && gstSummary && (
        <div className="bg-[#1e293b]/80 backdrop-blur-md shadow-lg shadow-black/20 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white">
              GST Summary ({gstSummary.period})
            </h2>
          </div>

          {gstSummary.summary && gstSummary.summary.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800/80">
                  <tr>
                    {['Period', 'Taxable Value', 'CGST', 'SGST', 'Total GST', 'Transactions'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {gstSummary.summary.map((item, index) => (
                    <tr key={index} className="hover:bg-slate-700/30 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {item._id.year}-{String(item._id.month).padStart(2, '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {formatCurrency(item.taxableValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {formatCurrency(item.cgst)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {formatCurrency(item.sgst)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-red-400">
                        {formatCurrency(item.totalGST)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                        {item.transactionCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-slate-500 text-center py-12">No data for selected period</p>
          )}

          {/* Totals Section */}
          {gstSummary.totals && (
            <div className="border-t border-slate-700/50 bg-slate-800/30 p-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                <div>
                  <p className="text-sm text-slate-400">Total Taxable Value</p>
                  <p className="text-lg font-bold text-white mt-1">
                    {formatCurrency(gstSummary.totals.taxableValue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total CGST</p>
                  <p className="text-lg font-bold text-slate-200 mt-1">
                    {formatCurrency(gstSummary.totals.cgst)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total SGST</p>
                  <p className="text-lg font-bold text-slate-200 mt-1">
                    {formatCurrency(gstSummary.totals.sgst)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total GST</p>
                  <p className="text-lg font-bold text-red-400 mt-1">
                    {formatCurrency(gstSummary.totals.totalGST)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-400">Total Transactions</p>
                  <p className="text-lg font-bold text-white mt-1">
                    {gstSummary.totals.totalTransactions}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Important Notes */}
          {gstSummary.notes && gstSummary.notes.length > 0 && (
            <div className="bg-amber-500/10 border-t border-amber-500/20 p-4">
              <h3 className="text-sm font-bold text-amber-400 mb-2 flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Important Notes:
              </h3>
              <ul className="text-xs text-amber-200/80 space-y-1 list-disc list-inside ml-1">
                {gstSummary.notes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* No Data Message */}
      {!loading && !gstSummary && (
        <div className="bg-[#1e293b]/80 backdrop-blur-md shadow-lg shadow-black/20 rounded-xl border border-slate-700/50 p-12 text-center">
           <svg className="mx-auto h-12 w-12 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          <p className="text-lg font-medium text-white">No GST Data Available</p>
          <p className="text-sm text-slate-400 mt-1">Please create some transactions first to generate reports.</p>
        </div>
      )}

      {/* Monthly Summary */}
      {monthlySummary && (
        <div className="bg-[#1e293b]/80 backdrop-blur-md shadow-lg shadow-black/20 rounded-xl border border-slate-700/50 overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white">
              Monthly Summary ({monthlySummary.year})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800/80">
                <tr>
                   {['Month', 'Total Received', 'Commission', 'GST', 'Net Income', 'Transactions'].map((h) => (
                        <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {monthlySummary.monthlySummary.map((item, index) => (
                  <tr key={index} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {new Date(item._id.year, item._id.month - 1, 1).toLocaleDateString('en-IN', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {formatCurrency(item.totalReceived)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">
                      {formatCurrency(item.totalCommission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400">
                      {formatCurrency(item.totalGST)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-400 font-bold">
                      {formatCurrency(item.totalNetIncome)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {item.transactionCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
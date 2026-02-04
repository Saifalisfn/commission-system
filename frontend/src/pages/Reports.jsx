import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

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
      if (filters.month) {
        params.append('month', filters.month);
      }
      if (filters.year) {
        params.append('year', filters.year);
      }
      const response = await axios.get(`/reports/gst?${params}`);
      // Include notes from response root level
      setGstSummary({
        ...response.data.data,
        notes: response.data.notes || []
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to fetch GST summary');
      console.error(error);
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
      console.error('Failed to fetch monthly summary:', error);
      setMonthlySummary(null);
    }
  };

  const exportGSTR1 = async () => {
    try {
      if (!filters.month || !filters.year) {
        toast.error('Please select both month and year for GSTR-1 export');
        return;
      }

      const response = await axios.get(`/export/gstr1?month=${filters.month}&year=${filters.year}`);
      
      // Download JSON file
      const dataStr = JSON.stringify(response.data.data.gstr1, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = window.URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `GSTR1-${filters.year}-${String(filters.month).padStart(2, '0')}.json`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('GSTR-1 JSON exported successfully');
    } catch (error) {
      const errorMessage = error.response?.data?.message || 'Failed to export GSTR-1';
      toast.error(errorMessage);
      console.error('GSTR-1 export error:', error);
    }
  };

  const exportToExcel = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.month) {
        params.append('month', filters.month);
      }
      if (filters.year) {
        params.append('year', filters.year);
      }
      
      const response = await axios.get(`/export/excel?${params}`, {
        responseType: 'blob'
      });

      // Check if response is actually an Excel file (not an error JSON)
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        toast.error(errorData.message || 'Failed to export Excel');
        return;
      }

      const url = window.URL.createObjectURL(new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      }));
      const link = document.createElement('a');
      link.href = url;
      const filename = `transactions-${filters.year || 'all'}-${filters.month || 'all'}-${Date.now()}.xlsx`;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      toast.success('Excel file downloaded successfully');
    } catch (error) {
      let errorMessage = 'Failed to export Excel';
      
      if (error.response) {
        // Try to parse error message from blob response
        if (error.response.data instanceof Blob) {
          try {
            const text = await error.response.data.text();
            const errorData = JSON.parse(text);
            errorMessage = errorData.message || errorMessage;
          } catch (e) {
            errorMessage = error.response.statusText || errorMessage;
          }
        } else {
          errorMessage = error.response.data?.message || error.response.statusText || errorMessage;
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      console.error('Excel export error:', error);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">GST Reports</h1>
          <p className="mt-2 text-sm text-gray-600">
            GST-compliant reports ready for GSTR-1 & GSTR-3B filing
          </p>
        </div>
        <div className="space-x-2">
          <button
            onClick={exportToExcel}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Export to Excel
          </button>
          <button
            onClick={exportGSTR1}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Export GSTR-1 JSON
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Month
            </label>
            <select
              name="month"
              value={filters.month || ''}
              onChange={(e) => {
                const value = e.target.value;
                setFilters({ ...filters, month: value ? parseInt(value) : '' });
              }}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              <option value="">All Months</option>
              {months.map((m) => (
                <option key={m} value={m}>
                  {new Date(2024, m - 1, 1).toLocaleDateString('en-IN', { month: 'long' })}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Year
            </label>
            <select
              name="year"
              value={filters.year}
              onChange={(e) => setFilters({ ...filters, year: parseInt(e.target.value) })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="bg-white shadow rounded-lg p-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-500">Loading GST summary...</p>
          </div>
        </div>
      )}

      {/* GST Summary */}
      {!loading && gstSummary && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            GST Summary ({gstSummary.period})
          </h2>

          {gstSummary.summary && gstSummary.summary.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Taxable Value (₹)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      CGST (₹)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SGST (₹)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total GST (₹)
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Transactions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {gstSummary.summary.map((item, index) => (
                    <tr key={index}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item._id.year}-{String(item._id.month).padStart(2, '0')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.taxableValue)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.cgst)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(item.sgst)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {formatCurrency(item.totalGST)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.transactionCount}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No data for selected period</p>
          )}

          {/* Totals */}
          {gstSummary.totals && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Total Taxable Value</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(gstSummary.totals.taxableValue)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total CGST</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(gstSummary.totals.cgst)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total SGST</p>
                  <p className="text-lg font-semibold">
                    {formatCurrency(gstSummary.totals.sgst)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total GST</p>
                  <p className="text-lg font-semibold text-red-600">
                    {formatCurrency(gstSummary.totals.totalGST)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Transactions</p>
                  <p className="text-lg font-semibold">
                    {gstSummary.totals.totalTransactions}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Important Notes */}
          {gstSummary.notes && gstSummary.notes.length > 0 && (
            <div className="mt-6 p-4 bg-yellow-50 rounded-md">
              <h3 className="text-sm font-semibold text-yellow-800 mb-2">Important Notes:</h3>
              <ul className="text-xs text-yellow-800 space-y-1">
                {gstSummary.notes.map((note, index) => (
                  <li key={index}>• {note}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* No Data Message */}
      {!loading && !gstSummary && (
        <div className="bg-white shadow rounded-lg p-6">
          <p className="text-gray-500 text-center py-8">
            No GST data available. Please create some transactions first.
          </p>
        </div>
      )}

      {/* Monthly Summary */}
      {monthlySummary && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Monthly Summary ({monthlySummary.year})
          </h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Month
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total Received
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GST
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Net Income
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transactions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {monthlySummary.monthlySummary.map((item, index) => (
                  <tr key={index}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(item._id.year, item._id.month - 1, 1).toLocaleDateString('en-IN', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(item.totalReceived)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {formatCurrency(item.totalCommission)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {formatCurrency(item.totalGST)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(item.totalNetIncome)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
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

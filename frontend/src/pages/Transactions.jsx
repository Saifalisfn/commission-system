import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const Transactions = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear()
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchTransactions();
  }, [filters, pagination.page]);

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      // Mock Data for Demo Purposes (Remove this block when connecting to backend)
      /* const mockData = Array.from({ length: 5 }).map((_, i) => ({
         _id: i,
         invoiceNumber: `INV-${2024}-${1000+i}`,
         date: new Date().toISOString(),
         totalReceived: 5000 * (i+1),
         commissionAmount: 50 * (i+1),
         gstAmount: 9 * (i+1),
         netIncome: 41 * (i+1),
         returnAmount: 4950 * (i+1)
       }));
       setTransactions(mockData);
       setSummary({ totalReceived: 100000, totalCommission: 5000, totalGST: 900, totalNetIncome: 4100, count: 50 });
       setLoading(false);
       return; 
       */

      const params = new URLSearchParams({
        month: filters.month,
        year: filters.year,
        page: pagination.page,
        limit: pagination.limit
      });

      const response = await axios.get(`/transactions?${params}`);
      setTransactions(response.data.data.transactions);
      setPagination(response.data.data.pagination);
      setSummary(response.data.data.summary);
    } catch (error) {
      // toast.error('Failed to fetch transactions');
      // console.error(error);
      setTransactions([]); // Safe fallback
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: parseInt(e.target.value)
    });
    setPagination({ ...pagination, page: 1 });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    try {
      await axios.delete(`/transactions/${id}`);
      toast.success('Transaction deleted successfully');
      fetchTransactions();
    } catch (error) {
      toast.error('Failed to delete transaction');
    }
  };

 const downloadInvoice = async (transactionId) => {
    try {
      const response = await axios.get(`/export/invoice/${transactionId}`, {
        responseType: 'blob'
      });
      
      // Check if response is actually a PDF (not an error JSON)
      if (response.data.type === 'application/json') {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        toast.error(errorData.message || 'Failed to download invoice');
        return;
      }
      
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-${transactionId}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Invoice downloaded successfully');
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'Failed to download invoice';
      toast.error(errorMessage);
      console.error('Invoice download error:', error);
    }
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Transaction Ledger</h1>
          <p className="mt-2 text-sm text-slate-400">
            View and manage all transactions with date filters
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-[#1e293b]/80 backdrop-blur-md shadow-lg shadow-black/20 rounded-xl border border-slate-700/50 p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Month
            </label>
            <select
              name="month"
              value={filters.month}
              onChange={handleFilterChange}
              className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm [color-scheme:dark]"
            >
              {months.map((m) => (
                <option key={m} value={m} className="bg-slate-800">
                  {format(new Date(2024, m - 1, 1), 'MMMM')}
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
              onChange={handleFilterChange}
              className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm [color-scheme:dark]"
            >
              {years.map((y) => (
                <option key={y} value={y} className="bg-slate-800">
                  {y}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={() => {
                setFilters({ month: '', year: '' });
                setPagination({ ...pagination, page: 1 });
              }}
              className="w-full bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Summary */}
      {summary && (
        <div className="bg-[#1e293b]/80 backdrop-blur-md shadow-lg shadow-black/20 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <span className="w-1 h-6 bg-indigo-500 rounded-full"></span>
            Summary
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
            <div>
              <p className="text-sm text-slate-400">Total Received</p>
              <p className="text-lg font-bold text-white mt-1">{formatCurrency(summary.totalReceived)}</p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Total Commission</p>
              <p className="text-lg font-bold text-blue-400 mt-1">
                {formatCurrency(summary.totalCommission)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Total GST</p>
              <p className="text-lg font-bold text-red-400 mt-1">
                {formatCurrency(summary.totalGST)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Net Income</p>
              <p className="text-lg font-bold text-emerald-400 mt-1">
                {formatCurrency(summary.totalNetIncome)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-400">Transactions</p>
              <p className="text-lg font-bold text-white mt-1">{summary.count}</p>
            </div>
          </div>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-[#1e293b]/80 backdrop-blur-md shadow-lg shadow-black/20 rounded-xl border border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Spinner />
            <p className="mt-4 text-slate-400">Loading transactions...</p>
          </div>
        ) : transactions.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-700">
                <thead className="bg-slate-800/80">
                  <tr>
                    {['Invoice No', 'Date', 'Total Received', 'Commission', 'GST', 'Net Income', 'Return Amount', 'Actions'].map((header) => (
                        <th key={header} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            {header}
                        </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {transactions.map((transaction) => (
                    <tr key={transaction._id} className="hover:bg-slate-700/30 transition-colors group">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-slate-300">
                        {transaction.invoiceNumber || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {format(new Date(transaction.date), 'dd MMM yyyy')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                        {formatCurrency(transaction.totalReceived)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">
                        {formatCurrency(transaction.commissionAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400">
                        {formatCurrency(transaction.gstAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-emerald-400 font-bold">
                        {formatCurrency(transaction.netIncome)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                        {formatCurrency(transaction.returnAmount)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3 opacity-60 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => downloadInvoice(transaction._id)}
                          className="text-indigo-400 hover:text-indigo-300 transition-colors"
                          title="Download Invoice"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDelete(transaction._id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                          title="Delete Transaction"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="bg-slate-800/50 px-4 py-3 flex items-center justify-between border-t border-slate-700/50 sm:px-6">
                <div className="flex-1 flex justify-between sm:hidden">
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                    disabled={pagination.page === 1}
                    className="relative inline-flex items-center px-4 py-2 border border-slate-600 text-sm font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <button
                    onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                    disabled={pagination.page === pagination.pages}
                    className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-600 text-sm font-medium rounded-md text-slate-300 bg-slate-700 hover:bg-slate-600 disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
                <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm text-slate-400">
                      Showing{' '}
                      <span className="font-medium text-white">
                        {(pagination.page - 1) * pagination.limit + 1}
                      </span>{' '}
                      to{' '}
                      <span className="font-medium text-white">
                        {Math.min(pagination.page * pagination.limit, pagination.total)}
                      </span>{' '}
                      of <span className="font-medium text-white">{pagination.total}</span> results
                    </p>
                  </div>
                  <div>
                    <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                      <button
                        onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
                        disabled={pagination.page === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-slate-600 bg-slate-800 text-sm font-medium text-slate-400 hover:bg-slate-700 disabled:opacity-50"
                      >
                        <span className="sr-only">Previous</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
                        disabled={pagination.page === pagination.pages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-slate-600 bg-slate-800 text-sm font-medium text-slate-400 hover:bg-slate-700 disabled:opacity-50"
                      >
                        <span className="sr-only">Next</span>
                        <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                          <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="p-12 text-center text-slate-500">
             <svg className="mx-auto h-12 w-12 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <p className="text-lg font-medium text-white">No transactions found</p>
            <p className="text-sm">Try adjusting your filters or create a new transaction.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Transactions;














// // old

// import { useState, useEffect } from 'react';
// import axios from 'axios';
// import toast from 'react-hot-toast';
// import { format } from 'date-fns';

// const Transactions = () => {
//   const [transactions, setTransactions] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [filters, setFilters] = useState({
//     month: new Date().getMonth() + 1,
//     year: new Date().getFullYear()
//   });
//   const [pagination, setPagination] = useState({
//     page: 1,
//     limit: 50,
//     total: 0,
//     pages: 0
//   });
//   const [summary, setSummary] = useState(null);

//   useEffect(() => {
//     fetchTransactions();
//   }, [filters, pagination.page]);

//   const fetchTransactions = async () => {
//     setLoading(true);
//     try {
//       const params = new URLSearchParams({
//         month: filters.month,
//         year: filters.year,
//         page: pagination.page,
//         limit: pagination.limit
//       });

//       const response = await axios.get(`/transactions?${params}`);
//       setTransactions(response.data.data.transactions);
//       setPagination(response.data.data.pagination);
//       setSummary(response.data.data.summary);
//     } catch (error) {
//       toast.error('Failed to fetch transactions');
//       console.error(error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleFilterChange = (e) => {
//     setFilters({
//       ...filters,
//       [e.target.name]: parseInt(e.target.value)
//     });
//     setPagination({ ...pagination, page: 1 });
//   };

//   const handleDelete = async (id) => {
//     if (!window.confirm('Are you sure you want to delete this transaction?')) {
//       return;
//     }

//     try {
//       await axios.delete(`/transactions/${id}`);
//       toast.success('Transaction deleted successfully');
//       fetchTransactions();
//     } catch (error) {
//       toast.error('Failed to delete transaction');
//     }
//   };

//   const downloadInvoice = async (transactionId) => {
//     try {
//       const response = await axios.get(`/export/invoice/${transactionId}`, {
//         responseType: 'blob'
//       });
//       
//       // Check if response is actually a PDF (not an error JSON)
//       if (response.data.type === 'application/json') {
//         const text = await response.data.text();
//         const errorData = JSON.parse(text);
//         toast.error(errorData.message || 'Failed to download invoice');
//         return;
//       }
//       
//       const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
//       const link = document.createElement('a');
//       link.href = url;
//       link.setAttribute('download', `invoice-${transactionId}.pdf`);
//       document.body.appendChild(link);
//       link.click();
//       link.remove();
//       window.URL.revokeObjectURL(url);
//       
//       toast.success('Invoice downloaded successfully');
//     } catch (error) {
//       const errorMessage = error.response?.data?.message || error.message || 'Failed to download invoice';
//       toast.error(errorMessage);
//       console.error('Invoice download error:', error);
//     }
//   };

//   const formatCurrency = (amount) => {
//     return new Intl.NumberFormat('en-IN', {
//       style: 'currency',
//       currency: 'INR',
//       minimumFractionDigits: 2
//     }).format(amount);
//   };

//   const months = Array.from({ length: 12 }, (_, i) => i + 1);
//   const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

//   return (
//     <div className="space-y-6">
//       <div>
//         <h1 className="text-3xl font-bold text-gray-900">Transaction Ledger</h1>
//         <p className="mt-2 text-sm text-gray-600">
//           View and manage all transactions with date filters
//         </p>
//       </div>

//       {/* Filters */}
//       <div className="bg-white shadow rounded-lg p-6">
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Month
//             </label>
//             <select
//               name="month"
//               value={filters.month}
//               onChange={handleFilterChange}
//               className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
//             >
//               {months.map((m) => (
//                 <option key={m} value={m}>
//                   {format(new Date(2024, m - 1, 1), 'MMMM')}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div>
//             <label className="block text-sm font-medium text-gray-700 mb-2">
//               Year
//             </label>
//             <select
//               name="year"
//               value={filters.year}
//               onChange={handleFilterChange}
//               className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
//             >
//               {years.map((y) => (
//                 <option key={y} value={y}>
//                   {y}
//                 </option>
//               ))}
//             </select>
//           </div>
//           <div className="flex items-end">
//             <button
//               onClick={() => {
//                 setFilters({ month: '', year: '' });
//                 setPagination({ ...pagination, page: 1 });
//               }}
//               className="w-full bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
//             >
//               Clear Filters
//             </button>
//           </div>
//         </div>
//       </div>

//       {/* Summary */}
//       {summary && (
//         <div className="bg-white shadow rounded-lg p-6">
//           <h2 className="text-lg font-semibold text-gray-900 mb-4">Summary</h2>
//           <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
//             <div>
//               <p className="text-sm text-gray-500">Total Received</p>
//               <p className="text-lg font-semibold">{formatCurrency(summary.totalReceived)}</p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-500">Total Commission</p>
//               <p className="text-lg font-semibold text-blue-600">
//                 {formatCurrency(summary.totalCommission)}
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-500">Total GST</p>
//               <p className="text-lg font-semibold text-red-600">
//                 {formatCurrency(summary.totalGST)}
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-500">Net Income</p>
//               <p className="text-lg font-semibold text-green-600">
//                 {formatCurrency(summary.totalNetIncome)}
//               </p>
//             </div>
//             <div>
//               <p className="text-sm text-gray-500">Transactions</p>
//               <p className="text-lg font-semibold">{summary.count}</p>
//             </div>
//           </div>
//         </div>
//       )}

//       {/* Transactions Table */}
//       <div className="bg-white shadow rounded-lg overflow-hidden">
//         {loading ? (
//           <div className="p-8 text-center">
//             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
//           </div>
//         ) : transactions.length > 0 ? (
//           <>
//             <div className="overflow-x-auto">
//               <table className="min-w-full divide-y divide-gray-200">
//                 <thead className="bg-gray-50">
//                   <tr>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Invoice No
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Date
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Total Received
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Commission
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       GST
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Net Income
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Return Amount
//                     </th>
//                     <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
//                       Actions
//                     </th>
//                   </tr>
//                 </thead>
//                 <tbody className="bg-white divide-y divide-gray-200">
//                   {transactions.map((transaction) => (
//                     <tr key={transaction._id} className="hover:bg-gray-50">
//                       <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
//                         {transaction.invoiceNumber || 'N/A'}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {format(new Date(transaction.date), 'dd MMM yyyy')}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {formatCurrency(transaction.totalReceived)}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
//                         {formatCurrency(transaction.commissionAmount)}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
//                         {formatCurrency(transaction.gstAmount)}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
//                         {formatCurrency(transaction.netIncome)}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
//                         {formatCurrency(transaction.returnAmount)}
//                       </td>
//                       <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
//                         <button
//                           onClick={() => downloadInvoice(transaction._id)}
//                           className="text-primary-600 hover:text-primary-900"
//                         >
//                           Invoice
//                         </button>
//                         <button
//                           onClick={() => handleDelete(transaction._id)}
//                           className="text-red-600 hover:text-red-900"
//                         >
//                           Delete
//                         </button>
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//             {/* Pagination */}
//             {pagination.pages > 1 && (
//               <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
//                 <div className="flex-1 flex justify-between sm:hidden">
//                   <button
//                     onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
//                     disabled={pagination.page === 1}
//                     className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
//                   >
//                     Previous
//                   </button>
//                   <button
//                     onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
//                     disabled={pagination.page === pagination.pages}
//                     className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
//                   >
//                     Next
//                   </button>
//                 </div>
//                 <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
//                   <div>
//                     <p className="text-sm text-gray-700">
//                       Showing{' '}
//                       <span className="font-medium">
//                         {(pagination.page - 1) * pagination.limit + 1}
//                       </span>{' '}
//                       to{' '}
//                       <span className="font-medium">
//                         {Math.min(pagination.page * pagination.limit, pagination.total)}
//                       </span>{' '}
//                       of <span className="font-medium">{pagination.total}</span> results
//                     </p>
//                   </div>
//                   <div>
//                     <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
//                       <button
//                         onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
//                         disabled={pagination.page === 1}
//                         className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
//                       >
//                         Previous
//                       </button>
//                       <button
//                         onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
//                         disabled={pagination.page === pagination.pages}
//                         className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
//                       >
//                         Next
//                       </button>
//                     </nav>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </>
//         ) : (
//           <div className="p-8 text-center text-gray-500">
//             No transactions found for the selected period
//           </div>
//         )}
//       </div>
//     </div>
//   );
// };

// export default Transactions;
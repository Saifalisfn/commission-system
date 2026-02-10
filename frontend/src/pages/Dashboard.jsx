import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

// Reusable Spinner Component
const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const Dashboard = () => {
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    totalReceived: '',
    commissionPercent: 1,
    remarks: ''
  });
  const [calculations, setCalculations] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    fetchRecentTransactions();
    fetchSummary();
  }, []);

  const fetchRecentTransactions = async () => {
    try {
      const response = await axios.get('/transactions?limit=5');
      setRecentTransactions(response.data.data.transactions);
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const fetchSummary = async () => {
    try {
      const currentDate = new Date();
      const response = await axios.get(
        `/transactions?month=${currentDate.getMonth() + 1}&year=${currentDate.getFullYear()}`
      );
      setSummary(response.data.data.summary);
    } catch (error) {
      console.error('Error fetching summary:', error);
    }
  };

  const calculatePreview = () => {
    const totalReceived = parseFloat(formData.totalReceived) || 0;
    const commissionPercent = parseFloat(formData.commissionPercent) || 1;
    const gstRate = 18;

    if (totalReceived > 0) {
      const commissionAmount = (totalReceived * commissionPercent) / 100;
      const gstAmount = (commissionAmount * gstRate) / 100;
      const netIncome = commissionAmount - gstAmount;
      const returnAmount = totalReceived - commissionAmount;

      setCalculations({
        commissionAmount: Math.round(commissionAmount * 100) / 100,
        gstAmount: Math.round(gstAmount * 100) / 100,
        netIncome: Math.round(netIncome * 100) / 100,
        returnAmount: Math.round(returnAmount * 100) / 100
      });
    } else {
      setCalculations(null);
    }
  };

  useEffect(() => {
    calculatePreview();
  }, [formData.totalReceived, formData.commissionPercent]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await axios.post('/transactions', {
        ...formData,
        totalReceived: parseFloat(formData.totalReceived)
      });
      toast.success('Transaction created successfully');
      setFormData({
        date: format(new Date(), 'yyyy-MM-dd'),
        totalReceived: '',
        commissionPercent: 1,
        remarks: ''
      });
      setCalculations(null);
      fetchRecentTransactions();
      fetchSummary();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to create transaction');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };

  return (  
    <div className="space-y-6 text-slate-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="mt-2 text-sm text-slate-400">
            Record QR transactions and manage commission calculations
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: 'Total Received', value: summary.totalReceived, icon: '💰', color: 'text-white' },
            { label: 'Total Commission', value: summary.totalCommission, icon: '💵', color: 'text-blue-400' },
            { label: 'Total GST', value: summary.totalGST, icon: '📊', color: 'text-red-400' },
            { label: 'Net Income', value: summary.totalNetIncome, icon: '✅', color: 'text-emerald-400' },
          ].map((item, index) => (
            <div key={index} className="bg-[#1e293b] overflow-hidden shadow-xl shadow-black/10 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors">
              <div className="p-5">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="text-2xl bg-slate-800 h-12 w-12 flex items-center justify-center rounded-lg shadow-inner">
                        {item.icon}
                    </div>
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-slate-400 truncate">
                        {item.label}
                      </dt>
                      <dd className={`text-lg font-bold ${item.color} mt-1`}>
                        {formatCurrency(item.value)}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Form */}
        <div className="bg-[#1e293b] shadow-xl shadow-black/10 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
             <span className="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
             </span>
             New Transaction
          </h2>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Date
              </label>
              {/* [color-scheme:dark] ensures the browser date picker is dark mode */}
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="block w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-white placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm [color-scheme:dark]"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Total Received (₹)
              </label>
              <div className="relative rounded-md shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <span className="text-slate-400 sm:text-sm">₹</span>
                </div>
                <input
                    type="number"
                    name="totalReceived"
                    value={formData.totalReceived}
                    onChange={handleChange}
                    step="0.01"
                    min="0.01"
                    required
                    className="block w-full rounded-lg border border-slate-600 bg-slate-700/50 pl-7 pr-3 py-2 text-white placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                    placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Commission Percentage (%)
              </label>
              <input
                type="number"
                name="commissionPercent"
                value={formData.commissionPercent}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="100"
                required
                className="block w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-white placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Remarks (Optional)
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={3}
                maxLength={500}
                className="block w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-white placeholder-slate-400 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1e293b] focus:ring-indigo-500 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {loading ? <><Spinner /> Creating...</> : 'Create Transaction'}
            </button>
          </form>
        </div>

        {/* Calculation Preview */}
        <div className="bg-[#1e293b] shadow-xl shadow-black/10 rounded-xl border border-slate-700/50 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center">
            <span className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg mr-3">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
            </span>
            Calculation Preview
          </h2>
          
          <div className="flex-grow">
            {calculations ? (
                <div className="space-y-0">
                <div className="flex justify-between py-4 border-b border-slate-700/50">
                    <span className="text-slate-400">Total Received</span>
                    <span className="font-medium text-white">{formatCurrency(parseFloat(formData.totalReceived))}</span>
                </div>
                <div className="flex justify-between py-4 border-b border-slate-700/50">
                    <span className="text-slate-400">Commission ({formData.commissionPercent}%)</span>
                    <span className="font-medium text-blue-400">
                    + {formatCurrency(calculations.commissionAmount)}
                    </span>
                </div>
                <div className="flex justify-between py-4 border-b border-slate-700/50">
                    <span className="text-slate-400">GST (18% on Comm.)</span>
                    <span className="font-medium text-red-400">
                    - {formatCurrency(calculations.gstAmount)}
                    </span>
                </div>
                <div className="flex justify-between py-4 border-b border-slate-700/50 bg-slate-800/30 -mx-6 px-6">
                    <span className="text-slate-200">Net Income</span>
                    <span className="font-bold text-emerald-400">
                    {formatCurrency(calculations.netIncome)}
                    </span>
                </div>
                <div className="flex justify-between py-4 border-b border-slate-700/50">
                    <span className="text-slate-200 font-semibold">Return Amount</span>
                    <span className="font-bold text-white text-lg">
                    {formatCurrency(calculations.returnAmount)}
                    </span>
                </div>
                <div className="mt-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-xs text-yellow-200 flex items-start gap-2">
                    <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" /></svg>
                    <span>GST applies ONLY on commission amount, not on total received.</span>
                    </p>
                </div>
                </div>
            ) : (
                <div className="h-full flex flex-col items-center justify-center text-slate-500 py-10">
                    <svg className="w-16 h-16 opacity-20 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                    <p>Enter details to calculate</p>
                </div>
            )}
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-[#1e293b] shadow-xl shadow-black/10 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-700/50">
            <h2 className="text-xl font-bold text-white">
            Recent Transactions
            </h2>
        </div>
        
        {recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Invoice No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Received
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Commission
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    GST
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Net Income
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700 bg-[#1e293b]">
                {recentTransactions.map((transaction) => (
                  <tr key={transaction._id} className="hover:bg-slate-700/30 transition-colors">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-12">
            <svg className="mx-auto h-12 w-12 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-white">No transactions</h3>
            <p className="mt-1 text-sm text-slate-400">Get started by creating a new transaction.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
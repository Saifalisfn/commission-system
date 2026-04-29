import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useAuth } from '../contexts/AuthContext';

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
  </svg>
);

const CardSkeleton = () => (
  <div className="bg-[#1e293b] rounded-xl border border-slate-700/50 p-5 animate-pulse">
    <div className="flex items-center">
      <div className="h-12 w-12 rounded-lg bg-slate-700/70" />
      <div className="ml-5 flex-1 space-y-2">
        <div className="h-3 w-20 bg-slate-700/70 rounded" />
        <div className="h-5 w-28 bg-slate-700/70 rounded" />
      </div>
    </div>
  </div>
);

const TableRowSkeleton = () => (
  <tr className="animate-pulse">
    {[40, 28, 32, 28, 24, 28].map((w, i) => (
      <td key={i} className="px-6 py-4">
        <div className={`h-3.5 bg-slate-700/70 rounded w-${w}`} />
      </td>
    ))}
  </tr>
);

const COMMISSION_PRESETS = [0.5, 1, 1.5, 2];
const MAX_REMARKS = 500;

const Dashboard = () => {
  const [formData, setFormData] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    totalReceived: '',
    commissionPercent: 1,
    remarks: ''
  });
  const [calculations, setCalculations] = useState(null);
  const { user } = useAuth();
  const isCA = user?.role === 'ca';
  const [submitting, setSubmitting] = useState(false);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    fetchRecentTransactions();
    fetchSummary();
  }, []);

  const fetchRecentTransactions = async () => {
    setTransactionsLoading(true);
    try {
      const response = await axios.get('/transactions?limit=5');
      setRecentTransactions(response.data.data.transactions);
    } catch {
      // silently fail — not critical
    } finally {
      setTransactionsLoading(false);
    }
  };

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const now = new Date();
      const response = await axios.get(
        `/transactions?month=${now.getMonth() + 1}&year=${now.getFullYear()}`
      );
      setSummary(response.data.data.summary);
    } catch {
      // silently fail — not critical
    } finally {
      setSummaryLoading(false);
    }
  };

  useEffect(() => {
    const totalReceived = parseFloat(formData.totalReceived) || 0;
    const commissionPercent = parseFloat(formData.commissionPercent) || 1;

    if (totalReceived > 0) {
      const commissionAmount = Math.round((totalReceived * commissionPercent) / 100 * 100) / 100;
      const gstAmount = Math.round(commissionAmount * 0.18 * 100) / 100;
      const netIncome = Math.round((commissionAmount - gstAmount) * 100) / 100;
      const returnAmount = Math.round((totalReceived - commissionAmount) * 100) / 100;
      setCalculations({ commissionAmount, gstAmount, netIncome, returnAmount });
    } else {
      setCalculations(null);
    }
  }, [formData.totalReceived, formData.commissionPercent]);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
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
      setSubmitting(false);
    }
  };

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2
    }).format(amount || 0);

  const summaryCards = [
    {
      label: 'Transactions',
      value: summary?.count ?? 0,
      display: summary?.count ?? 0,
      isCurrency: false,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      ),
      iconBg: 'bg-violet-500/10',
      iconColor: 'text-violet-400',
      valueColor: 'text-white'
    },
    {
      label: 'Total Commission',
      value: summary?.totalCommission,
      isCurrency: true,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      iconBg: 'bg-blue-500/10',
      iconColor: 'text-blue-400',
      valueColor: 'text-blue-400'
    },
    {
      label: 'Total GST',
      value: summary?.totalGST,
      isCurrency: true,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 14l6-6m-5.5.5h.01m4.99 5h.01M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16l3.5-2 3.5 2 3.5-2 3.5 2z" />
        </svg>
      ),
      iconBg: 'bg-red-500/10',
      iconColor: 'text-red-400',
      valueColor: 'text-red-400'
    },
    {
      label: 'Net Income',
      value: summary?.totalNetIncome,
      isCurrency: true,
      icon: (
        <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
      ),
      iconBg: 'bg-emerald-500/10',
      iconColor: 'text-emerald-400',
      valueColor: 'text-emerald-400'
    }
  ];

  return (
    <div className="space-y-6 text-slate-300">

      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Dashboard</h1>
          <p className="mt-1 text-sm text-slate-400">
            Record QR transactions and manage commission calculations
          </p>
        </div>
      </div>

      {/* Monthly Summary Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-widest">
            Monthly Overview
          </h2>
          <span className="text-xs text-slate-500 bg-slate-800 border border-slate-700 px-2.5 py-1 rounded-full">
            {format(new Date(), 'MMMM yyyy')}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {summaryLoading
            ? Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)
            : summaryCards.map((card) => (
                <div
                  key={card.label}
                  className="bg-[#1e293b] overflow-hidden shadow-xl shadow-black/10 rounded-xl border border-slate-700/50 hover:border-slate-600 transition-colors"
                >
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 h-12 w-12 flex items-center justify-center rounded-lg shadow-inner ${card.iconBg} ${card.iconColor}`}>
                        {card.icon}
                      </div>
                      <div className="ml-4 w-0 flex-1">
                        <p className="text-xs font-medium text-slate-400 truncate">{card.label}</p>
                        <p className={`text-lg font-bold mt-0.5 ${card.valueColor}`}>
                          {card.isCurrency ? formatCurrency(card.value) : card.value}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      {/* CA read-only notice */}
      {isCA && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
          <svg className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-amber-200/80">
            You are logged in as <span className="font-semibold text-amber-300">CA / Auditor</span>. This is a read-only view — transaction creation and editing are disabled. Use the <Link to="/reports" className="underline hover:text-amber-200">Reports</Link> page to access GST summaries and exports.
          </p>
        </div>
      )}

      {/* Form + Calculation Preview */}
      {!isCA && <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Transaction Form */}
        <div className="bg-[#1e293b] shadow-xl shadow-black/10 rounded-xl border border-slate-700/50 p-6">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="bg-indigo-500/10 text-indigo-400 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
            </span>
            New Transaction
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Date</label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="block w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm [color-scheme:dark]"
              />
            </div>

            {/* Total Received */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Total Received (₹)</label>
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
                  className="block w-full rounded-lg border border-slate-600 bg-slate-700/50 pl-7 pr-3 py-2 text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Commission Percent */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">Commission (%)</label>
              <input
                type="number"
                name="commissionPercent"
                value={formData.commissionPercent}
                onChange={handleChange}
                step="0.01"
                min="0"
                max="100"
                required
                className="block w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-white shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              />
              {/* Quick presets */}
              <div className="flex gap-2 mt-2">
                {COMMISSION_PRESETS.map(pct => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, commissionPercent: pct }))}
                    className={`px-2.5 py-1 text-xs rounded-md border transition-colors ${
                      parseFloat(formData.commissionPercent) === pct
                        ? 'bg-indigo-600 border-indigo-500 text-white'
                        : 'border-slate-600 text-slate-400 hover:border-slate-500 hover:text-slate-300 bg-slate-800/50'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Remarks */}
            <div>
              <div className="flex justify-between items-baseline mb-1">
                <label className="block text-sm font-medium text-slate-300">Remarks (Optional)</label>
                <span className={`text-xs ${formData.remarks.length > MAX_REMARKS * 0.9 ? 'text-amber-400' : 'text-slate-500'}`}>
                  {formData.remarks.length}/{MAX_REMARKS}
                </span>
              </div>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={3}
                maxLength={MAX_REMARKS}
                className="block w-full rounded-lg border border-slate-600 bg-slate-700/50 px-3 py-2 text-white placeholder-slate-500 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 sm:text-sm resize-none"
                placeholder="Optional notes about this transaction…"
              />
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full flex justify-center items-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#1e293b] focus:ring-indigo-500 disabled:opacity-50 transition-all active:scale-[0.98]"
            >
              {submitting ? <><Spinner />Creating…</> : 'Create Transaction'}
            </button>
          </form>
        </div>

        {/* Calculation Preview */}
        <div className="bg-[#1e293b] shadow-xl shadow-black/10 rounded-xl border border-slate-700/50 p-6 flex flex-col">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-3">
            <span className="bg-emerald-500/10 text-emerald-400 p-2 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
            </span>
            Calculation Preview
          </h2>

          <div className="flex-grow">
            {calculations ? (
              <div className="space-y-0">
                <div className="flex justify-between py-3.5 border-b border-slate-700/50">
                  <span className="text-slate-400 text-sm">Total Received</span>
                  <span className="font-medium text-white text-sm">{formatCurrency(parseFloat(formData.totalReceived))}</span>
                </div>
                <div className="flex justify-between py-3.5 border-b border-slate-700/50">
                  <span className="text-slate-400 text-sm">Commission ({formData.commissionPercent}%)</span>
                  <span className="font-medium text-blue-400 text-sm">+{formatCurrency(calculations.commissionAmount)}</span>
                </div>
                <div className="flex justify-between py-3.5 border-b border-slate-700/50">
                  <span className="text-slate-400 text-sm">GST (18% on commission)</span>
                  <span className="font-medium text-red-400 text-sm">−{formatCurrency(calculations.gstAmount)}</span>
                </div>
                <div className="flex justify-between py-3.5 border-b border-slate-700/60 bg-slate-800/40 -mx-6 px-6">
                  <span className="text-slate-200 text-sm">Net Income</span>
                  <span className="font-bold text-emerald-400 text-sm">{formatCurrency(calculations.netIncome)}</span>
                </div>

                {/* Return Amount — most prominent: this is what the merchant gets back */}
                <div className="mt-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-4">
                  <p className="text-xs font-medium text-indigo-300 uppercase tracking-widest mb-1">Return to Merchant</p>
                  <p className="text-3xl font-bold text-white">{formatCurrency(calculations.returnAmount)}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Total received minus {formData.commissionPercent}% commission
                  </p>
                </div>

                <div className="mt-4 p-3 bg-amber-500/5 border border-amber-500/15 rounded-lg">
                  <p className="text-xs text-amber-200/70 flex items-start gap-2">
                    <svg className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    GST is charged only on commission, not on the total received amount.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-slate-600 py-12">
                <svg className="w-14 h-14 opacity-30 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">Enter an amount to see the breakdown</p>
              </div>
            )}
          </div>
        </div>
      </div>}

      {/* Recent Transactions */}
      <div className="bg-[#1e293b] shadow-xl shadow-black/10 rounded-xl border border-slate-700/50 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-700/50 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
          <Link
            to="/transactions"
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
          >
            View All
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-700">
            <thead className="bg-slate-800/60">
              <tr>
                {['Invoice No', 'Date', 'Received', 'Commission', 'GST', 'Net Income'].map(col => (
                  <th key={col} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700/50 bg-[#1e293b]">
              {transactionsLoading ? (
                Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} />)
              ) : recentTransactions.length > 0 ? (
                recentTransactions.map((tx) => (
                  <tr key={tx._id} className="hover:bg-slate-700/20 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-mono text-slate-300">
                      {tx.invoiceNumber || <span className="text-slate-600">—</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {format(new Date(tx.date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-white font-medium">
                      {formatCurrency(tx.totalReceived)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-400">
                      {formatCurrency(tx.commissionAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400">
                      {formatCurrency(tx.gstAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-emerald-400">
                      {formatCurrency(tx.netIncome)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center py-12">
                    <svg className="mx-auto h-10 w-10 text-slate-600 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    <p className="text-sm font-medium text-slate-400">No transactions yet</p>
                    <p className="text-xs text-slate-600 mt-0.5">Create your first transaction using the form above.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

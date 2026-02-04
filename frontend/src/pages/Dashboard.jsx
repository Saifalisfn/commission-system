import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

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
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Record QR transactions and manage commission calculations
        </p>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">💰</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Received
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(summary.totalReceived)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">💵</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total Commission
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(summary.totalCommission)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">📊</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total GST
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(summary.totalGST)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="text-2xl">✅</div>
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Net Income
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(summary.totalNetIncome)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Form */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            New Transaction
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Date
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Total Received (₹)
              </label>
              <input
                type="number"
                name="totalReceived"
                value={formData.totalReceived}
                onChange={handleChange}
                step="0.01"
                min="0.01"
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
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
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Remarks (Optional)
              </label>
              <textarea
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                rows={3}
                maxLength={500}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Transaction'}
            </button>
          </form>
        </div>

        {/* Calculation Preview */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Calculation Preview
          </h2>
          {calculations ? (
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Total Received:</span>
                <span className="font-medium">{formatCurrency(parseFloat(formData.totalReceived))}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Commission ({formData.commissionPercent}%):</span>
                <span className="font-medium text-blue-600">
                  {formatCurrency(calculations.commissionAmount)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">GST (18% on commission):</span>
                <span className="font-medium text-red-600">
                  {formatCurrency(calculations.gstAmount)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-600">Net Income:</span>
                <span className="font-medium text-green-600">
                  {formatCurrency(calculations.netIncome)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b-2 border-gray-300">
                <span className="text-gray-600 font-semibold">Return Amount:</span>
                <span className="font-bold text-gray-900">
                  {formatCurrency(calculations.returnAmount)}
                </span>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                <p className="text-xs text-yellow-800">
                  <strong>Note:</strong> GST applies ONLY on commission amount, not on total received.
                </p>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Enter transaction details to see calculation preview
            </p>
          )}
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Recent Transactions
        </h2>
        {recentTransactions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Invoice No
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
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
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentTransactions.map((transaction) => (
                  <tr key={transaction._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                      {transaction.invoiceNumber || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {format(new Date(transaction.date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatCurrency(transaction.totalReceived)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">
                      {formatCurrency(transaction.commissionAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600">
                      {formatCurrency(transaction.gstAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">
                      {formatCurrency(transaction.netIncome)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">No transactions yet</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;

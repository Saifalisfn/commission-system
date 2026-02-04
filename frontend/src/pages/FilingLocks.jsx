import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const FilingLocks = () => {
  const [locks, setLocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLockForm, setShowLockForm] = useState(false);
  const [lockForm, setLockForm] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
    gstr1FilingDate: '',
    gstr3BFilingDate: '',
    remarks: ''
  });

  useEffect(() => {
    fetchLocks();
  }, []);

  const fetchLocks = async () => {
    setLoading(true);
    try {
      const response = await axios.get('/filing-locks');
      setLocks(response.data.data.locks);
    } catch (error) {
      toast.error('Failed to fetch filing locks');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleLockMonth = async (e) => {
    e.preventDefault();
    try {
      await axios.post('/filing-locks', lockForm);
      toast.success(`Month ${lockForm.month}/${lockForm.year} locked successfully`);
      setShowLockForm(false);
      setLockForm({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        gstr1FilingDate: '',
        gstr3BFilingDate: '',
        remarks: ''
      });
      fetchLocks();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to lock month');
    }
  };

  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">GST Filing Locks</h1>
          <p className="mt-2 text-sm text-gray-600">
            Lock months after GST filing to prevent transaction modifications
          </p>
        </div>
        <button
          onClick={() => setShowLockForm(!showLockForm)}
          className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          {showLockForm ? 'Cancel' : 'Lock Month'}
        </button>
      </div>

      {/* Lock Form */}
      {showLockForm && (
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Lock Month for GST Filing</h2>
          <form onSubmit={handleLockMonth} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Month
                </label>
                <select
                  name="month"
                  value={lockForm.month}
                  onChange={(e) => setLockForm({ ...lockForm, month: parseInt(e.target.value) })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                >
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
                  value={lockForm.year}
                  onChange={(e) => setLockForm({ ...lockForm, year: parseInt(e.target.value) })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                  required
                >
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GSTR-1 Filing Date (Optional)
                </label>
                <input
                  type="date"
                  name="gstr1FilingDate"
                  value={lockForm.gstr1FilingDate}
                  onChange={(e) => setLockForm({ ...lockForm, gstr1FilingDate: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  GSTR-3B Filing Date (Optional)
                </label>
                <input
                  type="date"
                  name="gstr3BFilingDate"
                  value={lockForm.gstr3BFilingDate}
                  onChange={(e) => setLockForm({ ...lockForm, gstr3BFilingDate: e.target.value })}
                  className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Remarks (Optional)
              </label>
              <textarea
                name="remarks"
                value={lockForm.remarks}
                onChange={(e) => setLockForm({ ...lockForm, remarks: e.target.value })}
                rows={3}
                maxLength={500}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              />
            </div>
            <button
              type="submit"
              className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Lock Month
            </button>
          </form>
        </div>
      )}

      {/* Locks List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : locks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Financial Year
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Locked At
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Locked By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GSTR-1 Filed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    GSTR-3B Filed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {locks.map((lock) => (
                  <tr key={lock._id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(lock.year, lock.month - 1, 1).toLocaleDateString('en-IN', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lock.financialYear}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(lock.lockedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lock.lockedBy?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lock.gstr1FilingDate
                        ? new Date(lock.gstr1FilingDate).toLocaleDateString('en-IN')
                        : 'Not filed'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {lock.gstr3BFilingDate
                        ? new Date(lock.gstr3BFilingDate).toLocaleDateString('en-IN')
                        : 'Not filed'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          lock.isLocked
                            ? 'bg-red-100 text-red-800'
                            : 'bg-green-100 text-green-800'
                        }`}
                      >
                        {lock.isLocked ? 'Locked' : 'Unlocked'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">
            No filing locks found
          </div>
        )}
      </div>
    </div>
  );
};

export default FilingLocks;

import { useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Spinner = () => (
  <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-indigo-500 mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

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
      // Mock data for UI testing (remove in production)
      /* setLocks([
         { _id: 1, month: 1, year: 2024, financialYear: '2023-24', lockedAt: new Date(), lockedBy: { name: 'Admin' }, isLocked: true, gstr1FilingDate: new Date(), gstr3BFilingDate: new Date() }
       ]);
       setLoading(false); 
       return; */

      const response = await axios.get('/filing-locks');
      setLocks(response.data.data.locks);
    } catch (error) {
      // toast.error('Failed to fetch filing locks');
      setLocks([]);
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
    <div className="space-y-6 text-slate-300">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">GST Filing Locks</h1>
          <p className="mt-2 text-sm text-slate-400">
            Lock months after GST filing to prevent transaction modifications
          </p>
        </div>
        <button
          onClick={() => setShowLockForm(!showLockForm)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg ${
            showLockForm 
             ? 'bg-slate-700 hover:bg-slate-600 text-slate-200 border border-slate-500' 
             : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/20'
          }`}
        >
          {showLockForm ? 'Cancel' : 'Lock Month'}
        </button>
      </div>

      {/* Lock Form */}
      {showLockForm && (
        <div className="bg-[#1e293b]/80 backdrop-blur-md shadow-lg shadow-black/20 rounded-xl border border-slate-700/50 p-6 animate-fade-in-down">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Lock Month for GST Filing
          </h2>
          <form onSubmit={handleLockMonth} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Month
                </label>
                <select
                  name="month"
                  value={lockForm.month}
                  onChange={(e) => setLockForm({ ...lockForm, month: parseInt(e.target.value) })}
                  className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm [color-scheme:dark]"
                  required
                >
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
                  value={lockForm.year}
                  onChange={(e) => setLockForm({ ...lockForm, year: parseInt(e.target.value) })}
                  className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm [color-scheme:dark]"
                  required
                >
                  {years.map((y) => (
                    <option key={y} value={y} className="bg-slate-800">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  GSTR-1 Filing Date (Optional)
                </label>
                <input
                  type="date"
                  name="gstr1FilingDate"
                  value={lockForm.gstr1FilingDate}
                  onChange={(e) => setLockForm({ ...lockForm, gstr1FilingDate: e.target.value })}
                  className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm [color-scheme:dark]"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  GSTR-3B Filing Date (Optional)
                </label>
                <input
                  type="date"
                  name="gstr3BFilingDate"
                  value={lockForm.gstr3BFilingDate}
                  onChange={(e) => setLockForm({ ...lockForm, gstr3BFilingDate: e.target.value })}
                  className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm [color-scheme:dark]"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Remarks (Optional)
              </label>
              <textarea
                name="remarks"
                value={lockForm.remarks}
                onChange={(e) => setLockForm({ ...lockForm, remarks: e.target.value })}
                rows={3}
                maxLength={500}
                className="block w-full rounded-lg border border-slate-600 bg-slate-800/50 px-3 py-2 text-white placeholder-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 sm:text-sm"
              />
            </div>
            <div className="flex justify-end pt-2">
                <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-indigo-500/20 active:scale-[0.98]"
                >
                Confirm Lock
                </button>
            </div>
          </form>
        </div>
      )}

      {/* Locks List Table */}
      <div className="bg-[#1e293b]/80 backdrop-blur-md shadow-lg shadow-black/20 rounded-xl border border-slate-700/50 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center">
            <Spinner />
            <p className="mt-4 text-slate-400">Loading filing locks...</p>
          </div>
        ) : locks.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-700">
              <thead className="bg-slate-800/80">
                <tr>
                    {['Period', 'Financial Year', 'Locked At', 'Locked By', 'GSTR-1 Filed', 'GSTR-3B Filed', 'Status'].map((h) => (
                         <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">{h}</th>
                    ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {locks.map((lock) => (
                  <tr key={lock._id} className="hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                      {new Date(lock.year, lock.month - 1, 1).toLocaleDateString('en-IN', {
                        month: 'long',
                        year: 'numeric'
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {lock.financialYear}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-400">
                      {new Date(lock.lockedAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {lock.lockedBy?.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {lock.gstr1FilingDate
                        ? <span className="text-emerald-400">{new Date(lock.gstr1FilingDate).toLocaleDateString('en-IN')}</span>
                        : <span className="text-slate-500 italic">Pending</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-300">
                      {lock.gstr3BFilingDate
                        ? <span className="text-emerald-400">{new Date(lock.gstr3BFilingDate).toLocaleDateString('en-IN')}</span>
                        : <span className="text-slate-500 italic">Pending</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          lock.isLocked
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}
                      >
                         <svg className={`mr-1.5 h-2 w-2 ${lock.isLocked ? 'text-red-400' : 'text-emerald-400'}`} fill="currentColor" viewBox="0 0 8 8">
                            <circle cx="4" cy="4" r="3" />
                         </svg>
                        {lock.isLocked ? 'Locked' : 'Unlocked'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-slate-500">
             <svg className="mx-auto h-12 w-12 text-slate-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <p className="text-lg font-medium text-white">No Filing Locks Found</p>
            <p className="text-sm mt-1">Months will appear here once they are locked for filing.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FilingLocks;
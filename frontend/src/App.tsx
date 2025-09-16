import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import axios from "axios";

const API = "http://localhost:3000";


interface Vendor {
  id: string;
  name: string;
  currentOutStanding: number;
}

interface WriteOff {
  id: string;
  fmNumber: string;
  amount: number;
  note?: string;
  date: string;
  vendorId: string;
  createdAt: string;
}

function App() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [fmNumber, setFmNumber] = useState<string>("");
  const [note, setNote] = useState<string>("");
  const [writeoffs, setWriteoffs] = useState<WriteOff[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");


  useEffect(() => {
    const fetchVendors = async () => {
      try {
        setIsLoading(true);
        const res = await axios.get<Vendor[]>(`${API}/vendors`);
        setVendors(res.data);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Failed to load vendors. Please check if the backend server is running.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchVendors();
  }, []);


  useEffect(() => {
    if (selectedVendor) {
      const fetchWriteoffs = async () => {
        try {
          setIsLoading(true);
          const res = await axios.get<WriteOff[]>(`${API}/vendors/${selectedVendor}/writeoffs`);
          setWriteoffs(res.data);
          setError("");
        } catch (err) {
          console.error(err);
          setError("Failed to load write-offs");
        } finally {
          setIsLoading(false);
        }
      };

      fetchWriteoffs();
    }
  }, [selectedVendor]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedVendor || !amount || !fmNumber) {
      setError("Vendor, FM Number and Amount are required");
      return;
    }

    // Vendors Outstanding amount
    const selectedVendorData = vendors.find(v => v.id === selectedVendor);
    const outstandingBalance = selectedVendorData?.currentOutStanding || 0;

    // Validation of it 
    if (Number(amount) > outstandingBalance) {
      setError(`Write-off amount cannot exceed the outstanding balance of ₹${outstandingBalance.toLocaleString()}`);
      return;
    }

    try {
      setIsLoading(true);
      await axios.post(`${API}/writeoffs`, {
        vendorId: selectedVendor,
        fmNumber,
        amount: Number(amount),
        note,
      });

      setAmount("");
      setFmNumber("");
      setNote("");
      setError("");

      const res = await axios.get<WriteOff[]>(
        `${API}/vendors/${selectedVendor}/writeoffs`
      );
      setWriteoffs(res.data);

      const vendorName = vendors.find(v => v.id === selectedVendor)?.name;
      alert(`Write-off successfully created for ${vendorName}!`);
    } catch (err) {
      console.error(err);
      setError("Failed to create write-off. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-6">
      <div className="max-w-4xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            Write-Off
          </h1>
        </header>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-md">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <div className="mb-6 bg-white shadow-md rounded-lg p-5 border border-gray-100">
          <label className="block text-gray-700 font-medium mb-2">
            Select Vendor
          </label>
          <select
            className="border border-gray-300 rounded-md p-2.5 w-full bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            disabled={isLoading}
          >
            <option value="">-- Choose Vendor --</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name} (Pending: ₹{v.currentOutStanding.toLocaleString()})
              </option>
            ))}
          </select>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-md rounded-lg p-5 mb-8 border border-gray-100"
        >
          <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">New Write-Off</h2>
          <div className="grid gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">FM Number</label>
              <input
                className="border border-gray-300 rounded-md p-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Enter FM Number"
                value={fmNumber}
                onChange={(e) => setFmNumber(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
              <input
                className="border border-gray-300 rounded-md p-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Enter amount"
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
              <textarea
                className="border border-gray-300 rounded-md p-2.5 w-full focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                placeholder="Add any additional notes"
                rows={3}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 text-white rounded-md py-2.5 px-4 font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading || !selectedVendor}
            >
              {isLoading ? "Processing..." : "Submit Write-Off"}
            </button>
          </div>
        </form>

        {selectedVendor && (
          <div className="bg-white shadow-md rounded-lg p-5 border border-gray-100">
            <h2 className="text-xl font-semibold mb-4 text-gray-800 border-b pb-2">
              Write-Off History
              {writeoffs.length > 0 && <span className="text-sm font-normal text-gray-500 ml-2">({writeoffs.length} entries)</span>}
            </h2>

            {isLoading ? (
              <div className="py-4 text-center text-gray-500">Loading write-offs...</div>
            ) : writeoffs.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-gray-500">No write-offs recorded yet.</p>
                <p className="text-sm text-gray-400 mt-1">Create your first write-off using the form above.</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-200">
                {writeoffs.map((w) => (
                  <li key={w.id} className="py-3 flex justify-between items-start hover:bg-gray-50 px-2 rounded-md transition-colors">
                    <div>
                      <p className="font-medium text-gray-800">
                        {w.fmNumber}
                      </p>
                      <p className="text-blue-600 font-semibold">₹{w.amount.toLocaleString()}</p>
                      {w.note && <p className="text-sm text-gray-600 mt-1">{w.note}</p>}
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium text-gray-700">
                        {new Date(w.date).toLocaleDateString('en-IN', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(w.createdAt).toLocaleTimeString('en-IN', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default App;

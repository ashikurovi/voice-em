"use client";
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface Contact {
  _id: string;
  contactName: string;
  phoneNumber: string;
  relation?: string;
}

export default function ContactsPage() {
  const router = useRouter();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');
  
  const [formData, setFormData] = useState({ contactName: '', phoneNumber: '', relation: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const currentToken = localStorage.getItem('token');
    if (!currentToken) {
      router.push('/login');
      return;
    }
    setToken(currentToken);
    fetchContacts(currentToken);
  }, [router]);

  const fetchContacts = async (authToken: string) => {
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/contacts`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data = await res.json();
      if (data.success) {
        setContacts(data.data);
      }
    } catch (err) {
      console.error('Failed to fetch contacts', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/contacts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (data.success) {
        setContacts([data.data, ...contacts]);
        setFormData({ contactName: '', phoneNumber: '', relation: '' });
      } else {
        setError(data.message || 'Failed to add contact');
      }
    } catch (err) {
      setError('Server error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to remove this contact?')) return;
    
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL;
      const res = await fetch(`${apiUrl}/api/contacts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setContacts(contacts.filter(c => c._id !== id));
      }
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  if (loading) return <div>Loading contacts...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h2 className="text-3xl font-bold text-white">Emergency Contacts</h2>
        <p className="text-gray-400 mt-2">These contacts will receive an SOS SMS automatically when you trigger an emergency.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <div className="bg-gray-800 p-6 rounded-xl border border-gray-700">
            <h3 className="text-xl font-semibold mb-4">Add Contact</h3>
            {error && <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-3 rounded mb-4 text-sm">{error}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={formData.contactName}
                  onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Phone Number *</label>
                <input
                  type="tel"
                  required
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+8801700000000"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Relation</label>
                <input
                  type="text"
                  value={formData.relation}
                  onChange={(e) => setFormData({ ...formData, relation: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-700 rounded-md py-2 px-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Father, Friend, etc."
                />
              </div>
              
              <button
                type="submit"
                disabled={submitting || contacts.length >= 5}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-md transition-colors"
              >
                {submitting ? 'Saving...' : 'Add Contact'}
              </button>
              
              {contacts.length >= 5 && (
                <p className="text-xs text-red-400 mt-2 text-center">You have reached the maximum limit of 5 contacts.</p>
              )}
            </form>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
            <div className="p-4 border-b border-gray-700 bg-gray-800/50 flex justify-between items-center">
              <h3 className="font-semibold text-lg">Your Trusted Contacts ({contacts.length}/5)</h3>
            </div>
            
            <ul className="divide-y divide-gray-700">
              {contacts.length === 0 ? (
                <li className="p-8 text-center text-gray-500">
                  You haven't added any emergency contacts yet.
                </li>
              ) : (
                contacts.map(contact => (
                  <li key={contact._id} className="p-4 flex justify-between items-center hover:bg-gray-750 transition-colors">
                    <div>
                      <p className="font-semibold text-white">{contact.contactName}</p>
                      <p className="text-sm text-gray-400 flex items-center gap-3 mt-1">
                        <span>📞 {contact.phoneNumber}</span>
                        {contact.relation && (
                          <span className="bg-gray-700 px-2 py-0.5 rounded-full text-xs">
                            {contact.relation}
                          </span>
                        )}
                      </p>
                    </div>
                    <button 
                      onClick={() => handleDelete(contact._id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 p-2 rounded transition-colors"
                      title="Delete Contact"
                    >
                      🗑️ Remove
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

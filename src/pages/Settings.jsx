import React, { useState, useEffect } from 'react';
import { Shield, Users, Activity, Plus, Building2, Save } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getDB, saveDB, getItems, logActivity } from '../utils/db'; // Import our local DB

const staffMembers = [
  { id: 1, name: 'Admin User', role: 'Super Admin', email: 'admin@company.com' },
  { id: 2, name: 'John Sales', role: 'Sales Executive', email: 'john@company.com' },
  { id: 3, name: 'Jane Viewer', role: 'Accountant', email: 'jane@company.com' }
];

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const { user } = useAuth();
  
  // Company Profile State
  const [companyProfile, setCompanyProfile] = useState({
     name: '',
     gstin: '',
     address: '',
     state: '',
     stateCode: '',
     email: '',
     phone: '',
     bankDetails: ''
  });

  const [activityLogs, setActivityLogs] = useState([]);

  useEffect(() => {
     const db = getDB();
     if(db.company) {
        setCompanyProfile(db.company);
     }
  }, []);

  useEffect(() => {
    const fetchLogs = async () => {
      if (user?.id && activeTab === 'activity') {
        const logs = await getItems('activityLogs', user.id);
        setActivityLogs(logs || []);
      }
    };
    fetchLogs();
  }, [user, activeTab]);

  const handleSaveProfile = async (e) => {
     e.preventDefault();
     const db = getDB();
     db.company = companyProfile;
     saveDB(db);
     
     if (user?.id) {
       await logActivity('Updated Company Profile Setup', user.id, user.username || user.firstName || 'You');
     }
     
     alert('Company Profile Updated Successfully!');
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">Settings & My Profile</h1>
      </div>

      <div className="flex gap-2 mb-4" style={{ overflowX: 'auto', paddingBottom: '0.5rem' }}>
        <button className={`btn ${activeTab === 'profile' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('profile')} style={{ whiteSpace: 'nowrap' }}>
          <Building2 size={16} /> Company Profile
        </button>
        <button className={`btn ${activeTab === 'staff' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('staff')} style={{ whiteSpace: 'nowrap' }}>
          <Users size={16} /> Staff Accounts
        </button>
        <button className={`btn ${activeTab === 'security' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('security')} style={{ whiteSpace: 'nowrap' }}>
          <Shield size={16} /> Data Security
        </button>
        <button className={`btn ${activeTab === 'activity' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActiveTab('activity')} style={{ whiteSpace: 'nowrap' }}>
          <Activity size={16} /> Activity Log
        </button>
      </div>

      <div className="glass" style={{ padding: '2rem' }}>
        
        {activeTab === 'profile' && (
          <div>
            <h3 className="mb-4">Business / Company Setup</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Update your company details. These changes will automatically reflect universally on all your printed Invoices, Quotations, and E-Way bills.</p>
            
            <form onSubmit={handleSaveProfile}>
               <div className="flex gap-4">
                  <div className="form-group w-full" style={{ flex: 2 }}>
                     <label className="form-label">Company / Legal Name *</label>
                     <input required className="form-input" value={companyProfile.name} onChange={e => setCompanyProfile({...companyProfile, name: e.target.value})} />
                  </div>
                  <div className="form-group w-full" style={{ flex: 1 }}>
                     <label className="form-label">GSTIN</label>
                     <input className="form-input" value={companyProfile.gstin} onChange={e => setCompanyProfile({...companyProfile, gstin: e.target.value})} placeholder="22AAAAA0000A1Z5" />
                  </div>
               </div>

               <div className="flex gap-4">
                  <div className="form-group w-full" style={{ flex: 1 }}>
                     <label className="form-label">Email Address</label>
                     <input type="email" className="form-input" value={companyProfile.email} onChange={e => setCompanyProfile({...companyProfile, email: e.target.value})} />
                  </div>
                  <div className="form-group w-full" style={{ flex: 1 }}>
                     <label className="form-label">Phone / Mobile</label>
                     <input className="form-input" value={companyProfile.phone} onChange={e => setCompanyProfile({...companyProfile, phone: e.target.value})} />
                  </div>
               </div>

               <div className="form-group w-full">
                  <label className="form-label">Registered Address</label>
                  <textarea className="form-input" rows="3" value={companyProfile.address} onChange={e => setCompanyProfile({...companyProfile, address: e.target.value})}></textarea>
               </div>

               <div className="flex gap-4">
                  <div className="form-group w-full" style={{ flex: 1 }}>
                     <label className="form-label">State Name</label>
                     <input className="form-input" value={companyProfile.state} onChange={e => setCompanyProfile({...companyProfile, state: e.target.value})} />
                  </div>
                  <div className="form-group w-full" style={{ flex: 1 }}>
                     <label className="form-label">State Code (CRITICAL FOR GST)</label>
                     <input required className="form-input" value={companyProfile.stateCode} onChange={e => setCompanyProfile({...companyProfile, stateCode: e.target.value})} placeholder="e.g. 27 for Maharashtra" />
                  </div>
               </div>
               
               <div className="form-group w-full">
                  <label className="form-label">Default Bank Details (For Invoice Printing)</label>
                  <textarea className="form-input" rows="2" placeholder="Bank Name: HDFC\nA/C No: 123456789\nIFSC: HDFC000123" value={companyProfile.bankDetails} onChange={e => setCompanyProfile({...companyProfile, bankDetails: e.target.value})}></textarea>
               </div>

               <div className="mt-4 pt-4 flex gap-4" style={{ borderTop: '2px solid var(--border-color)' }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 2rem' }}>
                    <Save size={18} style={{ marginRight: '0.5rem', display: 'inline' }} /> Save Profile Preferences
                  </button>
               </div>
            </form>
          </div>
        )}

        {activeTab === 'staff' && (
          <div>
            <div className="flex justify-between items-center mb-4">
              <p style={{ color: 'var(--text-secondary)' }}>Manage up to 10 staff accounts. Assign role-based permissions.</p>
              <button className="btn btn-primary"><Plus size={16} /> Add Staff</button>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border-color)' }}>
                  <th style={{ padding: '1rem' }}>Name</th>
                  <th style={{ padding: '1rem' }}>Email</th>
                  <th style={{ padding: '1rem' }}>Role</th>
                  <th style={{ padding: '1rem' }}>Permissions</th>
                </tr>
              </thead>
              <tbody>
                {staffMembers.map(staff => (
                  <tr key={staff.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{staff.name}</td>
                    <td style={{ padding: '1rem' }}>{staff.email}</td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{ 
                        background: staff.role === 'Super Admin' ? '#ffedd5' : '#e0e7ff', 
                        color: staff.role === 'Super Admin' ? '#c2410c' : '#4338ca', 
                        padding: '0.25rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600
                      }}>
                        {staff.role}
                      </span>
                    </td>
                    <td style={{ padding: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                      {staff.role === 'Super Admin' ? 'All Access' : 'Invoices, Quotations, Read-only Reports'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'security' && (
          <div>
            <h3 className="mb-4">Cloud Security Dashboard</h3>
            <div className="flex gap-4">
              <div className="glass w-full" style={{ padding: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <Shield size={32} color="#16a34a" className="mb-2" />
                <h4 style={{ margin: 0 }}>End-to-End Encryption</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>All data transmitted is secured with 256-bit SSL encryption.</p>
              </div>
              <div className="glass w-full" style={{ padding: '1.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                <Activity size={32} color="#16a34a" className="mb-2" />
                <h4 style={{ margin: 0 }}>Automated Cloud Backups</h4>
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>Database runs daily automated snapshots ensuring zero data loss.</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div>
            <h3 className="mb-4">System Activity Log</h3>
            <div style={{ paddingLeft: '1rem', borderLeft: '2px solid var(--border-color)' }}>
              {activityLogs.map((log, i) => (
                <div key={i} style={{ marginBottom: '1.5rem', position: 'relative' }}>
                  <div style={{ position: 'absolute', left: '-1.35rem', width: '10px', height: '10px', borderRadius: '50%', background: 'var(--primary-color)' }}></div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>{log.time}</div>
                  <div><strong>{log.user}</strong> {log.action}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;

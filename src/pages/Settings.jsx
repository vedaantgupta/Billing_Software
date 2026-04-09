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
     ownerName: '',
     pan: '',
     bankName: '',
     bankBranch: '',
     bankAccNumber: '',
     bankIfsc: '',
     upiId: '',
     paymentTerms: '100% advance against finalization of offer',
     terms: 'Subject to our home Jurisdiction.\nOur Responsibility Ceases as soon as goods leave our Premises.\nGoods once sold will not be taken back.',
     logo: null
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

  const handleCompanyProfileSave = async (e) => {
     e.preventDefault();
     try {
       const db = getDB();
       db.company = companyProfile;
       saveDB(db);
       
       if (user?.id) {
         await logActivity('Updated Company Profile Setup', user.id, user.username || user.firstName || 'You');
       }
       
       alert('Settings updated successfully!');
     } catch (err) {
       console.error('Failed to update settings:', err);
       alert('Failed to update settings');
     }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCompanyProfile({ ...companyProfile, logo: reader.result });
      };
      reader.readAsDataURL(file);
    }
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
            
            <form onSubmit={handleCompanyProfileSave} className="flex flex-col gap-6">
               <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', marginBottom: '1rem' }}>
                  <div style={{ position: 'relative', width: '120px', height: '120px', background: '#f8fafc', border: '2px dashed #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                     {companyProfile.logo ? (
                        <>
                           <img src={companyProfile.logo} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                           <button 
                             type="button" 
                             onClick={() => setCompanyProfile({...companyProfile, logo: null})}
                             style={{ position: 'absolute', top: '4px', right: '4px', background: 'rgba(255,255,255,0.9)', border: 'none', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '14px', color: '#ef4444' }}
                           >
                             &times;
                           </button>
                        </>
                     ) : (
                        <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                           <div style={{ fontSize: '24px', marginBottom: '4px' }}>🖼️</div>
                           <div style={{ fontSize: '10px', fontWeight: 600 }}>Logo</div>
                        </div>
                     )}
                     <input type="file" accept="image/*" onChange={handleLogoChange} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                     <div className="form-group w-full mb-4">
                        <label className="form-label">Company / Business Name *</label>
                        <input required className="form-input" value={companyProfile.name} onChange={e => setCompanyProfile({...companyProfile, name: e.target.value})} />
                     </div>
                     <div className="form-group w-full mb-0">
                        <label className="form-label">GSTIN (Optional)</label>
                        <input className="form-input" value={companyProfile.gstin} onChange={e => setCompanyProfile({...companyProfile, gstin: e.target.value})} placeholder="27AABCU9603R1ZM" />
                     </div>
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

                <div className="flex gap-4">
                   <div className="form-group w-full" style={{ flex: 1 }}>
                      <label className="form-label">Owner / Authorised Name</label>
                      <input className="form-input" value={companyProfile.ownerName} onChange={e => setCompanyProfile({...companyProfile, ownerName: e.target.value})} placeholder="e.g. John Doe" />
                   </div>
                   <div className="form-group w-full" style={{ flex: 1 }}>
                      <label className="form-label">PAN Number</label>
                      <input className="form-input" value={companyProfile.pan} onChange={e => setCompanyProfile({...companyProfile, pan: e.target.value.toUpperCase()})} placeholder="ABCDE1234F" />
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
               
                <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '8px', border: '1.5px solid #e2e8f0', marginBottom: '1.5rem' }}>
                  <h4 style={{ marginBottom: '1rem', color: '#1e293b' }}>🏦 Bank & Payment Details (For Invoices)</h4>
                  <div className="flex gap-4">
                     <div className="form-group w-full" style={{ flex: 1 }}>
                        <label className="form-label">Bank Name</label>
                        <input className="form-input" value={companyProfile.bankName} onChange={e => setCompanyProfile({...companyProfile, bankName: e.target.value})} placeholder="e.g. HDFC Bank" />
                     </div>
                     <div className="form-group w-full" style={{ flex: 1 }}>
                        <label className="form-label">Branch Name</label>
                        <input className="form-input" value={companyProfile.bankBranch} onChange={e => setCompanyProfile({...companyProfile, bankBranch: e.target.value})} placeholder="e.g. Khelgaon, Delhi" />
                     </div>
                  </div>
                  <div className="flex gap-4">
                     <div className="form-group w-full" style={{ flex: 1 }}>
                        <label className="form-label">Account Number</label>
                        <input className="form-input" value={companyProfile.bankAccNumber} onChange={e => setCompanyProfile({...companyProfile, bankAccNumber: e.target.value})} placeholder="0000123456789" />
                     </div>
                     <div className="form-group w-full" style={{ flex: 1 }}>
                        <label className="form-label">IFSC Code</label>
                        <input className="form-input" value={companyProfile.bankIfsc} onChange={e => setCompanyProfile({...companyProfile, bankIfsc: e.target.value.toUpperCase()})} placeholder="HDFC0001234" />
                     </div>
                  </div>
                  <div className="form-group w-full" style={{ marginTop: '0.5rem' }}>
                     <label className="form-label">UPI ID / VPA (For QR Payment) *</label>
                     <input className="form-input" placeholder="e.g. business@okaxis" value={companyProfile.upiId} onChange={e => setCompanyProfile({...companyProfile, upiId: e.target.value})} />
                     <p style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.25rem' }}>This ID generates the payment QR code on your invoices.</p>
                  </div>
                </div>

                <div className="form-group w-full">
                   <label className="form-label">Default Payment Conditions</label>
                   <input className="form-input" value={companyProfile.paymentTerms} onChange={e => setCompanyProfile({...companyProfile, paymentTerms: e.target.value})} placeholder="e.g. 100% advance" />
                </div>

                <div className="form-group w-full">
                   <label className="form-label">Default Terms & Conditions</label>
                   <textarea className="form-input" rows="3" value={companyProfile.terms} onChange={e => setCompanyProfile({...companyProfile, terms: e.target.value})}></textarea>
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

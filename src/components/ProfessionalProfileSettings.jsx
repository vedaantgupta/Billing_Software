import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Save, Plus, Trash2, BookOpen, Briefcase, Award } from 'lucide-react';

const ProfessionalProfileSettings = () => {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [profile, setProfile] = useState({
    about: '',
    skills: '',
    experience: [],
    valueProposition: '',
    website: '',
    whatsapp: '',
    isVerified: false,
    missionStatement: '',
    supportLink: '',
    businessHours: '9:00 AM - 6:00 PM (Mon-Sat)',
    shippingPolicy: 'Ships within 24-48 hours.',
    returnPolicy: '7-day easy returns.',
    awards: '',
    certifications: '',
    profilePicture: '',
    bannerImage: '',
    address: '',
    firstName: '',
    lastName: ''
  });

  useEffect(() => {
    // Fetch current profile data to populate the form
    const fetchProfile = async () => {
      try {
        const response = await fetch(`http://localhost:5000/api/public/profile/${user.id}`);
        if (response.ok) {
          const data = await response.json();
          if (data.user && data.user.professionalProfile) {
            const p = data.user.professionalProfile;
            setProfile({
              about: p.about || '',
              skills: p.skills ? p.skills.join(', ') : '',
              experience: p.experience || [],
              valueProposition: p.valueProposition || '',
              website: p.website || '',
              whatsapp: p.whatsapp || '',
              isVerified: p.isVerified || false,
              missionStatement: p.missionStatement || '',
              supportLink: p.supportLink || '',
              businessHours: p.businessHours || '9:00 AM - 6:00 PM (Mon-Sat)',
              shippingPolicy: p.shippingPolicy || 'Ships within 24-48 hours.',
              returnPolicy: p.returnPolicy || '7-day easy returns.',
              awards: p.awards ? p.awards.join(', ') : '',
              certifications: p.certifications ? p.certifications.join(', ') : '',
              profilePicture: p.profilePicture || '',
              bannerImage: p.bannerImage || '',
              address: p.address || '',
              firstName: data.user.firstName || '',
              lastName: data.user.lastName || ''
            });
          }
        }
      } catch (error) {
        console.error("Error fetching profile", error);
      }
    };
    if (user?.id) fetchProfile();
  }, [user]);

  const handleSave = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const payload = {
        professionalProfile: {
          about: profile.about,
          skills: profile.skills.split(',').map(s => s.trim()).filter(Boolean),
          experience: profile.experience,
          valueProposition: profile.valueProposition,
          website: profile.website,
          whatsapp: profile.whatsapp,
          isVerified: profile.isVerified,
          missionStatement: profile.missionStatement,
          supportLink: profile.supportLink,
          businessHours: profile.businessHours,
          shippingPolicy: profile.shippingPolicy,
          returnPolicy: profile.returnPolicy,
          awards: profile.awards.split(',').map(s => s.trim()).filter(Boolean),
          certifications: profile.certifications.split(',').map(s => s.trim()).filter(Boolean),
          profilePicture: profile.profilePicture,
          bannerImage: profile.bannerImage,
          address: profile.address
        },
        firstName: profile.firstName,
        lastName: profile.lastName
      };

      const response = await fetch(`http://localhost:5000/api/user/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        alert('Professional Profile Updated! It is now visible on your public network profile.');
      } else {
        alert('Failed to update profile.');
      }
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving profile');
    } finally {
      setIsSaving(false);
    }
  };

  const addExperience = () => {
    setProfile(prev => ({
      ...prev,
      experience: [...prev.experience, { id: Date.now(), title: '', company: '', duration: '', description: '' }]
    }));
  };

  const updateExperience = (id, field, value) => {
    setProfile(prev => ({
      ...prev,
      experience: prev.experience.map(exp => exp.id === id ? { ...exp, [field]: value } : exp)
    }));
  };

  const removeExperience = (id) => {
    setProfile(prev => ({
      ...prev,
      experience: prev.experience.filter(exp => exp.id !== id)
    }));
  };

  const handleImageUpload = (e, field) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile(prev => ({ ...prev, [field]: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div>
      <h3 className="mb-4">LinkedIn-Style Professional Profile</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
        This information builds your public business brand. It will be visible to anyone who visits your Network Hub profile, acting as your digital resume and business portfolio.
      </p>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        
        {/* Media Section (Banner & Profile Pic) */}
        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Visual Branding</h4>
          
          <div className="flex flex-col gap-6">
            {/* Banner Image */}
            <div className="form-group">
              <label className="form-label">Banner Image (Recommended 1200x300)</label>
              <div 
                style={{ 
                  width: '100%', 
                  height: '150px', 
                  background: profile.bannerImage ? `url(${profile.bannerImage}) center/cover` : '#e2e8f0', 
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: '2px dashed #cbd5e1',
                  overflow: 'hidden',
                  position: 'relative'
                }}
                onClick={() => document.getElementById('banner-input').click()}
              >
                {!profile.bannerImage && <span style={{ color: '#64748b' }}>Click to upload Banner</span>}
                <input 
                  id="banner-input" 
                  type="file" 
                  hidden 
                  accept="image/*" 
                  onChange={(e) => handleImageUpload(e, 'bannerImage')} 
                />
              </div>
            </div>

            {/* Profile Picture */}
            <div className="form-group">
              <label className="form-label">Profile Picture (Circle)</label>
              <div className="flex items-center gap-6">
                <div 
                  style={{ 
                    width: '100px', 
                    height: '100px', 
                    borderRadius: '50%', 
                    background: profile.profilePicture ? `url(${profile.profilePicture}) center/cover` : '#e2e8f0', 
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: '2px dashed #cbd5e1',
                    overflow: 'hidden'
                  }}
                  onClick={() => document.getElementById('profile-pic-input').click()}
                >
                  {!profile.profilePicture && <span style={{ color: '#64748b', fontSize: '0.7rem' }}>Upload</span>}
                  <input 
                    id="profile-pic-input" 
                    type="file" 
                    hidden 
                    accept="image/*" 
                    onChange={(e) => handleImageUpload(e, 'profilePicture')} 
                  />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0 }}>
                    Upload a professional photo or business logo. This will appear as a circular image on your public profile.
                  </p>
                  {profile.profilePicture && (
                    <button 
                      type="button" 
                      className="btn btn-sm btn-outline mt-2" 
                      onClick={() => setProfile({ ...profile, profilePicture: '' })}
                      style={{ color: '#ef4444', borderColor: '#ef4444' }}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Identity Section */}
        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Brand Identity & Contact</h4>
          <div className="flex gap-4 mb-4">
            <div className="form-group w-full" style={{ flex: 1 }}>
              <label className="form-label">First Name</label>
              <input 
                className="form-input" 
                value={profile.firstName}
                onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
              />
            </div>
            <div className="form-group w-full" style={{ flex: 1 }}>
              <label className="form-label">Last Name</label>
              <input 
                className="form-input" 
                value={profile.lastName}
                onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
              />
            </div>
          </div>
          <div className="form-group mb-4">
            <label className="form-label">Physical Address</label>
            <input 
              className="form-input" 
              placeholder="e.g. 123 Business Ave, Suite 100, City, Country" 
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            />
          </div>
          <div className="flex gap-4 mb-4">
            <div className="form-group w-full" style={{ flex: 1 }}>
              <label className="form-label">Value Proposition (What you solve)</label>
              <input 
                className="form-input" 
                placeholder="e.g. Solving logistics for small businesses" 
                value={profile.valueProposition}
                onChange={(e) => setProfile({ ...profile, valueProposition: e.target.value })}
              />
            </div>
            <div className="form-group w-full" style={{ flex: 1 }}>
              <label className="form-label">Website (Link in Bio)</label>
              <input 
                className="form-input" 
                placeholder="https://yourstore.com" 
                value={profile.website}
                onChange={(e) => setProfile({ ...profile, website: e.target.value })}
              />
            </div>
          </div>
          <div className="flex gap-4 mb-4">
            <div className="form-group w-full" style={{ flex: 1 }}>
              <label className="form-label">WhatsApp (Direct Contact)</label>
              <input 
                className="form-input" 
                placeholder="+91 9999999999" 
                value={profile.whatsapp}
                onChange={(e) => setProfile({ ...profile, whatsapp: e.target.value })}
              />
            </div>
            <div className="form-group w-full" style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <label className="form-label" style={{ margin: 0 }}>Request Verified Badge</label>
              <input 
                type="checkbox" 
                checked={profile.isVerified}
                onChange={(e) => setProfile({ ...profile, isVerified: e.target.checked })}
                style={{ width: '20px', height: '20px' }}
              />
            </div>
          </div>
        </div>

        {/* Bio & Strategy Section */}
        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Mission & Strategy</h4>
          <div className="form-group mb-4">
            <label className="form-label">Mission Statement (Your "Why")</label>
            <textarea 
              className="form-input" 
              rows="2"
              placeholder="e.g. Empowering local businesses with state-of-the-art billing technology." 
              value={profile.missionStatement}
              onChange={(e) => setProfile({ ...profile, missionStatement: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Support / Live Chat Link</label>
            <input 
              className="form-input" 
              placeholder="https://t.me/yourbrand or support desk URL" 
              value={profile.supportLink}
              onChange={(e) => setProfile({ ...profile, supportLink: e.target.value })}
            />
          </div>
        </div>

        {/* Operational Details */}
        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Operational Details</h4>
          <div className="form-group mb-4">
            <label className="form-label">Business Hours</label>
            <input 
              className="form-input" 
              placeholder="e.g. Mon-Fri: 9AM-8PM" 
              value={profile.businessHours}
              onChange={(e) => setProfile({ ...profile, businessHours: e.target.value })}
            />
          </div>
          <div className="flex gap-4">
            <div className="form-group w-full" style={{ flex: 1 }}>
              <label className="form-label">Shipping Timeline</label>
              <input 
                className="form-input" 
                value={profile.shippingPolicy}
                onChange={(e) => setProfile({ ...profile, shippingPolicy: e.target.value })}
              />
            </div>
            <div className="form-group w-full" style={{ flex: 1 }}>
              <label className="form-label">Return Policy</label>
              <input 
                className="form-input" 
                value={profile.returnPolicy}
                onChange={(e) => setProfile({ ...profile, returnPolicy: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Credentials & Awards */}
        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)' }}>Credentials & Awards</h4>
          <div className="form-group mb-4">
            <label className="form-label">Awards (Comma separated)</label>
            <input 
              className="form-input" 
              placeholder="Best Startup 2024, Innovation Excellence..." 
              value={profile.awards}
              onChange={(e) => setProfile({ ...profile, awards: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label className="form-label">Industry Certifications (Comma separated)</label>
            <input 
              className="form-input" 
              placeholder="ISO 9001, GST Verified, MSME Registered..." 
              value={profile.certifications}
              onChange={(e) => setProfile({ ...profile, certifications: e.target.value })}
            />
          </div>
        </div>

        {/* About Section */}
        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>
            <BookOpen size={20} /> About (Summary)
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            <strong>Best Practice:</strong> Tell a story. Cover your present, past, and future goals. End with a clear Call to Action. (Max 2600 characters).
          </p>
          <textarea 
            className="form-input" 
            rows="6" 
            placeholder="Write your professional story here..."
            value={profile.about}
            onChange={(e) => setProfile({ ...profile, about: e.target.value })}
            maxLength={2600}
            style={{ fontFamily: 'inherit' }}
          />
          <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            {profile.about.length} / 2600
          </div>
        </div>

        {/* Skills Section */}
        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--primary-color)' }}>
            <Award size={20} /> Skills & Endorsements
          </h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
            <strong>SEO Optimization:</strong> Include industry-specific keywords separated by commas to help your profile appear in searches.
          </p>
          <input 
            className="form-input" 
            type="text"
            placeholder="e.g. Supply Chain Management, B2B Sales, React Development"
            value={profile.skills}
            onChange={(e) => setProfile({ ...profile, skills: e.target.value })}
          />
        </div>

        {/* Experience Section */}
        <div style={{ padding: '1.5rem', background: '#f8fafc', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0, color: 'var(--primary-color)' }}>
              <Briefcase size={20} /> Experience
            </h4>
            <button type="button" onClick={addExperience} className="btn btn-secondary btn-sm" style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <Plus size={16} /> Add Role
            </button>
          </div>

          {profile.experience.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No experience added yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {profile.experience.map((exp, index) => (
                <div key={exp.id} style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', border: '1px solid var(--border-color)', position: 'relative' }}>
                  <button 
                    type="button"
                    onClick={() => removeExperience(exp.id)}
                    style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer' }}
                  >
                    <Trash2 size={18} />
                  </button>
                  
                  <div className="flex gap-4 mb-4">
                    <div className="form-group w-full" style={{ flex: 1 }}>
                      <label className="form-label">Job Title / Role</label>
                      <input className="form-input" value={exp.title} onChange={(e) => updateExperience(exp.id, 'title', e.target.value)} placeholder="e.g. Founder & CEO" required />
                    </div>
                    <div className="form-group w-full" style={{ flex: 1 }}>
                      <label className="form-label">Company Name</label>
                      <input className="form-input" value={exp.company} onChange={(e) => updateExperience(exp.id, 'company', e.target.value)} placeholder="e.g. Acme Corp" required />
                    </div>
                  </div>
                  
                  <div className="form-group w-full mb-4">
                    <label className="form-label">Duration</label>
                    <input className="form-input" value={exp.duration} onChange={(e) => updateExperience(exp.id, 'duration', e.target.value)} placeholder="e.g. Jan 2020 - Present" />
                  </div>

                  <div className="form-group w-full m-0">
                    <label className="form-label">Description & Achievements</label>
                    <textarea className="form-input" rows="3" value={exp.description} onChange={(e) => updateExperience(exp.id, 'description', e.target.value)} placeholder="Describe your key responsibilities and achievements..." />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4" style={{ borderTop: '2px solid var(--border-color)' }}>
          <button type="submit" className="btn btn-primary" disabled={isSaving} style={{ padding: '0.75rem 2rem' }}>
            <Save size={18} style={{ marginRight: '0.5rem', display: 'inline' }} /> 
            {isSaving ? 'Saving Profile...' : 'Save Professional Profile'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ProfessionalProfileSettings;

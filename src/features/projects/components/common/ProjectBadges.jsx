import React from 'react';
import {
  AlertCircle, CheckCircle2, Clock, ShieldAlert,
  Flame, ArrowUp, ArrowRight, ArrowDown, HelpCircle
} from 'lucide-react';

export const StatusBadge = ({ status = 'To Do', size = 'md', onClick }) => {
  const normalized = (status || 'To Do').toLowerCase();
  let className = 'pm-badge pm-badge-status-todo';
  let icon = <Clock size={12} />;

  if (normalized.includes('progress') || normalized === 'active') {
    className = 'pm-badge pm-badge-status-progress';
    icon = <Clock size={12} />;
  } else if (normalized.includes('review')) {
    className = 'pm-badge pm-badge-status-review';
    icon = <HelpCircle size={12} />;
  } else if (normalized.includes('done') || normalized.includes('completed')) {
    className = 'pm-badge pm-badge-status-done';
    icon = <CheckCircle2 size={12} />;
  } else if (normalized.includes('blocked') || normalized.includes('risk')) {
    className = 'pm-badge pm-badge-status-blocked';
    icon = <ShieldAlert size={12} />;
  }

  return (
    <span
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {icon}
      <span>{status}</span>
    </span>
  );
};

export const PriorityBadge = ({ priority = 'Medium', onClick }) => {
  const normalized = (priority || 'Medium').toLowerCase();
  let className = 'pm-badge pm-badge-priority-medium';
  let icon = <ArrowRight size={12} />;

  if (normalized === 'urgent') {
    className = 'pm-badge pm-badge-priority-urgent';
    icon = <Flame size={12} />;
  } else if (normalized === 'high') {
    className = 'pm-badge pm-badge-priority-high';
    icon = <ArrowUp size={12} />;
  } else if (normalized === 'low') {
    className = 'pm-badge pm-badge-priority-low';
    icon = <ArrowDown size={12} />;
  }

  return (
    <span
      className={className}
      onClick={onClick}
      style={{ cursor: onClick ? 'pointer' : 'default' }}
    >
      {icon}
      <span>{priority}</span>
    </span>
  );
};

export const HealthBadge = ({ health, showReasons = false }) => {
  if (!health) return null;
  const status = health.status || 'On Track';
  let className = 'pm-badge pm-badge-health-ontrack';

  if (status === 'Critical') {
    className = 'pm-badge pm-badge-health-critical';
  } else if (status === 'At Risk') {
    className = 'pm-badge pm-badge-health-atrisk';
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', gap: '4px' }}>
      <span className={className} title={health.reasons?.join('\n')}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: health.color || 'currentColor' }} />
        <span>{status}</span>
        {health.score !== undefined && <span style={{ opacity: 0.8 }}>({health.score}%)</span>}
      </span>
      {showReasons && health.reasons?.length > 0 && (
        <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '2px' }}>
          {health.reasons[0]}
        </div>
      )}
    </div>
  );
};

export const UserAvatarGroup = ({ userIds = [], users = [], max = 3 }) => {
  if (!userIds || userIds.length === 0) {
    return <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Unassigned</span>;
  }

  const assignedUsers = userIds.map(uid => {
    return users.find(u => u.id === uid || u._dbId === uid || u.userId === uid) || { name: 'User', id: uid };
  });

  const visible = assignedUsers.slice(0, max);
  const remainder = assignedUsers.length - max;

  return (
    <div className="pm-avatar-group">
      {visible.map((u, i) => {
        const name = u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'U';
        const initial = name[0]?.toUpperCase() || 'U';
        return (
          <div key={u.id || i} className="pm-avatar" title={name}>
            {initial}
          </div>
        );
      })}
      {remainder > 0 && (
        <div className="pm-avatar" style={{ background: '#cbd5e1', color: '#334155' }}>
          +{remainder}
        </div>
      )}
    </div>
  );
};

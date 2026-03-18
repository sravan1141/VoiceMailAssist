import React, { useState, useEffect } from 'react';
import { adminApi } from '../../api';
import {
    Users, BarChart2, MessageCircle, Trash2, Shield, ShieldOff,
    ArrowLeft, RefreshCw, Activity, Server, AlertTriangle,
    Mail, Phone, Star, ChevronRight, X, Globe, Mic, ScanFace
} from 'lucide-react';
import { useLang } from '../../lib/LanguageContext';
import './AdminDashboard.css';

/* ── tiny helpers ── */
const fmt = (ts) => ts ? new Date(ts * 1000).toLocaleString() : '—';
const fmtDate = (ts) => ts ? new Date(ts * 1000).toLocaleDateString() : '—';

/* ── User Profile Drawer ────────────────────────────────────────────────────── */
const UserProfileDrawer = ({ userId, onClose }) => {
    const { t, replaceT } = useLang();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState('overview');

    useEffect(() => {
        setLoading(true);
        adminApi.getUserAnalytics(userId)
            .then(r => { if (r.ok) setData(r.analytics); })
            .finally(() => setLoading(false));
    }, [userId]);

    if (loading) return (
        <div className="drawer-overlay">
            <div className="drawer">
                <div className="admin-loading"><RefreshCw size={24} className="spin" /><span>{t.loading}</span></div>
            </div>
        </div>
    );
    if (!data) return null;

    const tabs = ['overview', 'contacts', 'whatsapp', 'telegram'];

    return (
        <div className="drawer-overlay" onClick={onClose}>
            <div className="drawer" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="drawer-header">
                    <div className="drawer-user-info">
                        <div className="drawer-avatar">{data.name?.[0]?.toUpperCase() || '?'}</div>
                        <div>
                            <div className="drawer-username">@{data.username}</div>
                            <div className="drawer-name">{data.name}</div>
                            {data.email && <div className="drawer-email">{data.email}</div>}
                        </div>
                    </div>
                    <button className="drawer-close" onClick={onClose}><X size={20} /></button>
                </div>

                {/* Badges */}
                <div className="drawer-badges">
                    {data.is_admin ? <span className="badge admin">⚡ Admin</span> : <span className="badge user">User</span>}
                    {data.has_face ? <span className="badge green"><ScanFace size={12}/> Face ID</span> : null}
                    {data.has_voice ? <span className="badge blue"><Mic size={12}/> Voice ID</span> : null}
                    <span className="badge lang"><Globe size={12}/> {data.language_preference || 'en-US'}</span>
                    <span className="badge muted">Joined: {fmtDate(data.created_at)}</span>
                </div>

                {/* Quick Stats */}
                <div className="drawer-stats">
                    <div className="dstat"><div className="dstat-val">{data.contacts?.length || 0}</div><div className="dstat-lbl">Contacts</div></div>
                    <div className="dstat"><div className="dstat-val">{(data.whatsapp?.sent||0)+(data.whatsapp?.received||0)}</div><div className="dstat-lbl">WhatsApp</div></div>
                    <div className="dstat"><div className="dstat-val">{(data.telegram?.sent||0)+(data.telegram?.received||0)}</div><div className="dstat-lbl">Telegram</div></div>
                    <div className="dstat"><div className="dstat-val">{data.gmails?.length || 0}</div><div className="dstat-lbl">Gmail acc.</div></div>
                </div>

                {/* Tabs */}
                <div className="drawer-tabs">
                    {tabs.map(tb => (
                        <button key={tb} className={`drawer-tab ${tab === tb ? 'active' : ''}`} onClick={() => setTab(tb)}>
                            {tb.charAt(0).toUpperCase() + tb.slice(1)}
                        </button>
                    ))}
                </div>

                <div className="drawer-body">
                    {/* OVERVIEW */}
                    {tab === 'overview' && (
                        <div>
                            <h4>Linked Gmail Accounts</h4>
                            {data.gmails?.length === 0 ? <p className="empty-drawer">No Gmail linked</p> : data.gmails?.map(g => (
                                <div key={g.id} className="drawer-row">
                                    <Mail size={14} /><span>{g.gmail_address}</span>
                                    <span className="muted">{g.label}</span>
                                </div>
                            ))}
                            <h4 style={{marginTop:16}}>App Activity Summary</h4>
                            <div className="drawer-app-row">
                                <MessageCircle size={16} style={{color:'#25D366'}}/>
                                <span>WhatsApp</span>
                                <span className="muted">{data.whatsapp?.sent||0} sent · {data.whatsapp?.received||0} received</span>
                            </div>
                            <div className="drawer-app-row">
                                <MessageCircle size={16} style={{color:'#2AABEE'}}/>
                                <span>Telegram</span>
                                <span className="muted">{data.telegram?.sent||0} sent · {data.telegram?.received||0} received</span>
                            </div>
                        </div>
                    )}

                    {/* CONTACTS */}
                    {tab === 'contacts' && (
                        <div>
                            {data.contacts?.length === 0 ? <p className="empty-drawer">No contacts</p> : data.contacts?.map(c => (
                                <div key={c.id} className="drawer-row">
                                    <span className="drawer-contact-avatar">{c.name?.[0]?.toUpperCase()}</span>
                                    <div style={{flex:1}}>
                                        <div style={{fontWeight:600}}>{c.name} {c.is_starred ? <Star size={11} fill="gold" color="gold"/> : null}</div>
                                        {c.phone_number && <div className="muted"><Phone size={10}/> {c.phone_number}</div>}
                                        {c.telegram_chat_id && <div className="muted">TG: {c.telegram_chat_id}</div>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* WHATSAPP */}
                    {tab === 'whatsapp' && (
                        <div>
                            <div className="drawer-mini-stats">
                                <span>Sent: <b>{data.whatsapp?.sent||0}</b></span>
                                <span>Received: <b>{data.whatsapp?.received||0}</b></span>
                            </div>
                            <h4>Recent Messages</h4>
                            {data.whatsapp?.recent?.length === 0 ? <p className="empty-drawer">No messages</p> :
                                data.whatsapp?.recent?.map(m => (
                                    <div key={m.id} className={`msg-row ${m.direction}`}>
                                        <div className="msg-contact">{m.contact_name || m.phone_number}</div>
                                        <div className="msg-text">{m.message_text?.slice(0,80)}{m.message_text?.length>80?'…':''}</div>
                                        <div className="msg-time">{fmt(m.timestamp)}</div>
                                    </div>
                                ))
                            }
                        </div>
                    )}

                    {/* TELEGRAM */}
                    {tab === 'telegram' && (
                        <div>
                            <div className="drawer-mini-stats">
                                <span>Sent: <b>{data.telegram?.sent||0}</b></span>
                                <span>Received: <b>{data.telegram?.received||0}</b></span>
                            </div>
                            <h4>Recent Messages</h4>
                            {data.telegram?.recent?.length === 0 ? <p className="empty-drawer">No messages</p> :
                                data.telegram?.recent?.map(m => (
                                    <div key={m.id} className={`msg-row ${m.direction}`}>
                                        <div className="msg-contact">{m.contact_name || m.telegram_chat_id}</div>
                                        <div className="msg-text">{m.message_text?.slice(0,80)}{m.message_text?.length>80?'…':''}</div>
                                        <div className="msg-time">{fmt(m.timestamp)}</div>
                                    </div>
                                ))
                            }
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

/* ── AdminDashboard ─────────────────────────────────────────────────────────── */
const AdminDashboard = ({ user, onBack }) => {
    const { t, replaceT } = useLang();
    const [activeTab, setActiveTab] = useState('stats');

    const [users, setUsers]       = useState([]);
    const [stats, setStats]       = useState(null);
    const [activity, setActivity] = useState([]);
    const [system, setSystem]     = useState(null);
    const [errors, setErrors]     = useState([]);

    const [loading, setLoading]           = useState(false);
    const [error, setError]               = useState('');
    const [selectedUserId, setSelectedUserId] = useState(null);

    const fetchStats    = async () => { try { const r = await adminApi.getStats();    if (r.ok) setStats(r.stats);       } catch(e){ setError(e.message);} };
    const fetchUsers    = async () => { try { const r = await adminApi.getUsers();    if (r.ok) setUsers(r.users);       } catch(e){ setError(e.message);} };
    const fetchActivity = async () => { try { const r = await adminApi.getActivity(); if (r.ok) setActivity(r.activity); } catch(e){ setError(e.message);} };
    const fetchSystem   = async () => { try { const r = await adminApi.getSystem();   if (r.ok) setSystem(r.system);     } catch(e){ setError(e.message);} };
    const fetchErrors   = async () => { try { const r = await adminApi.getErrors();   if (r.ok) setErrors(r.errors||[]); } catch(e){ setError(e.message);} };

    useEffect(() => {
        setLoading(true); setError('');
        const load = {
            stats:    () => Promise.all([fetchStats(), fetchUsers()]),
            users:    () => fetchUsers(),
            activity: () => fetchActivity(),
            system:   () => fetchSystem(),
            errors:   () => fetchErrors(),
        };
        (load[activeTab] || load.stats)().finally(() => setLoading(false));
    }, [activeTab]);

    const handleToggleAdmin = async (userId) => {
        if (!window.confirm(t.confirmToggleAdmin)) return;
        try { await adminApi.toggleAdmin(userId); fetchUsers(); } catch(e){ alert(e.message); }
    };

    const handleDeleteUser = async (userId, name) => {
        if (userId === user.id) { alert(t.cannotDeleteSelf); return; }
        if (!window.confirm(replaceT(t.confirmDeleteUser, { name }))) return;
        try { await adminApi.deleteUser(userId); fetchUsers(); if(activeTab==='stats') fetchStats(); } catch(e){ alert(e.message); }
    };

    const handleRefresh = () => {
        setLoading(true); setError('');
        const load = { stats:() => Promise.all([fetchStats(),fetchUsers()]), users:()=>fetchUsers(), activity:()=>fetchActivity(), system:()=>fetchSystem(), errors:()=>fetchErrors() };
        (load[activeTab]||load.stats)().finally(()=>setLoading(false));
    };

    const NAV = [
        { id:'stats',    icon:<BarChart2 size={17}/>,     label: t.platformOverview  },
        { id:'users',    icon:<Users size={17}/>,          label: t.userManagement    },
        { id:'activity', icon:<Activity size={17}/>,       label: t.activityLog       },
        { id:'system',   icon:<Server size={17}/>,         label: t.systemMonitor     },
        { id:'errors',   icon:<AlertTriangle size={17}/>,  label: t.errorLog          },
    ];

    return (
        <div className="admin-container">
            {/* Sidebar */}
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <button className="admin-back-btn" onClick={onBack}><ArrowLeft size={18}/> {t.back}</button>
                    <div className="admin-brand"><Shield size={22}/><span>{t.adminPanelTitle}</span></div>
                </div>
                <nav className="admin-nav">
                    {NAV.map(n => (
                        <button key={n.id} className={`admin-nav-item ${activeTab===n.id?'active':''}`} onClick={()=>setActiveTab(n.id)}>
                            {n.icon} {n.label}
                        </button>
                    ))}
                </nav>
                <div className="admin-sidebar-footer">
                    <div className="admin-user-badge">
                        <div className="admin-avatar">{user?.name?.[0]?.toUpperCase()||'A'}</div>
                        <div>
                            <div className="admin-user-name">{user?.name||'Admin'}</div>
                            <div className="admin-user-role">{t.superAdmin}</div>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <main className="admin-main">
                {loading && <div className="admin-loading"><RefreshCw size={24} className="spin"/><span>{t.loading}</span></div>}
                {error && <div className="admin-error">{error}</div>}

                {/* ── STATS ── */}
                {activeTab==='stats' && stats && (
                    <div className="admin-content">
                        <div className="admin-header">
                            <h1>{t.platformOverview}</h1>
                            <button className="admin-refresh-btn" onClick={handleRefresh}><RefreshCw size={16}/> {t.refresh}</button>
                        </div>
                        <div className="stats-grid">
                            <div className="stat-card primary"><div className="stat-icon"><Users size={28}/></div><div className="stat-value">{stats.totalUsers}</div><div className="stat-label">{t.totalUsers}</div></div>
                            <div className="stat-card warning"><div className="stat-icon"><Shield size={28}/></div><div className="stat-value">{stats.adminUsers}</div><div className="stat-label">{t.admins}</div></div>
                            <div className="stat-card green"><div className="stat-icon"><MessageCircle size={28}/></div><div className="stat-value">{stats.totalWhatsApp}</div><div className="stat-label">{t.whatsappMessages}</div></div>
                            <div className="stat-card blue"><div className="stat-icon"><MessageCircle size={28}/></div><div className="stat-value">{stats.totalTelegram}</div><div className="stat-label">{t.telegramMessages}</div></div>
                            <div className="stat-card purple"><div className="stat-icon"><Users size={28}/></div><div className="stat-value">{stats.totalContacts}</div><div className="stat-label">{t.totalContacts}</div></div>
                        </div>
                        <div className="recent-users-section">
                            <h2>{t.recentlyJoined}</h2>
                            {stats.recentUsers.map(u => (
                                <div key={u.id} className="recent-user-row" style={{cursor:'pointer'}} onClick={()=>setSelectedUserId(u.id)}>
                                    <div className="recent-user-avatar">{u.name?.[0]?.toUpperCase()||'?'}</div>
                                    <div><div className="recent-user-name">{u.name}</div><div className="recent-user-email">{u.email||u.username}</div></div>
                                    <div className="recent-user-date">{fmtDate(u.created_at)}</div>
                                    <ChevronRight size={16} style={{color:'rgba(255,255,255,0.3)',marginLeft:'auto'}}/>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* ── USERS ── */}
                {activeTab==='users' && (
                    <div className="admin-content">
                        <div className="admin-header">
                            <h1>{t.userManagement}</h1>
                            <div className="admin-header-actions">
                                <span className="user-count-badge">{replaceT(t.nUsers,{n:users.length})}</span>
                                <button className="admin-refresh-btn" onClick={handleRefresh}><RefreshCw size={16}/> {t.refresh}</button>
                            </div>
                        </div>
                        <div className="users-table-wrapper">
                            <table className="users-table">
                                <thead><tr>
                                    <th>User</th><th>Contacts</th><th>WhatsApp</th><th>Telegram</th><th>Auth</th><th>Admin</th><th>Actions</th>
                                </tr></thead>
                                <tbody>
                                    {users.map(u => (
                                        <tr key={u.id} className={u.is_admin?'admin-row':''}>
                                            <td>
                                                <div className="user-cell" style={{cursor:'pointer'}} onClick={()=>setSelectedUserId(u.id)}>
                                                    <div className="user-cell-avatar">{u.name?.[0]?.toUpperCase()||'?'}</div>
                                                    <div>
                                                        <div className="user-cell-name">{u.name} <ChevronRight size={12} style={{opacity:0.4}}/></div>
                                                        <div className="user-cell-email">@{u.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td><span className="count-badge">{u.contact_count}</span></td>
                                            <td><span className="count-badge green">{u.whatsapp_msg_count}</span></td>
                                            <td><span className="count-badge blue">{u.telegram_msg_count}</span></td>
                                            <td>
                                                <div style={{display:'flex',gap:4}}>
                                                    {u.has_face?<span title="Face ID" style={{fontSize:14}}>📷</span>:null}
                                                    {u.has_voice?<span title="Voice ID" style={{fontSize:14}}>🎤</span>:null}
                                                </div>
                                            </td>
                                            <td>{u.is_admin?<span className="admin-badge">✓ Admin</span>:<span className="user-badge">User</span>}</td>
                                            <td>
                                                <div className="action-btns">
                                                    <button className={`action-btn ${u.is_admin?'demote':'promote'}`} onClick={()=>handleToggleAdmin(u.id)} title={u.is_admin?t.removeAdmin:t.makeAdmin} disabled={u.id===user.id}>
                                                        {u.is_admin?<ShieldOff size={14}/>:<Shield size={14}/>}
                                                    </button>
                                                    <button className="action-btn delete" onClick={()=>handleDeleteUser(u.id,u.name)} title={t.deleteUser} disabled={u.id===user.id}>
                                                        <Trash2 size={14}/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ── ACTIVITY ── */}
                {activeTab==='activity' && (
                    <div className="admin-content">
                        <div className="admin-header">
                            <h1>{t.activityLog}</h1>
                            <button className="admin-refresh-btn" onClick={handleRefresh}><RefreshCw size={16}/> {t.refresh}</button>
                        </div>
                        <div className="admin-list-container">
                            {activity.length===0 ? <div className="empty-state">{t.noActivity}</div> :
                                activity.map((act,i) => (
                                    <div key={i} className="admin-list-item">
                                        <div className={`admin-list-icon ${act.platform==='whatsapp'?'green-icon':'blue-icon'}`}>
                                            <MessageCircle size={18}/>
                                        </div>
                                        <div className="admin-list-details">
                                            <strong>{act.user_name}</strong> → <em>{act.contact_name||'unknown'}</em>
                                            <div className="muted" style={{marginTop:2}}>{act.platform.toUpperCase()} · {act.direction} · {act.message_text?.slice(0,60)}</div>
                                        </div>
                                        <div className="admin-list-time">{fmt(act.timestamp)}</div>
                                    </div>
                                ))
                            }
                        </div>
                    </div>
                )}

                {/* ── SYSTEM ── */}
                {activeTab==='system' && system && (
                    <div className="admin-content">
                        <div className="admin-header">
                            <h1>{t.systemMonitor}</h1>
                            <button className="admin-refresh-btn" onClick={handleRefresh}><RefreshCw size={16}/> {t.refresh}</button>
                        </div>
                        <div className="system-grid">
                            <div className="system-card"><h3>{t.serverUptime}</h3><p>{Math.floor(system.uptime/3600)}h {Math.floor((system.uptime%3600)/60)}m {system.uptime%60}s</p></div>
                            <div className="system-card"><h3>{t.memoryUsage}</h3><p>{system.memHeapUsed} MB / {system.memHeapTotal} MB</p></div>
                            <div className="system-card"><h3>{t.nodeVersion}</h3><p>{system.nodeVersion}</p></div>
                            <div className="system-card"><h3>{t.platform}</h3><p>{system.platform}</p></div>
                            <div className="system-card"><h3>{t.processId}</h3><p>{system.pid}</p></div>
                            <div className="system-card"><h3>DB Users</h3><p>{system.dbStats?.users}</p></div>
                            <div className="system-card"><h3>DB Contacts</h3><p>{system.dbStats?.contacts}</p></div>
                            <div className="system-card"><h3>WA Messages</h3><p>{system.dbStats?.whatsappMessages}</p></div>
                        </div>
                    </div>
                )}

                {/* ── ERRORS ── */}
                {activeTab==='errors' && (
                    <div className="admin-content">
                        <div className="admin-header">
                            <h1>{t.errorLog}</h1>
                            <button className="admin-refresh-btn" onClick={handleRefresh}><RefreshCw size={16}/> {t.refresh}</button>
                        </div>
                        <div className="admin-list-container">
                            {errors.length===0 ? (
                                <div className="empty-state"><Shield size={32} style={{color:'#4caf50',marginBottom:10}}/><div>{t.errorLogEmpty}</div></div>
                            ) : errors.map((err,i)=>(
                                <div key={i} className="admin-list-item error-item">
                                    <div className="admin-list-icon error"><AlertTriangle size={18}/></div>
                                    <div className="admin-list-details">
                                        <div className="error-endpoint">{err.method} {err.url}</div>
                                        <div className="error-message">{err.error}</div>
                                        {err.username && <div className="error-user">User: @{err.username}</div>}
                                    </div>
                                    <div className="admin-list-time">{fmt(err.created_at)}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Per-user profile drawer */}
            {selectedUserId && <UserProfileDrawer userId={selectedUserId} onClose={()=>setSelectedUserId(null)}/>}
        </div>
    );
};

export default AdminDashboard;

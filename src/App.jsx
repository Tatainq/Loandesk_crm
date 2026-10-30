import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { ShieldCheck, Plus, Search, LogOut, RefreshCw, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

const SUPABASE_URL = 'https://YOUR_SUPABASE_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export default function App() {
  const [session, setSession] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState([]);
  const [emiSchedules, setEmiSchedules] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchAllData();
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchAllData();
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchAllData = async () => {
    setLoading(true);
    const { data: custData } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
    const { data: emiData } = await supabase.from('emi_schedules').select('*, customers(full_name, mobile_number)');
    
    if (custData) setCustomers(custData);
    if (emiData) setEmiSchedules(emiData);
    setLoading(false);
  };

  if (!session) {
    return <AuthScreen onLogin={fetchAllData} />;
  }

  return (
    <div style={{display:'flex',height:'100vh',background:'#f8fafc',fontFamily:'system-ui,sans-serif'}}>
      <aside style={{width:'240px',background:'#1e293b',color:'white',padding:'1rem',display:'flex',flexDirection:'column'}}>
        <div style={{display:'flex',alignItems:'center',gap:'0.5rem',marginBottom:'2rem'}}>
          <ShieldCheck color="#2563eb" />
          <h2 style={{fontSize:'1.2rem',margin:0}}>LoanDesk <span style={{color:'#2563eb'}}>CRM</span></h2>
        </div>
        <nav style={{display:'flex',flexDirection:'column',gap:'0.5rem',flex:1}}>
          <button onClick={() => setActiveTab('dashboard')} style={navBtnStyle(activeTab === 'dashboard')}>Dashboard</button>
          <button onClick={() => setActiveTab('customers')} style={navBtnStyle(activeTab === 'customers')}>Customers</button>
          <button onClick={() => setActiveTab('emi')} style={navBtnStyle(activeTab === 'emi')}>EMI Management</button>
          <button onClick={() => setActiveTab('reports')} style={navBtnStyle(activeTab === 'reports')}>Reports</button>
        </nav>
        <button onClick={() => supabase.auth.signOut()} style={{background:'transparent',border:'none',color:'#94a3b8',cursor:'pointer',display:'flex',alignItems:'center',gap:'0.5rem'}}>
          <LogOut size={16} /> Logout
        </button>
      </aside>

      <main style={{flex:1,display:'flex',flexDirection:'column',overflowY:'auto'}}>
        <header style={{background:'white',padding:'1rem 2rem',borderBottom:'1px solid #e2e8f0',display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div style={{display:'flex',alignItems:'center',gap:'0.5rem',background:'#f1f5f9',padding:'0.5rem 1rem',borderRadius:'8px',width:'300px'}}>
            <Search size={18} color="#64748b" />
            <input type="text" placeholder="Search customer..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{border:'none',background:'transparent',outline:'none',width:'100%'}} />
          </div>
          <button onClick={() => setIsModalOpen(true)} style={{background:'#2563eb',color:'white',border:'none',padding:'0.5rem 1rem',borderRadius:'6px',cursor:'pointer',display:'flex',alignItems:'center',gap:'0.5rem'}}>
            <Plus size={16} /> New Customer
          </button>
        </header>

        {loading ? (
          <div style={{padding:'3rem',textAlign:'center'}}><RefreshCw className="spin" /> Loading...</div>
        ) : (
          <div style={{padding:'1.5rem'}}>
            {activeTab === 'dashboard' && <DashboardView customers={customers} emiSchedules={emiSchedules} />}
            {activeTab === 'customers' && <CustomersView customers={customers} searchQuery={searchQuery} />}
            {activeTab === 'emi' && <EMIManagerView emiSchedules={emiSchedules} fetchAllData={fetchAllData} />}
            {activeTab === 'reports' && <ReportsView customers={customers} />}
          </div>
        )}
      </main>

      {isModalOpen && <CustomerModal onClose={() => setIsModalOpen(false)} onSuccess={() => { setIsModalOpen(false); fetchAllData(); }} />}
    </div>
  );
}

function navBtnStyle(active) {
  return {
    width:'100%',padding:'0.75rem',borderRadius:'6px',background: active ? '#2563eb' : 'transparent',
    color: active ? 'white' : '#94a3b8',border:'none',textAlign:'left',cursor:'pointer'
  };
}

function AuthScreen({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else onLogin();
  };

  return (
    <div style={{display:'flex',justifyContent:'center',alignItems:'center',height:'100vh',background:'#0f172a'}}>
      <form onSubmit={handleLogin} style={{background:'white',padding:'2rem',borderRadius:'8px',width:'320px',display:'flex',flexDirection:'column',gap:'1rem'}}>
        <h2 style={{margin:0,color:'#1e293b'}}>LoanDesk Login</h2>
        {error && <div style={{color:'red',fontSize:'0.85rem'}}>{error}</div>}
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{padding:'0.75rem',border:'1px solid #cbd5e1',borderRadius:'4px'}} />
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{padding:'0.75rem',border:'1px solid #cbd5e1',borderRadius:'4px'}} />
        <button type="submit" style={{background:'#2563eb',color:'white',border:'none',padding:'0.75rem',borderRadius:'4px',fontWeight:'bold',cursor:'pointer'}}>Sign In</button>
      </form>
    </div>
  );
}

function DashboardView({ customers, emiSchedules }) {
  return (
    <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(200px, 1fr))',gap:'1rem'}}>
      <div style={{background:'white',padding:'1.5rem',borderRadius:'8px',borderLeft:'4px solid #2563eb'}}>
        <span style={{color:'#64748b',fontSize:'0.85rem'}}>Total Customers</span>
        <h2 style={{margin:'0.5rem 0 0 0'}}>{customers.length}</h2>
      </div>
      <div style={{background:'white',padding:'1.5rem',borderRadius:'8px',borderLeft:'4px solid #10b981'}}>
        <span style={{color:'#64748b',fontSize:'0.85rem'}}>Active EMIs</span>
        <h2 style={{margin:'0.5rem 0 0 0'}}>{emiSchedules.length}</h2>
      </div>
    </div>
  );
}

function CustomersView({ customers, searchQuery }) {
  const filtered = customers.filter(c => c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || c.mobile_number?.includes(searchQuery));
  return (
    <div style={{background:'white',padding:'1.5rem',borderRadius:'8px'}}>
      <h3>Customer Directory</h3>
      <table style={{width:'100%',borderCollapse:'collapse',marginTop:'1rem'}}>
        <thead>
          <tr style={{borderBottom:'2px solid #e2e8f0',textAlign:'left'}}>
            <th style={{padding:'0.75rem'}}>Account #</th><th>Name</th><th>Mobile</th><th>Loan Amount</th><th>Stage</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map(c => (
            <tr key={c.id} style={{borderBottom:'1px solid #e2e8f0'}}>
              <td style={{padding:'0.75rem'}}>{c.loan_account_number}</td>
              <td>{c.full_name}</td>
              <td>{c.mobile_number}</td>
              <td>₹{c.loan_amount}</td>
              <td>{c.current_stage}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EMIManagerView({ emiSchedules, fetchAllData }) {
  const handleMarkAsPaid = async (emi) => {
    const nextDate = new Date(new Date(emi.due_date).setMonth(new Date(emi.due_date).getMonth() + 1)).toISOString().split('T')[0];
    await supabase.from('emi_schedules').update({ due_date: nextDate, payment_status: 'Pending' }).eq('id', emi.id);
    alert('EMI Marked as Paid!');
    fetchAllData();
  };

  return (
    <div style={{background:'white',padding:'1.5rem',borderRadius:'8px'}}>
      <h3>EMI Management</h3>
      <table style={{width:'100%',borderCollapse:'collapse',marginTop:'1rem'}}>
        <thead>
          <tr style={{borderBottom:'2px solid #e2e8f0',textAlign:'left'}}>
            <th style={{padding:'0.75rem'}}>Account #</th><th>Customer</th><th>Amount</th><th>Due Date</th><th>Action</th>
          </tr>
        </thead>
        <tbody>
          {emiSchedules.map(e => (
            <tr key={e.id} style={{borderBottom:'1px solid #e2e8f0'}}>
              <td style={{padding:'0.75rem'}}>{e.loan_account_number}</td>
              <td>{e.customers?.full_name}</td>
              <td>₹{e.emi_amount}</td>
              <td>{e.due_date}</td>
              <td>
                <button onClick={() => handleMarkAsPaid(e)} style={{background:'#10b981',color:'white',border:'none',padding:'0.4rem 0.8rem',borderRadius:'4px',cursor:'pointer'}}>Mark Paid</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ReportsView({ customers }) {
  return (
    <div style={{background:'white',padding:'1.5rem',borderRadius:'8px'}}>
      <h3>Reports & Export</h3>
      <button onClick={() => {
        const ws = XLSX.utils.json_to_sheet(customers);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Customers");
        XLSX.writeFile(wb, "Customers_Report.xlsx");
      }} style={{background:'#2563eb',color:'white',border:'none',padding:'0.75rem 1.5rem',borderRadius:'6px',cursor:'pointer',marginTop:'1rem'}}>
        <Download size={16} style={{verticalAlign:'middle',marginRight:'5px'}} /> Export Excel
      </button>
    </div>
  );
}

function CustomerModal({ onClose, onSuccess }) {
  const [form, setForm] = useState({ full_name: '', mobile_number: '', loan_amount: '', current_stage: 'New Lead' });

  const handleSave = async (e) => {
    e.preventDefault();
    const accountNo = `LD-${Math.floor(100000 + Math.random() * 900000)}`;
    const { data: cust, error } = await supabase.from('customers').insert([{ ...form, loan_account_number: accountNo, employee_name: 'Admin', loan_type: 'Personal', address: 'N/A'}]).select().single();
    if (error) return alert(error.message);

    await supabase.from('emi_schedules').insert([{
      customer_id: cust.id, loan_account_number: accountNo, emi_amount: (form.loan_amount * 0.03).toFixed(2),
      due_date: new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0]
    }]);

    onSuccess();
  };

  return (
    <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'rgba(0,0,0,0.5)',display:'flex',justifyContent:'center',alignItems:'center'}}>
      <form onSubmit={handleSave} style={{background:'white',padding:'2rem',borderRadius:'8px',width:'320px',display:'flex',flexDirection:'column',gap:'1rem'}}>
        <h3 style={{margin:0}}>New Customer</h3>
        <input placeholder="Full Name" value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} required style={{padding:'0.5rem'}} />
        <input placeholder="Mobile Number" value={form.mobile_number} onChange={e => setForm({...form, mobile_number: e.target.value})} required style={{padding:'0.5rem'}} />
        <input placeholder="Loan Amount" type="number" value={form.loan_amount} onChange={e => setForm({...form, loan_amount: e.target.value})} required style={{padding:'0.5rem'}} />
        <div style={{display:'flex',gap:'1rem',justifyContent:'flex-end',marginTop:'1rem'}}>
          <button type="button" onClick={onClose} style={{padding:'0.5rem 1rem'}}>Cancel</button>
          <button type="submit" style={{background:'#2563eb',color:'white',border:'none',padding:'0.5rem 1rem',borderRadius:'4px'}}>Save</button>
        </div>
      </form>
    </div>
  );
}

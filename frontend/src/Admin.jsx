import { useState, useEffect, useRef, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Users, Send, AlertCircle, Maximize2, X, Paperclip, Clock, UploadCloud, FileText, BarChart3, Mail, MousePointerClick } from 'lucide-react'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

function Admin() {
  const [token, setToken] = useState(localStorage.getItem('admin_token') || '')
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [subscribers, setSubscribers] = useState([])
  const [stats, setStats] = useState({ total_subscribers: 0, active_subscribers: 0, recent_campaigns: [] })
  
  const [subject, setSubject] = useState('')
  const [content, setContent] = useState('')
  const [attachments, setAttachments] = useState([])
  const [status, setStatus] = useState({ type: '', message: '' })
  const [loading, setLoading] = useState(false)
  
  const [isComposeOpen, setIsComposeOpen] = useState(false)
  const [importLoading, setImportLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  
  const quillRef = useRef(null)
  const fileInputRef = useRef(null)
  const csvInputRef = useRef(null)

  const handleLogin = (e) => {
    e.preventDefault()
    if (token === 'neural_admin_123') {
      localStorage.setItem('admin_token', token)
      setIsAuthenticated(true)
      fetchData()
    } else {
      setStatus({ type: 'error', message: 'Invalid password' })
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('admin_token')
    setToken('')
    setIsAuthenticated(false)
  }

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': 'Bearer my_super_secret_admin_token' }
      const [subsRes, statsRes] = await Promise.all([
        fetch('http://localhost:5000/api/subscribers', { headers }),
        fetch('http://localhost:5000/api/stats', { headers })
      ])
      
      if (subsRes.ok) setSubscribers(await subsRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
    } catch (error) {
      console.error("Failed to fetch data")
    }
  }

  useEffect(() => {
    if (isAuthenticated || localStorage.getItem('admin_token') === 'neural_admin_123') {
      setIsAuthenticated(true)
      fetchData()
    }
  }, [isAuthenticated])

  const imageHandler = () => {
    const input = document.createElement('input')
    input.setAttribute('type', 'file')
    input.setAttribute('accept', 'image/*')
    input.click()

    input.onchange = async () => {
      const file = input.files[0]
      if (file) {
        const formData = new FormData()
        formData.append('image', file)

        try {
          const res = await fetch('http://localhost:5000/api/upload', {
            method: 'POST',
            headers: { 'Authorization': 'Bearer my_super_secret_admin_token' },
            body: formData
          })
          const data = await res.json()
          if (data.url) {
            const quill = quillRef.current.getEditor()
            const range = quill.getSelection()
            quill.insertEmbed(range ? range.index : 0, 'image', data.url)
          }
        } catch (e) {
          console.error("Image upload failed", e)
          alert("Image upload failed")
        }
      }
    }
  }

  const modules = useMemo(() => ({
    toolbar: {
      container: [
        [{ 'header': [1, 2, 3, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ 'list': 'ordered'}, { 'list': 'bullet' }],
        ['link', 'image'],
        ['clean']
      ],
      handlers: { image: imageHandler }
    }
  }), [])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!subject || !content || content === '<p><br></p>') {
      setStatus({ type: 'error', message: 'Subject and content are required' })
      return
    }

    setLoading(true)
    setStatus({ type: '', message: '' })
    
    try {
      const formData = new FormData()
      formData.append('subject', subject)
      formData.append('content', content)
      attachments.forEach(file => formData.append('attachments', file))

      const response = await fetch('http://localhost:5000/api/send', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer my_super_secret_admin_token' },
        body: formData
      })
      const data = await response.json()
      
      if (response.ok) {
        setStatus({ type: 'success', message: data.message })
        setSubject('')
        setContent('')
        setAttachments([])
        fetchData() // Refresh stats
        setTimeout(() => setIsComposeOpen(false), 4000)
      } else {
        setStatus({ type: 'error', message: data.error })
      }
    } catch (error) {
      setStatus({ type: 'error', message: 'Failed to send newsletter' })
    } finally {
      setLoading(false)
    }
  }

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files)
    setAttachments(prev => [...prev, ...newFiles])
  }

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index))
  }

  const handleCsvImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (!file.name.endsWith('.csv')) {
      alert("Please upload a CSV file")
      return
    }

    setImportLoading(true)
    const formData = new FormData()
    formData.append('file', file)

    try {
      const res = await fetch('http://localhost:5000/api/import', {
        method: 'POST',
        headers: { 'Authorization': 'Bearer my_super_secret_admin_token' },
        body: formData
      })
      const data = await res.json()
      if (res.ok) {
        alert(data.message)
        fetchData()
      } else {
        alert(data.error || 'Import failed')
      }
    } catch (err) {
      alert("Network error during import")
    } finally {
      setImportLoading(false)
      if (csvInputRef.current) csvInputRef.current.value = ''
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-background relative overflow-hidden">
        <div className="glass-panel p-8 rounded-2xl w-full max-w-md border border-white/10 z-10">
          <h2 className="text-3xl font-bold mb-6 text-primary">Admin Access</h2>
          <form onSubmit={handleLogin} className="flex flex-col gap-5">
            <input
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Enter password..."
              className="w-full bg-surface border border-white/10 rounded-xl py-3 px-4 text-primary focus:outline-none"
            />
            <button type="submit" className="w-full bg-white text-background font-semibold py-3 rounded-xl">Login</button>
            {status.message && <div className="text-red-400 text-sm text-center">{status.message}</div>}
          </form>
        </div>
      </div>
    )
  }

  const chartData = stats.recent_campaigns.map(c => ({
    name: c.subject.length > 15 ? c.subject.substring(0,15) + '...' : c.subject,
    opens: c.total_opened,
    clicks: c.total_clicks,
    sent: c.total_sent
  })).reverse()

  return (
    <div className="min-h-screen bg-[#f6f8fc] relative font-sans">
      <header className="flex items-center justify-between p-3 bg-white border-b border-gray-200 shadow-sm z-10 relative">
        <div className="flex items-center gap-4">
          <Link to="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-gray-600"/>
          </Link>
          <div className="flex items-center gap-2">
            <div className="text-xl font-medium text-gray-600 flex items-center gap-2">
              <span className="text-blue-600 font-bold text-2xl">M</span>
              <span className="tracking-tight">NeuralMail</span>
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="text-sm font-medium text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg transition-colors border border-transparent">
          Sign out
        </button>
      </header>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Sidebar */}
        <div className="w-64 bg-white p-4 hidden md:flex flex-col border-r border-gray-200">
          <button 
            onClick={() => setIsComposeOpen(true)}
            className="flex items-center gap-4 bg-[#c2e7ff] text-[#001d35] px-6 py-4 rounded-2xl font-medium hover:bg-[#b5e0fc] transition-colors shadow-sm mb-6"
          >
            <Send size={20} />
            Compose
          </button>

          <div className="flex flex-col gap-2 flex-1">
            <div 
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-4 px-4 py-2 rounded-full font-medium text-sm cursor-pointer ${activeTab === 'dashboard' ? 'bg-[#d3e3fd] text-[#041e49]' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <BarChart3 size={18} />
              Dashboard
            </div>
            <div 
              onClick={() => setActiveTab('subscribers')}
              className={`flex items-center justify-between px-4 py-2 rounded-full font-medium text-sm cursor-pointer ${activeTab === 'subscribers' ? 'bg-[#d3e3fd] text-[#041e49]' : 'text-gray-600 hover:bg-gray-100'}`}
            >
              <span className="flex items-center gap-4">
                <Users size={18} />
                Subscribers
              </span>
              <span>{stats.active_subscribers}</span>
            </div>

            {/* Bulk Import Button */}
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Data Management</h3>
              <input 
                type="file" 
                accept=".csv" 
                ref={csvInputRef} 
                onChange={handleCsvImport} 
                className="hidden" 
              />
              <button 
                onClick={() => csvInputRef.current.click()}
                disabled={importLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                <UploadCloud size={16} />
                {importLoading ? 'Importing...' : 'Bulk Import CSV'}
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 bg-white p-6 overflow-y-auto">
          {activeTab === 'dashboard' ? (
            <div className="max-w-5xl">
              <h2 className="text-2xl text-gray-800 font-medium mb-6">Overview</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center"><Users size={24}/></div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Total Audience</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.total_subscribers}</p>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center"><Mail size={24}/></div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Active & Verified</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.active_subscribers}</p>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center"><MousePointerClick size={24}/></div>
                  <div>
                    <p className="text-sm text-gray-500 font-medium">Campaigns Sent</p>
                    <p className="text-2xl font-bold text-gray-800">{stats.recent_campaigns.length}</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm mb-8">
                <h3 className="text-lg font-medium text-gray-800 mb-6">Recent Campaign Performance</h3>
                {stats.recent_campaigns.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No campaigns sent yet.</p>
                ) : (
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#6b7280', fontSize: 12}} />
                        <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.05)'}} />
                        <Bar dataKey="sent" fill="#e5e7eb" radius={[4,4,0,0]} name="Sent" />
                        <Bar dataKey="opens" fill="#3b82f6" radius={[4,4,0,0]} name="Opens" />
                        <Bar dataKey="clicks" fill="#10b981" radius={[4,4,0,0]} name="Clicks" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div>
              <h2 className="text-2xl text-gray-800 font-medium mb-6">Subscribers Database</h2>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                {subscribers.length === 0 ? (
                  <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                    <Users size={48} className="mb-4 text-gray-300"/>
                    <p>No subscribers yet.</p>
                  </div>
                ) : (
                  <div className="flex flex-col">
                    <div className="grid grid-cols-12 p-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      <div className="col-span-1"></div>
                      <div className="col-span-5">Email</div>
                      <div className="col-span-3">Joined Date</div>
                      <div className="col-span-3 text-right">Status</div>
                    </div>
                    {subscribers.map((sub, index) => (
                      <div key={sub.id} className={`grid grid-cols-12 items-center p-3 hover:bg-gray-50 cursor-default border-b border-gray-100`}>
                        <div className="col-span-1 flex justify-center">
                          <div className="w-6 h-6 rounded bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">{sub.email.charAt(0).toUpperCase()}</div>
                        </div>
                        <div className="col-span-5 text-sm text-gray-800 font-medium truncate pr-4">
                          {sub.email}
                        </div>
                        <div className="col-span-3 text-xs text-gray-500">
                          {new Date(sub.subscribed_at).toLocaleDateString()}
                        </div>
                        <div className="col-span-3 text-right flex gap-2 justify-end">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sub.is_verified ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                            {sub.is_verified ? 'Verified' : 'Pending'}
                          </span>
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${sub.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {sub.is_active ? 'Active' : 'Opted Out'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Compose Window */}
      {isComposeOpen && (
        <div className="fixed bottom-0 right-10 md:right-24 w-full max-w-[550px] bg-white rounded-t-xl shadow-2xl flex flex-col border border-gray-300 z-50 overflow-hidden" style={{ height: '600px' }}>
          
          <div className="bg-[#f2f6fc] px-4 py-3 flex items-center justify-between rounded-t-xl cursor-pointer" onClick={() => setIsComposeOpen(false)}>
            <span className="text-sm font-medium text-gray-800">New Message</span>
            <div className="flex items-center gap-3 text-gray-500">
              <Maximize2 size={14} className="hover:text-gray-800" />
              <X size={18} className="hover:text-gray-800" />
            </div>
          </div>

          <form onSubmit={handleSend} className="flex flex-col flex-1 relative overflow-hidden bg-white">
            <div className="px-4 py-2 border-b border-gray-100 flex items-center">
              <span className="text-gray-500 text-sm w-8">To</span>
              <div className="flex gap-2 items-center flex-1">
                <div className="border border-gray-300 rounded-full px-3 py-0.5 text-xs text-gray-700 bg-gray-50 flex items-center">
                  <Users size={12} className="mr-1.5 text-blue-500"/> {stats.active_subscribers} Verified Subscribers
                </div>
              </div>
            </div>

            <div className="px-4 py-2 border-b border-gray-100">
              <input 
                type="text" 
                placeholder="Subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full text-sm outline-none placeholder-gray-500 text-gray-800 font-medium"
              />
            </div>

            <div className="flex-1 flex flex-col relative overflow-hidden">
              <ReactQuill 
                ref={quillRef}
                theme="snow" 
                value={content} 
                onChange={setContent} 
                modules={modules}
                className="flex-1 flex flex-col h-full compose-editor"
                placeholder="Type your newsletter here. Images dropped here will be auto-uploaded..."
              />
            </div>

            {attachments.length > 0 && (
              <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex flex-wrap gap-2 max-h-24 overflow-y-auto custom-scrollbar">
                {attachments.map((file, i) => (
                  <div key={i} className="flex items-center gap-2 bg-white border border-gray-200 px-2 py-1 rounded text-xs text-gray-600 shadow-sm">
                    <FileText size={12} className="text-blue-500"/>
                    <span className="max-w-[120px] truncate">{file.name}</span>
                    <X size={12} className="cursor-pointer hover:text-red-500 ml-1" onClick={() => removeAttachment(i)}/>
                  </div>
                ))}
              </div>
            )}

            {status.message && (
              <div className={`mx-4 mt-2 p-2 rounded text-xs font-medium z-10 ${status.type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                {status.message}
              </div>
            )}

            <div className="p-3 border-t border-gray-100 flex items-center justify-between bg-white mt-auto">
              <div className="flex items-center gap-2">
                <button 
                  type="submit" 
                  disabled={loading}
                  className="bg-[#0b57d0] hover:bg-[#0842a0] text-white px-6 py-2 rounded-full text-sm font-medium transition-colors disabled:opacity-70 flex items-center gap-2 shadow-sm"
                >
                  {loading ? 'Sending...' : 'Send'}
                </button>
                <div className="flex items-center gap-1 text-gray-600 ml-4">
                  <input 
                    type="file" 
                    multiple 
                    className="hidden" 
                    ref={fileInputRef}
                    onChange={handleFileChange}
                  />
                  <div 
                    onClick={() => fileInputRef.current.click()}
                    className="p-1.5 hover:bg-gray-100 rounded cursor-pointer transition-colors" 
                  >
                    <Paperclip size={18} />
                  </div>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      <style dangerouslySetInnerHTML={{__html: `
        .compose-editor .ql-toolbar { border: none; border-bottom: 1px solid #f3f4f6; }
        .compose-editor .ql-container { border: none; font-size: 14px; }
        .compose-editor .ql-editor { padding: 16px; color: #1f2937; }
      `}} />
    </div>
  )
}

export default Admin

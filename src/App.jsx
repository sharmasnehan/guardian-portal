import React, { useState, useEffect, useRef } from 'react';
import { 
  Book, 
  Users, 
  Settings, 
  Plus, 
  Trash2, 
  Save, 
  Shield, 
  Smartphone, 
  Send, 
  Loader2, 
  Info,
  Database,
  Key,
  Phone,
  Lock,
  FolderOpen,
  FileText,
  MessageSquare,
  ChevronRight,
  ArrowLeft,
  Image,
  Video,
  Music,
  Pencil,
  X
} from 'lucide-react';

/**
 * Using CDN-based Supabase loading for environment compatibility.
 */
const getSupabaseClient = (url, key) => {
  if (window.supabase) {
    return window.supabase.createClient(url, key);
  }
  return null;
};

// --- Components ---

const Navigation = ({ activeTab, setActiveTab }) => (
  <div className="w-64 bg-slate-900 text-slate-300 flex flex-col h-full border-r border-slate-800 hidden md:flex">
    <div className="p-6 border-b border-slate-800">
      <h1 className="text-xl font-bold text-white flex items-center gap-2">
        <Shield className="w-6 h-6 text-emerald-400 fill-emerald-400/10" />
        Guardian Portal
      </h1>
    </div>
    <nav className="flex-1 p-4 space-y-2">
      <NavButton active={activeTab === 'content'} onClick={() => setActiveTab('content')} Icon={Book} label="Content Library" />
      <NavButton active={activeTab === 'recipients'} onClick={() => setActiveTab('recipients')} Icon={Users} label="Recipients" />
      <NavButton active={activeTab === 'conversations'} onClick={() => setActiveTab('conversations')} Icon={MessageSquare} label="Conversations" />
      <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} Icon={Settings} label="Caregiver Settings" />
      <NavButton active={activeTab === 'simulator'} onClick={() => setActiveTab('simulator')} Icon={Smartphone} label="Test Simulator" highlight />
    </nav>
    <div className="p-4 border-t border-slate-800">
      <button onClick={() => setActiveTab('config')} className="flex items-center gap-2 text-xs text-slate-500 hover:text-white transition-colors">
        <Database size={12} /> Connection Status
      </button>
    </div>
  </div>
);

const NavButton = ({ active, onClick, Icon, label, highlight }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shadow-sm' 
        : 'hover:bg-slate-800 text-slate-400 hover:text-white'
    } ${highlight ? 'mt-4 border border-slate-700 bg-slate-800/50' : ''}`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const MobileNav = ({ activeTab, setActiveTab }) => (
  <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-800 flex justify-around p-2 z-50">
     <button onClick={() => setActiveTab('content')} className={`p-3 rounded-full ${activeTab === 'content' ? 'text-emerald-400 bg-emerald-900/20' : 'text-slate-400'}`}><Book size={24}/></button>
     <button onClick={() => setActiveTab('recipients')} className={`p-3 rounded-full ${activeTab === 'recipients' ? 'text-emerald-400 bg-emerald-900/20' : 'text-slate-400'}`}><Users size={24}/></button>
     <button onClick={() => setActiveTab('conversations')} className={`p-3 rounded-full ${activeTab === 'conversations' ? 'text-emerald-400 bg-emerald-900/20' : 'text-slate-400'}`}><MessageSquare size={24}/></button>
     <button onClick={() => setActiveTab('settings')} className={`p-3 rounded-full ${activeTab === 'settings' ? 'text-emerald-400 bg-emerald-900/20' : 'text-slate-400'}`}><Settings size={24}/></button>
     <button onClick={() => setActiveTab('simulator')} className={`p-3 rounded-full ${activeTab === 'simulator' ? 'text-emerald-400 bg-emerald-900/20' : 'text-slate-400'}`}><Smartphone size={24}/></button>
  </div>
);

// --- Content Library (Categories + ContentItems) ---

const ContentLibrary = ({ supabase, userId, showNotification }) => {
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [contentItems, setContentItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [showContentForm, setShowContentForm] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
  const [contentForm, setContentForm] = useState({ title: '', description: '', mediaUrl: '', mediaType: '', keywords: '' });
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingContent, setEditingContent] = useState(null);

  const fetchCategories = async () => {
    if (!supabase) return;
    const { data, error } = await supabase
      .from('Category')
      .select('*')
      .order('createdAt', { ascending: false });
    if (!error) setCategories(data || []);
    setLoading(false);
  };

  const fetchContentItems = async (categoryId) => {
    if (!supabase || !categoryId) return;
    const { data, error } = await supabase
      .from('ContentItem')
      .select('*')
      .eq('categoryId', categoryId)
      .order('createdAt', { ascending: false });
    if (!error) setContentItems(data || []);
  };

  useEffect(() => {
    fetchCategories();
  }, [supabase]);

  useEffect(() => {
    if (selectedCategory) {
      fetchContentItems(selectedCategory.id);
    }
  }, [selectedCategory]);

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.from('Category').insert([{
      id: crypto.randomUUID(),
      name: categoryForm.name,
      description: categoryForm.description,
      userId: userId,
      updatedAt: new Date().toISOString()
    }]);
    if (error) showNotification('Error adding category');
    else {
      setCategoryForm({ name: '', description: '' });
      setShowCategoryForm(false);
      showNotification('Category created!');
      fetchCategories();
    }
  };

  const handleAddContent = async (e) => {
    e.preventDefault();
    if (!supabase || !selectedCategory) return;
    const keywordsArray = contentForm.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const { error } = await supabase.from('ContentItem').insert([{
      id: crypto.randomUUID(),
      title: contentForm.title,
      description: contentForm.description,
      categoryId: selectedCategory.id,
      userId: userId,
      mediaUrl: contentForm.mediaUrl || null,
      mediaType: contentForm.mediaType || null,
      keywords: keywordsArray,
      updatedAt: new Date().toISOString()
    }]);
    if (error) showNotification('Error adding content');
    else {
      setContentForm({ title: '', description: '', mediaUrl: '', mediaType: '', keywords: '' });
      setShowContentForm(false);
      showNotification('Content item added!');
      fetchContentItems(selectedCategory.id);
    }
  };

  const handleDeleteCategory = async (id) => {
    if (!supabase) return;
    // First delete all content items in this category
    await supabase.from('ContentItem').delete().eq('categoryId', id);
    const { error } = await supabase.from('Category').delete().eq('id', id);
    if (!error) {
      showNotification('Category deleted.');
      setSelectedCategory(null);
      fetchCategories();
    }
  };

  const handleDeleteContent = async (id) => {
    if (!supabase) return;
    const { error } = await supabase.from('ContentItem').delete().eq('id', id);
    if (!error) {
      showNotification('Content removed.');
      fetchContentItems(selectedCategory.id);
    }
  };

  const handleEditCategory = (cat) => {
    setEditingCategory(cat);
    setCategoryForm({ name: cat.name, description: cat.description || '' });
    setShowCategoryForm(true);
  };

  const handleUpdateCategory = async (e) => {
    e.preventDefault();
    if (!supabase || !editingCategory) return;
    const { error } = await supabase
      .from('Category')
      .update({ 
        name: categoryForm.name, 
        description: categoryForm.description,
        updatedAt: new Date().toISOString()
      })
      .eq('id', editingCategory.id);
    if (error) showNotification('Error updating category');
    else {
      setCategoryForm({ name: '', description: '' });
      setShowCategoryForm(false);
      setEditingCategory(null);
      showNotification('Category updated!');
      fetchCategories();
      // Update selectedCategory if we're editing it
      if (selectedCategory?.id === editingCategory.id) {
        setSelectedCategory({ ...selectedCategory, name: categoryForm.name, description: categoryForm.description });
      }
    }
  };

  const handleEditContent = (item) => {
    setEditingContent(item);
    setContentForm({ 
      title: item.title, 
      description: item.description || '', 
      mediaUrl: item.mediaUrl || '', 
      mediaType: item.mediaType || '', 
      keywords: item.keywords ? item.keywords.join(', ') : '' 
    });
    setShowContentForm(true);
  };

  const handleUpdateContent = async (e) => {
    e.preventDefault();
    if (!supabase || !editingContent) return;
    const keywordsArray = contentForm.keywords.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
    const { error } = await supabase
      .from('ContentItem')
      .update({ 
        title: contentForm.title, 
        description: contentForm.description,
        mediaUrl: contentForm.mediaUrl || null,
        mediaType: contentForm.mediaType || null,
        keywords: keywordsArray,
        updatedAt: new Date().toISOString()
      })
      .eq('id', editingContent.id);
    if (error) showNotification('Error updating content');
    else {
      setContentForm({ title: '', description: '', mediaUrl: '', mediaType: '', keywords: '' });
      setShowContentForm(false);
      setEditingContent(null);
      showNotification('Content updated!');
      fetchContentItems(selectedCategory.id);
    }
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    setEditingContent(null);
    setCategoryForm({ name: '', description: '' });
    setContentForm({ title: '', description: '', mediaUrl: '', mediaType: '', keywords: '' });
    setShowCategoryForm(false);
    setShowContentForm(false);
  };

  const getMediaIcon = (type) => {
    if (!type) return <FileText size={16} className="text-slate-400" />;
    if (type.includes('image')) return <Image size={16} className="text-blue-500" />;
    if (type.includes('video')) return <Video size={16} className="text-purple-500" />;
    if (type.includes('audio')) return <Music size={16} className="text-pink-500" />;
    return <FileText size={16} className="text-slate-400" />;
  };

  if (!supabase) return <EmptyState msg="Please connect Supabase in the Connection Status tab first." />;

  // Content Items View (inside a category)
  if (selectedCategory) {
    return (
      <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => { setSelectedCategory(null); setContentItems([]); }}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-slate-600" />
          </button>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-slate-800">{selectedCategory.name}</h2>
            <p className="text-slate-500">{selectedCategory.description || 'No description'}</p>
          </div>
          <button 
            onClick={() => {
              if (showContentForm) cancelEdit();
              else setShowContentForm(true);
            }} 
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-transform active:scale-95"
          >
            {showContentForm ? 'Cancel' : <><Plus size={18} /> Add Content</>}
          </button>
        </div>

        {showContentForm && (
          <form onSubmit={editingContent ? handleUpdateContent : handleAddContent} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4 animate-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold text-slate-700">{editingContent ? 'Edit Content' : 'Add Content'}</h3>
              {editingContent && (
                <button type="button" onClick={cancelEdit} className="text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              )}
            </div>
            <input 
              value={contentForm.title} 
              onChange={(e) => setContentForm({...contentForm, title: e.target.value})} 
              placeholder="Title (e.g., Gate Code)" 
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              required 
            />
            <textarea 
              value={contentForm.description} 
              onChange={(e) => setContentForm({...contentForm, description: e.target.value})} 
              placeholder="Description / Details" 
              className="w-full p-3 border rounded-lg h-24 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
            />
            <div className="grid md:grid-cols-2 gap-4">
              <input 
                value={contentForm.mediaUrl} 
                onChange={(e) => setContentForm({...contentForm, mediaUrl: e.target.value})} 
                placeholder="Media URL (optional)" 
                className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
              />
              <select 
                value={contentForm.mediaType} 
                onChange={(e) => setContentForm({...contentForm, mediaType: e.target.value})}
                className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-600"
              >
                <option value="">Media Type (optional)</option>
                <option value="image/jpeg">Image</option>
                <option value="video/mp4">Video</option>
                <option value="audio/mp3">Audio</option>
                <option value="application/pdf">Document</option>
              </select>
            </div>
            <input 
              value={contentForm.keywords} 
              onChange={(e) => setContentForm({...contentForm, keywords: e.target.value})} 
              placeholder="Keywords (comma separated)" 
              className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
            />
            <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition-colors">
              {editingContent ? 'Update Content' : 'Save Content Item'}
            </button>
          </form>
        )}

        <div className="space-y-3">
          {contentItems.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 group relative hover:border-emerald-400 transition-colors">
              <div className="absolute top-4 right-4 flex gap-2">
                <button 
                  onClick={() => handleEditContent(item)} 
                  className="text-slate-300 hover:text-blue-500 transition-colors"
                >
                  <Pencil size={16}/>
                </button>
                <button 
                  onClick={() => handleDeleteContent(item.id)} 
                  className="text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16}/>
                </button>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  {getMediaIcon(item.mediaType)}
                </div>
                <div className="flex-1 pr-16">
                  <h3 className="font-semibold text-slate-800 mb-1">{item.title}</h3>
                  <p className="text-slate-600 text-sm">{item.description || 'No description'}</p>
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {item.keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-full">{kw}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          {contentItems.length === 0 && (
            <div className="text-center py-16 text-slate-400 border-2 border-dashed rounded-xl">
              <FileText size={32} className="mx-auto mb-3 opacity-50" />
              No content items in this category yet.
            </div>
          )}
        </div>
      </div>
    );
  }

  // Categories View
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Content Library</h2>
          <p className="text-slate-500">Organize knowledge into categories.</p>
        </div>
        <button 
          onClick={() => {
            if (showCategoryForm) cancelEdit();
            else setShowCategoryForm(true);
          }} 
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-transform active:scale-95"
        >
          {showCategoryForm ? 'Cancel' : <><Plus size={18} /> New Category</>}
        </button>
      </div>

      {showCategoryForm && (
        <form onSubmit={editingCategory ? handleUpdateCategory : handleAddCategory} className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4 animate-in slide-in-from-top-4 duration-300">
          <div className="flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">{editingCategory ? 'Edit Category' : 'New Category'}</h3>
            {editingCategory && (
              <button type="button" onClick={cancelEdit} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            )}
          </div>
          <input 
            value={categoryForm.name} 
            onChange={(e) => setCategoryForm({...categoryForm, name: e.target.value})} 
            placeholder="Category Name (e.g., Medical Info)" 
            className="w-full p-3 border rounded-lg outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
            required 
          />
          <textarea 
            value={categoryForm.description} 
            onChange={(e) => setCategoryForm({...categoryForm, description: e.target.value})} 
            placeholder="Description (optional)" 
            className="w-full p-3 border rounded-lg h-20 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500" 
          />
          <button type="submit" className="w-full bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition-colors">
            {editingCategory ? 'Update Category' : 'Create Category'}
          </button>
        </form>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {categories.map((cat) => (
          <div 
            key={cat.id} 
            className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 group relative hover:border-emerald-400 hover:shadow-md transition-all cursor-pointer"
            onClick={() => setSelectedCategory(cat)}
          >
            <div className="absolute top-4 right-12 flex gap-2">
              <button 
                onClick={(e) => { e.stopPropagation(); handleEditCategory(cat); }} 
                className="text-slate-300 hover:text-blue-500 transition-colors"
              >
                <Pencil size={16}/>
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id); }} 
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16}/>
              </button>
            </div>
            <ChevronRight size={20} className="absolute top-4 right-4 text-slate-300 group-hover:text-emerald-500 transition-colors" />
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                <FolderOpen size={20} className="text-emerald-600" />
              </div>
              <h3 className="font-semibold text-slate-800">{cat.name}</h3>
            </div>
            <p className="text-slate-500 text-sm pl-13">{cat.description || 'No description'}</p>
          </div>
        ))}
        {categories.length === 0 && !loading && (
          <div className="col-span-2 text-center py-20 text-slate-400 border-2 border-dashed rounded-xl">
            <FolderOpen size={32} className="mx-auto mb-3 opacity-50" />
            No categories yet. Create one to organize your content.
          </div>
        )}
      </div>
    </div>
  );
};

// --- Recipients (RecipientProfile) ---

const Recipients = ({ supabase, userId, caregiverId, showNotification }) => {
  const [recipients, setRecipients] = useState([]);
  const [form, setForm] = useState({ phoneNumber: '' });
  const [loading, setLoading] = useState(true);

  const fetchRecipients = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('RecipientProfile')
      .select('*')
      .order('createdAt', { ascending: false });
    setRecipients(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchRecipients();
  }, [supabase]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!supabase) return;
    const { error } = await supabase.from('RecipientProfile').insert([{
      id: crypto.randomUUID(),
      userId: userId,
      caregiverId: caregiverId,
      phoneNumber: form.phoneNumber,
      updatedAt: new Date().toISOString()
    }]);
    if (!error) {
      setForm({ phoneNumber: '' });
      showNotification('Recipient added!');
      fetchRecipients();
    } else {
      showNotification('Error adding recipient');
    }
  };

  const handleDelete = async (id) => {
    if (!supabase) return;
    await supabase.from('RecipientProfile').delete().eq('id', id);
    showNotification('Recipient deleted.');
    fetchRecipients();
  };

  if (!supabase) return <EmptyState msg="Please connect Supabase in the Connection Status tab first." />;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Recipients</h2>
        <p className="text-slate-500">People who can text this Guardian for information.</p>
      </div>
      
      <div className="grid md:grid-cols-3 gap-6">
        <form onSubmit={handleAdd} className="bg-slate-50 p-5 rounded-xl border border-slate-200 h-fit space-y-3">
          <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2">Add Recipient</h3>
          <div className="relative">
            <Phone size={16} className="absolute left-3 top-3 text-slate-400" />
            <input 
              value={form.phoneNumber} 
              onChange={e => setForm({...form, phoneNumber: e.target.value})} 
              placeholder="+1234567890" 
              className="w-full p-2 pl-10 border rounded-lg text-sm outline-none focus:border-emerald-500" 
              required 
            />
          </div>
          <button type="submit" className="w-full bg-emerald-600 text-white py-2 rounded-lg text-sm hover:bg-emerald-700 transition-colors">
            Add Recipient
          </button>
        </form>
        
        <div className="md:col-span-2 space-y-3">
          {recipients.map(r => (
            <div key={r.id} className="bg-white p-4 rounded-xl border flex items-center justify-between shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center">
                  <Phone size={18} />
                </div>
                <div>
                  <h4 className="font-semibold text-slate-800">{r.phoneNumber}</h4>
                  <p className="text-xs text-slate-500">Added {new Date(r.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(r.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={16}/>
              </button>
            </div>
          ))}
          {recipients.length === 0 && !loading && (
            <div className="text-center py-10 text-slate-400 border-2 border-dashed rounded-xl">
              <Users size={32} className="mx-auto mb-3 opacity-50" />
              No recipients yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// --- Conversations History ---

const Conversations = ({ supabase, showNotification }) => {
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = async () => {
    if (!supabase) return;
    const { data } = await supabase
      .from('Conversation')
      .select('*, RecipientProfile(phoneNumber)')
      .order('createdAt', { ascending: false })
      .limit(50);
    setConversations(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchConversations();
  }, [supabase]);

  if (!supabase) return <EmptyState msg="Please connect Supabase in the Connection Status tab first." />;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Conversation History</h2>
        <p className="text-slate-500">Recent SMS exchanges with recipients.</p>
      </div>

      <div className="space-y-4">
        {conversations.map((conv) => (
          <div key={conv.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center">
                  <Phone size={14} />
                </div>
                <span className="font-medium text-slate-700">{conv.phoneNumber}</span>
              </div>
              <span className="text-xs text-slate-400">{new Date(conv.createdAt).toLocaleString()}</span>
            </div>
            <div className="space-y-2 pl-10">
              <div className="bg-blue-50 p-3 rounded-lg rounded-tl-none">
                <p className="text-sm text-slate-700">{conv.incomingMessage}</p>
              </div>
              {conv.response && (
                <div className="bg-slate-50 p-3 rounded-lg rounded-tr-none ml-4">
                  <p className="text-sm text-slate-600">{conv.response}</p>
                </div>
              )}
              {conv.contentSent && conv.contentSent.length > 0 && (
                <div className="text-xs text-emerald-600 ml-4">
                  Content sent: {conv.contentSent.join(', ')}
                </div>
              )}
            </div>
          </div>
        ))}
        {conversations.length === 0 && !loading && (
          <div className="text-center py-20 text-slate-400 border-2 border-dashed rounded-xl">
            <MessageSquare size={32} className="mx-auto mb-3 opacity-50" />
            No conversations yet.
          </div>
        )}
      </div>
    </div>
  );
};

// --- Caregiver Settings (CaregiverProfile) ---

const CaregiverSettings = ({ supabase, userId, showNotification, setCaregiverId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState({ twilioPhoneNumber: '', toneGuidance: '' });
  const [profileId, setProfileId] = useState(null);

  useEffect(() => {
    if (!supabase) return;
    const fetchProfile = async () => {
      try {
        const { data } = await supabase
          .from('CaregiverProfile')
          .select('*')
          .limit(1)
          .single();
        if (data) {
          setProfile({
            twilioPhoneNumber: data.twilioPhoneNumber || '',
            toneGuidance: data.toneGuidance || ''
          });
          setProfileId(data.id);
          setCaregiverId(data.id);
        }
      } catch (e) {}
      setLoading(false);
    };
    fetchProfile();
  }, [supabase]);

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    let error;
    if (profileId) {
      const res = await supabase
        .from('CaregiverProfile')
        .update({
          twilioPhoneNumber: profile.twilioPhoneNumber,
          toneGuidance: profile.toneGuidance,
          updatedAt: new Date().toISOString()
        })
        .eq('id', profileId);
      error = res.error;
    } else {
      const newId = crypto.randomUUID();
      const res = await supabase.from('CaregiverProfile').insert([{
        id: newId,
        userId: userId,
        twilioPhoneNumber: profile.twilioPhoneNumber,
        toneGuidance: profile.toneGuidance,
        updatedAt: new Date().toISOString()
      }]).select();
      if (res.data?.[0]) {
        setProfileId(res.data[0].id);
        setCaregiverId(res.data[0].id);
      }
      error = res.error;
    }
    if (!error) showNotification("Caregiver settings saved.");
    else showNotification("Error saving settings.");
    setSaving(false);
  };

  if (!supabase) return <EmptyState msg="Please connect Supabase in the Connection Status tab first." />;
  if (loading) return <div className="p-10 text-center"><Loader2 className="animate-spin mx-auto text-slate-300" /></div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Caregiver Settings</h2>
        <p className="text-slate-500">Configure your Twilio number and AI tone guidance.</p>
      </div>

      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Twilio Phone Number</label>
            <div className="relative">
              <Phone size={16} className="absolute left-3 top-3.5 text-slate-400" />
              <input 
                type="text" 
                value={profile.twilioPhoneNumber} 
                onChange={e => setProfile({...profile, twilioPhoneNumber: e.target.value})} 
                placeholder="+1234567890" 
                className="w-full p-3 pl-10 border border-slate-300 rounded-lg outline-none focus:border-indigo-500 font-mono text-sm"
              />
            </div>
            <p className="text-xs text-slate-400 mt-1">The phone number recipients will text to reach this Guardian.</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Tone Guidance</label>
            <textarea 
              value={profile.toneGuidance} 
              onChange={e => setProfile({...profile, toneGuidance: e.target.value})} 
              className="w-full h-32 p-3 border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500" 
              placeholder="e.g., Be warm and patient. Use simple language. Always confirm understanding..."
            />
            <p className="text-xs text-slate-400 mt-1">Instructions for the AI on how to communicate with recipients.</p>
          </div>
        </div>

        <button 
          onClick={handleSave} 
          disabled={saving}
          className="w-full bg-slate-900 text-white py-3 rounded-xl font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="animate-spin" size={20} /> : <><Save size={20} /> Save Settings</>}
        </button>
      </div>

      <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex gap-3 text-amber-800 text-sm">
        <Info className="shrink-0 text-amber-500" size={20} />
        <p>The Twilio phone number is used by your backend to send/receive SMS. Tone guidance shapes how the AI responds.</p>
      </div>
    </div>
  );
};

// --- Simulator ---

const Simulator = ({ supabase, openaiKey, setOpenaiKey }) => {
  const [messages, setMessages] = useState([{ role: 'assistant', text: "Simulator ready. Text me a question to see how I'd respond based on your content library." }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKeyInput, setShowKeyInput] = useState(!openaiKey);
  const [tempKey, setTempKey] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => { 
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; 
  }, [messages]);

  const saveApiKey = () => {
    if (tempKey.trim()) {
      setOpenaiKey(tempKey.trim());
      localStorage.setItem('openai_key', tempKey.trim());
      setShowKeyInput(false);
      setMessages(prev => [...prev, { role: 'assistant', text: "API key saved! You can now test the Guardian assistant." }]);
    }
  };

  const generateResponse = async (userQuery) => {
    if (!userQuery.trim() || !openaiKey) return;
    setLoading(true);
    
    let contentItems = [];
    let categories = [];
    let caregiverProfile = {};

    if (supabase) {
      contentItems = (await supabase.from('ContentItem').select('*')).data || [];
      categories = (await supabase.from('Category').select('*')).data || [];
      caregiverProfile = (await supabase.from('CaregiverProfile').select('*').limit(1).single()).data || {};
    }

    const lowerQuery = userQuery.toLowerCase();
    const matches = contentItems.filter(item => 
      lowerQuery.includes(item.title.toLowerCase()) || 
      (item.keywords && item.keywords.some(kw => lowerQuery.includes(kw.toLowerCase()))) ||
      (item.description && item.description.toLowerCase().includes(lowerQuery))
    );

    const contextText = matches.length > 0 
      ? "RELEVANT CONTENT FROM DATABASE:\n" + matches.map(m => `- ${m.title}: ${m.description || 'No description'}`).join("\n") 
      : "No specific matches found in content library.";

    const categoryList = categories.map(c => c.name).join(', ');

    const systemPrompt = `${caregiverProfile?.toneGuidance || "Be helpful and friendly. You are a Guardian assistant helping caregivers and their families."}\n\nAvailable content categories: ${categoryList}\n\n${contextText}`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({ 
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userQuery }
          ],
          max_tokens: 500
        })
      });
      const data = await response.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', text: `Error: ${data.error.message}` }]);
      } else {
        const aiText = data.choices?.[0]?.message?.content || "No response generated.";
        setMessages(prev => [...prev, { role: 'assistant', text: aiText, isMatch: matches.length > 0 }]);
      }
    } catch (e) { 
      setMessages(prev => [...prev, { role: 'assistant', text: "Error connecting to OpenAI. Check your API key." }]); 
    }
    setLoading(false);
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    if (!openaiKey) {
      setShowKeyInput(true);
      return;
    }
    const msg = input;
    setMessages(prev => [...prev, { role: 'user', text: msg }]);
    setInput('');
    generateResponse(msg);
  };

  if (!supabase) return <EmptyState msg="Please connect Supabase in the Connection Status tab first." />;

  return (
    <div className="h-full flex items-center justify-center p-6 bg-slate-50 animate-in fade-in duration-500">
      <div className="w-full max-w-sm bg-white rounded-[3rem] shadow-2xl border-8 border-slate-800 h-[640px] flex flex-col overflow-hidden relative">
        <div className="bg-slate-100 p-4 border-b text-center text-[10px] font-bold text-slate-400 pt-8 uppercase tracking-widest flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Guardian Simulator (GPT-4o)
        </div>
        
        {showKeyInput && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-sm z-10 flex items-center justify-center p-6 rounded-[3rem]">
            <div className="w-full space-y-4 text-center">
              <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <Key size={24} className="text-emerald-600" />
              </div>
              <h3 className="font-bold text-slate-800">OpenAI API Key</h3>
              <p className="text-xs text-slate-500">Enter your API key to power the simulator with ChatGPT</p>
              <input 
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="sk-..."
                className="w-full p-3 border rounded-xl text-sm font-mono outline-none focus:border-emerald-500"
              />
              <button 
                onClick={saveApiKey}
                className="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-medium hover:bg-slate-800"
              >
                Save & Continue
              </button>
              <p className="text-[10px] text-slate-400">Key is stored locally in your browser</p>
            </div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm shadow-sm ${m.role === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-white border text-slate-700 rounded-bl-none'}`}>
                {m.text}
                {m.isMatch && <div className="mt-1 text-[9px] font-bold text-emerald-600 border-t border-emerald-100 pt-1 uppercase">Content Library Used</div>}
              </div>
            </div>
          ))}
          {loading && <div className="flex justify-start animate-pulse"><div className="bg-slate-200 rounded-full px-4 py-1 text-[10px] text-slate-500 italic">ChatGPT is typing...</div></div>}
        </div>
        <div className="p-3 bg-white border-t flex gap-2 items-center">
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSend()} 
            placeholder="Text message..." 
            className="flex-1 bg-slate-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" 
          />
          <button 
            onClick={handleSend} 
            disabled={loading} 
            className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700 active:scale-95 transition-all"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="h-6 bg-white flex justify-center items-center pb-2">
           <div className="w-24 h-1 bg-slate-200 rounded-full"></div>
        </div>
      </div>
    </div>
  );
};

// --- Config Screen ---

const ConfigScreen = ({ config, onConnect, showNotification }) => {
  const [url, setUrl] = useState(config.url || '');
  const [key, setKey] = useState(config.key || '');
  
  return (
    <div className="p-6 max-w-xl mx-auto mt-10 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-200 space-y-6">
        <div className="flex items-center gap-3 mb-2">
           <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600"><Database size={24}/></div>
           <h2 className="text-xl font-bold text-slate-800">Supabase Connection</h2>
        </div>
        <p className="text-sm text-slate-500">Enter your project credentials to start managing your Guardian data.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Project URL</label>
            <input 
              type="text" 
              value={url} 
              onChange={e => setUrl(e.target.value)} 
              placeholder="https://xxx.supabase.co" 
              className="w-full p-3 border rounded-lg font-mono text-sm outline-none focus:border-emerald-500" 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Anon / Public Key</label>
            <input 
              type="password" 
              value={key} 
              onChange={e => setKey(e.target.value)} 
              placeholder="eyJh..." 
              className="w-full p-3 border rounded-lg font-mono text-sm outline-none focus:border-emerald-500" 
            />
          </div>
        </div>
        <button 
          onClick={() => onConnect(url, key)} 
          className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold hover:bg-slate-800 transition-all active:scale-[0.98]"
        >
          Save & Connect Dashboard
        </button>
      </div>
      <div className="text-center text-xs text-slate-400">
        Credentials are stored locally in your browser.
      </div>
    </div>
  );
};

const EmptyState = ({ msg }) => (
  <div className="h-full flex flex-col items-center justify-center text-slate-400 p-10 text-center animate-in fade-in duration-500">
    <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
       <Database size={40} className="opacity-20" />
    </div>
    <p className="max-w-xs leading-relaxed">{msg}</p>
  </div>
);

// --- App Entry ---

export default function App() {
  const [activeTab, setActiveTab] = useState('config');
  const [supabase, setSupabase] = useState(null);
  const [dbConfig, setDbConfig] = useState({ url: '', key: '' });
  const [notif, setNotif] = useState(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [userId, setUserId] = useState(null);
  const [caregiverId, setCaregiverId] = useState(null);
  const [openaiKey, setOpenaiKey] = useState('');

  useEffect(() => {
    if (window.supabase) { setIsScriptLoaded(true); return; }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    script.async = true;
    script.onload = () => setIsScriptLoaded(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    // Load saved OpenAI key
    const savedOpenaiKey = localStorage.getItem('openai_key');
    if (savedOpenaiKey) setOpenaiKey(savedOpenaiKey);
  }, []);

  useEffect(() => {
    if (!isScriptLoaded) return;
    const saved = localStorage.getItem('sb_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      setDbConfig(parsed);
      if (parsed.url && parsed.key) {
        const client = getSupabaseClient(parsed.url, parsed.key);
        if (client) { 
          setSupabase(client); 
          setActiveTab('content');
          // Fetch the first user from the database
          client.from('User').select('id').limit(1).single().then(({ data }) => {
            if (data?.id) setUserId(data.id);
          });
        }
      }
    }
  }, [isScriptLoaded]);

  const initSupabase = async (url, key) => {
    const client = getSupabaseClient(url, key);
    if (client) { 
      setSupabase(client); 
      setDbConfig({url, key}); 
      localStorage.setItem('sb_config', JSON.stringify({ url, key })); 
      
      // Fetch or create user
      const { data: existingUser } = await client.from('User').select('id').limit(1).single();
      if (existingUser?.id) {
        setUserId(existingUser.id);
      } else {
        // Create a new user if none exists
        const newUserId = crypto.randomUUID();
        await client.from('User').insert({
          id: newUserId,
          email: 'user@guardian.local',
          password: 'placeholder',
          name: 'Guardian User',
          role: 'CAREGIVER',
          updatedAt: new Date().toISOString()
        });
        setUserId(newUserId);
      }
      
      setActiveTab('content'); 
      showNotification("Connected to Supabase");
    }
    else showNotification("Supabase Library still loading...");
  };

  const showNotification = (msg) => { setNotif(msg); setTimeout(() => setNotif(null), 3000); };

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans text-slate-900 overflow-hidden">
      <Navigation activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="flex-1 overflow-y-auto relative pb-20 md:pb-0">
        <header className="md:hidden bg-slate-900 text-white p-4 flex justify-between items-center">
           <div className="flex items-center gap-2">
             <Shield className="w-6 h-6 text-emerald-400 fill-emerald-400/10" />
             <span className="font-bold">Guardian Portal</span>
           </div>
        </header>

        {activeTab === 'config' && <ConfigScreen config={dbConfig} onConnect={initSupabase} showNotification={showNotification} />}
        {activeTab === 'content' && <ContentLibrary supabase={supabase} userId={userId} showNotification={showNotification} />}
        {activeTab === 'recipients' && <Recipients supabase={supabase} userId={userId} caregiverId={caregiverId} showNotification={showNotification} />}
        {activeTab === 'conversations' && <Conversations supabase={supabase} showNotification={showNotification} />}
        {activeTab === 'settings' && <CaregiverSettings supabase={supabase} userId={userId} showNotification={showNotification} setCaregiverId={setCaregiverId} />}
        {activeTab === 'simulator' && <Simulator supabase={supabase} openaiKey={openaiKey} setOpenaiKey={setOpenaiKey} />}
      </main>
      <MobileNav activeTab={activeTab} setActiveTab={setActiveTab} />
      {notif && (
        <div className="fixed bottom-24 md:bottom-8 right-8 bg-slate-800 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-2 animate-in slide-in-from-right-5">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          {notif}
        </div>
      )}
    </div>
  );
}

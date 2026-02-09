import { useEffect, useState } from 'react';
import { fetchQuestions, createQuestion, updateQuestion, deleteQuestion, type QuestionData } from '../../services/adminApi';

// SVG Icons
function Icon({ name, size = 18, color }: { name: string; size?: number; color?: string }) {
  const style = { width: size, height: size, color: color || 'currentColor', flexShrink: 0 } as const;
  const props = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

  switch (name) {
    case 'x': return <svg {...props} style={style}><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>;
    case 'plus': return <svg {...props} style={style}><path d="M5 12h14" /><path d="M12 5v14" /></svg>;
    case 'edit': return <svg {...props} style={style}><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></svg>;
    case 'trash': return <svg {...props} style={style}><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>;
    default: return null;
  }
}

export default function QuestionBankPage() {
  const [questions, setQuestions] = useState<QuestionData[]>([]);
  const [loading, setLoading] = useState(true);

  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QuestionData | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formDifficulty, setFormDifficulty] = useState('easy');
  const [formCategory, setFormCategory] = useState('General');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch questions on mount
  useEffect(() => {
    loadQuestions();
  }, []);

  async function loadQuestions() {
    setLoading(true);
    try {
      const data = await fetchQuestions();
      setQuestions(data);
    } catch {
      setQuestions([]);
    } finally {
      setLoading(false);
    }
  }

  // Derived unique categories for filter
  const categories = [...new Set(questions.map(q => q.category).filter(Boolean))];

  const filtered = questions.filter(q => {
    if (difficultyFilter !== 'all' && q.difficulty !== difficultyFilter) return false;
    if (categoryFilter !== 'all' && q.category !== categoryFilter) return false;
    return true;
  });

  function openCreateDrawer() {
    setEditingQuestion(null);
    setFormTitle('');
    setFormDesc('');
    setFormCode('');
    setFormDifficulty('easy');
    setFormCategory('General');
    setDrawerOpen(true);
  }

  function openEditDrawer(q: QuestionData) {
    setEditingQuestion(q);
    setFormTitle(q.title);
    setFormDesc(q.description);
    setFormCode(q.template_code);
    setFormDifficulty(q.difficulty);
    setFormCategory(q.category);
    setDrawerOpen(true);
  }

  async function handleSave() {
    if (!formTitle.trim()) return;
    setIsSaving(true);
    try {
      if (editingQuestion) {
        await updateQuestion(editingQuestion.id, {
          title: formTitle,
          description: formDesc,
          template_code: formCode,
          difficulty: formDifficulty,
          category: formCategory,
        });
      } else {
        await createQuestion({
          title: formTitle,
          description: formDesc,
          template_code: formCode,
          difficulty: formDifficulty,
          category: formCategory,
        });
      }
      setDrawerOpen(false);
      await loadQuestions();
    } catch (e) {
      alert('Failed to save question');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    try {
      await deleteQuestion(id);
      await loadQuestions();
    } catch {
      alert('Failed to delete question');
    }
  }

  return (
    <>
      <h1 className="admin-page-title">Question Bank</h1>

      {/* Filters */}
      <div className="admin-filters">
        <select className="admin-filter-select" value={difficultyFilter} onChange={e => setDifficultyFilter(e.target.value)}>
          <option value="all">Difficulty: All</option>
          <option value="easy">Easy</option>
          <option value="medium">Medium</option>
          <option value="hard">Hard</option>
        </select>
        <select className="admin-filter-select" value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="all">Category: All</option>
          {categories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="admin-table">
        <div className="admin-table-header">
          <span className="admin-table-header-cell admin-col--title">Title</span>
          <span className="admin-table-header-cell admin-col--difficulty">Difficulty</span>
          <span className="admin-table-header-cell admin-col--category">Category</span>
          <span className="admin-table-header-cell admin-col--actions">Actions</span>
        </div>
        <div className="admin-table-body">
          {loading && (
            <div className="admin-empty"><div>Loading questions...</div></div>
          )}
          {!loading && filtered.map(q => (
            <div key={q.id} className="admin-table-row">
              <span className="admin-table-cell admin-col--title">{q.title}</span>
              <span className={`admin-table-cell admin-col--difficulty admin-badge--${q.difficulty}`}>
                {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
              </span>
              <span className="admin-table-cell admin-col--category">{q.category}</span>
              <span className="admin-table-cell admin-col--actions">
                <button className="admin-icon-btn" title="Edit" onClick={() => openEditDrawer(q)}>
                  <Icon name="edit" size={18} color="#6F76A7" />
                </button>
                <button className="admin-icon-btn admin-icon-btn--danger" title="Delete" onClick={() => handleDelete(q.id)}>
                  <Icon name="trash" size={18} color="#F23A3C" />
                </button>
              </span>
            </div>
          ))}
          {!loading && filtered.length === 0 && (
            <div className="admin-empty">
              <div>No questions found. Click "Add Question" to create one.</div>
            </div>
          )}
        </div>
      </div>

      {/* FAB to open drawer */}
      {!drawerOpen && (
        <button
          className="admin-btn admin-btn--primary"
          style={{ position: 'fixed', bottom: 32, right: 32, borderRadius: 24, height: 48, padding: '0 24px', boxShadow: '0 4px 16px #FF610040' }}
          onClick={openCreateDrawer}
        >
          <Icon name="plus" size={20} color="#FFFFFF" />
          Add Question
        </button>
      )}

      {/* Right Drawer */}
      {drawerOpen && (
        <div className="admin-drawer-overlay">
          <div className="admin-drawer-backdrop" onClick={() => setDrawerOpen(false)} />
          <div className="admin-drawer">
            <div className="admin-drawer__header">
              <h2 className="admin-drawer__title">{editingQuestion ? 'Edit Question' : 'Create Question'}</h2>
              <button className="admin-drawer__close" onClick={() => setDrawerOpen(false)}>
                <Icon name="x" size={24} color="#6F76A7" />
              </button>
            </div>
            <div className="admin-drawer__body">
              <div>
                <label className="admin-field-label">Title</label>
                <input
                  className="admin-input"
                  placeholder="Enter question title"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="admin-field-label">Description (Markdown)</label>
                <textarea
                  className="admin-textarea"
                  style={{ minHeight: 120 }}
                  placeholder="Enter question description..."
                  value={formDesc}
                  onChange={e => setFormDesc(e.target.value)}
                />
              </div>
              <div>
                <label className="admin-field-label">Difficulty</label>
                <select className="admin-select" value={formDifficulty} onChange={e => setFormDifficulty(e.target.value)}>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>
              </div>
              <div>
                <label className="admin-field-label">Category</label>
                <input
                  className="admin-input"
                  placeholder="e.g. Arrays, Systems, Strings"
                  value={formCategory}
                  onChange={e => setFormCategory(e.target.value)}
                />
              </div>
              <div>
                <label className="admin-field-label">Template Code</label>
                <div className="admin-code-preview">
                  <textarea
                    placeholder={'<?php\nfunction solution($nums, $target) {\n  // Your code here\n}'}
                    value={formCode}
                    onChange={e => setFormCode(e.target.value)}
                  />
                </div>
              </div>
              <button
                className="admin-btn admin-btn--primary admin-btn--full"
                onClick={handleSave}
                disabled={!formTitle.trim() || isSaving}
                style={{ opacity: !formTitle.trim() ? 0.6 : 1 }}
              >
                {isSaving ? 'Saving...' : editingQuestion ? 'Update Question' : 'Add Question'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

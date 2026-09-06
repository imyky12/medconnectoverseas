import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Loader2, Plus, Edit2, Trash2, BookOpen, X, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CourseType {
  _id: string;
  courseCode: string;
  title: string;
  shortDescription: string;
  description: string;
  price: number;
  discountedPrice?: number;
  category: string;
  thumbnail: string;
  previewVideo?: string;
  isPublished: boolean;
  totalEnrollments: number;
  difficulty: string;
  instructorName: string;
  estimatedDurationHours: number;
  language: string;
  prerequisites: string[];
  learningOutcomes: string[];
  courseIncludes: string[];
  tags: string[];
}


function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[11px] font-bold text-muted  mb-1.5">
        {label}{required && <span className="text-declined ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = "w-full h-10 px-3 rounded-lg border border-rule text-sm focus:outline-none focus:ring-2 focus:ring-ink/25 focus:border-ink transition bg-white";
const textareaCls = "w-full px-3 py-2 rounded-lg border border-rule text-sm focus:outline-none focus:ring-2 focus:ring-ink/25 focus:border-ink transition resize-none bg-white";

export default function AdminCourses() {
  const [courses, setCourses] = useState<CourseType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingCourse, setEditingCourse] = useState<Partial<CourseType> | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const navigate = useNavigate();

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res: any = await api.get('/admin/courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.success) setCourses(res.data);
    } catch (err: any) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchCourses(); }, []);

  const openEdit = (course: CourseType) => {
    setEditId(course._id);
    setEditingCourse({
      ...course,
      prerequisites: course.prerequisites?.length ? course.prerequisites : [''],
      learningOutcomes: course.learningOutcomes?.length ? course.learningOutcomes : [''],
      courseIncludes: course.courseIncludes?.length ? course.courseIncludes : [''],
      tags: course.tags?.length ? course.tags : [''],
    });
  };

  const closeEdit = () => { setEditingCourse(null); setEditId(null); };

  const updField = (field: keyof CourseType, value: any) =>
    setEditingCourse(prev => prev ? { ...prev, [field]: value } : prev);

  const updArr = (field: 'prerequisites' | 'learningOutcomes' | 'courseIncludes' | 'tags', idx: number, val: string) => {
    const arr = [...(editingCourse?.[field] as string[] ?? [])];
    arr[idx] = val;
    updField(field, arr);
  };

  const addArrItem = (field: 'prerequisites' | 'learningOutcomes' | 'courseIncludes' | 'tags') =>
    updField(field, [...(editingCourse?.[field] as string[] ?? []), '']);

  const removeArrItem = (field: 'prerequisites' | 'learningOutcomes' | 'courseIncludes' | 'tags', idx: number) =>
    updField(field, (editingCourse?.[field] as string[]).filter((_, i) => i !== idx));

  const handleDelete = async (id: string) => {
    if (!window.confirm('Permanently delete this course? This cannot be undone.')) return;
    try {
      const token = localStorage.getItem('adminToken');
      const res: any = await api.delete(`/admin/courses/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.success) await fetchCourses();
      else alert(res.message);
    } catch { alert('Failed to delete course.'); }
  };

  const handleTogglePublish = async (course: CourseType) => {
    try {
      const token = localStorage.getItem('adminToken');
      await api.put(`/admin/courses/${course._id}`, { isPublished: !course.isPublished }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      await fetchCourses();
    } catch { alert('Failed to update status.'); }
  };

  const handleSaveEdit = async () => {
    if (!editingCourse || !editId) return;
    setIsSaving(true);
    try {
      const token = localStorage.getItem('adminToken');
      const payload = {
        ...editingCourse,
        prerequisites: (editingCourse.prerequisites as string[]).filter(s => s.trim()),
        learningOutcomes: (editingCourse.learningOutcomes as string[]).filter(s => s.trim()),
        courseIncludes: (editingCourse.courseIncludes as string[]).filter(s => s.trim()),
        tags: (editingCourse.tags as string[]).filter(s => s.trim()),
        price: Number(editingCourse.price),
        discountedPrice: editingCourse.discountedPrice ? Number(editingCourse.discountedPrice) : undefined,
        estimatedDurationHours: Number(editingCourse.estimatedDurationHours ?? 0),
      };
      const res: any = await api.put(`/admin/courses/${editId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.success) { closeEdit(); await fetchCourses(); }
      else alert(res.message || 'Failed to save.');
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to save changes.');
    } finally { setIsSaving(false); }
  };

  const ArrayEditor = ({
    label, field, placeholder,
  }: {
    label: string;
    field: 'prerequisites' | 'learningOutcomes' | 'courseIncludes' | 'tags';
    placeholder: string;
  }) => (
    <div>
      <label className="block text-[11px] font-bold text-muted  mb-2">{label}</label>
      <div className="space-y-2">
        {((editingCourse?.[field] as string[]) ?? ['']).map((val, idx) => (
          <div key={idx} className="flex gap-2">
            <input
              value={val}
              onChange={(e) => updArr(field, idx, e.target.value)}
              placeholder={placeholder}
              className={`${inputCls} flex-1`}
            />
            <button
              type="button"
              onClick={() => removeArrItem(field, idx)}
              className="p-2 text-faint hover:text-declined hover:bg-declined-wash rounded-lg transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => addArrItem(field)}
          className="flex items-center gap-1.5 text-xs text-ink font-semibold hover:underline"
        >
          <Plus className="h-3.5 w-3.5" /> Add {label.split(' ')[0]}
        </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-[30px] font-600 leading-tight text-ink">Courses</h1>
          <p className="mt-1.5 max-w-[62ch] text-[14px] text-muted">{courses.length === 1 ? '1 course' : `${courses.length} courses`}. Drafts stay hidden until you publish them.</p>
        </div>
        <button
          onClick={() => navigate('/admin/add-course')}
          className="inline-flex shrink-0 items-center gap-2 rounded-md bg-signal px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep"
        >
          <Plus className="h-4 w-4" strokeWidth={2} /> New course
        </button>
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Loader2 className="h-7 w-7 animate-spin text-ink" />
          <p className="text-sm text-muted">Loading courses…</p>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-lg border border-dashed border-rule flex flex-col items-center justify-center py-20">
          <BookOpen className="h-12 w-12 text-faint mb-4" />
          <p className="text-base font-semibold text-muted mb-2">No courses yet</p>
          <button onClick={() => navigate('/admin/add-course')} className="rounded-md bg-signal px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-signal-deep">
            Create your first course
          </button>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {courses.map(course => (
            <div key={course._id} className="bg-white rounded-lg border border-rule overflow-hidden flex flex-col hover:shadow-md transition-shadow">
              <div className="relative h-44 bg-rule-soft">
                <img
                  src={course.thumbnail || 'https://placehold.co/400x220/041c44/white?text=MCO'}
                  alt={course.title}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.src = 'https://placehold.co/400x220/041c44/white?text=MCO'; }}
                />
                <div className="absolute top-3 right-3">
                  <span className={`rounded bg-surface/95 px-2 py-1 text-[12px] font-600 ${course.isPublished ? 'text-confirmed' : 'text-muted'}`}>
                    {course.isPublished ? 'Live' : 'Draft'}
                  </span>
                </div>
                <div className="absolute bottom-3 left-3">
                  <span className="font-mono text-[12px] bg-black/60 text-white px-2 py-0.5 rounded backdrop-blur-sm">{course.courseCode}</span>
                </div>
              </div>
              <div className="p-5 flex-1 flex flex-col">
                <span className="text-[11px] font-bold text-ink  mb-1">{course.category}</span>
                <h3 className="font-bold text-ink text-sm leading-snug mb-1 line-clamp-2">{course.title}</h3>
                <p className="text-xs text-muted mb-3">{course.instructorName}</p>
                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-lg font-extrabold text-ink">₹{course.discountedPrice ?? course.price}</span>
                  {course.discountedPrice && <span className="text-xs text-faint line-through">₹{course.price}</span>}
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-rule-soft">
                  <span className="text-xs text-faint font-medium">{course.totalEnrollments} enrolled</span>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => handleTogglePublish(course)} className={`p-2 rounded-lg transition-colors ${course.isPublished ? 'text-holding hover:bg-holding-wash' : 'text-green-600 hover:bg-green-50'}`} title={course.isPublished ? 'Unpublish' : 'Publish'}>
                      {course.isPublished ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button onClick={() => openEdit(course)} className="p-2 rounded-lg text-faint hover:text-ink hover:bg-blue-50 transition-colors" title="Edit course">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleDelete(course._id)} className="p-2 rounded-lg text-faint hover:text-declined hover:bg-declined-wash transition-colors" title="Delete course">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Full-featured Edit Modal ── */}
      {editingCourse && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-3xl my-8">
            {/* Modal header */}
            <div className="flex items-center justify-between px-7 py-5 border-b border-rule-soft sticky top-0 bg-white rounded-t-2xl z-10">
              <div>
                <h3 className="text-lg font-bold text-ink">Edit Course</h3>
                <p className="text-xs font-mono text-faint mt-0.5">{courses.find(c => c._id === editId)?.courseCode}</p>
              </div>
              <button onClick={closeEdit} className="text-faint hover:text-body transition-colors"><X className="h-5 w-5" /></button>
            </div>

            <div className="p-7 space-y-7">
              {/* Section: Core */}
              <div>
                <p className="text-xs font-extrabold text-faint  mb-4">Core Details</p>
                <div className="space-y-4">
                  <Field label="Course Title" required>
                    <input value={editingCourse.title ?? ''} onChange={e => updField('title', e.target.value)} className={inputCls} placeholder="e.g., Complete Clinical Physiology" />
                  </Field>
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Instructor" required>
                      <input value={editingCourse.instructorName ?? ''} onChange={e => updField('instructorName', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Category" required>
                      <input value={editingCourse.category ?? ''} onChange={e => updField('category', e.target.value)} className={inputCls} placeholder="e.g., Anatomy" />
                    </Field>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <Field label="Difficulty">
                      <select value={editingCourse.difficulty ?? 'beginner'} onChange={e => updField('difficulty', e.target.value)} className={inputCls}>
                        <option value="beginner">Beginner</option>
                        <option value="intermediate">Intermediate</option>
                        <option value="advanced">Advanced</option>
                      </select>
                    </Field>
                    <Field label="Language">
                      <input value={editingCourse.language ?? 'English'} onChange={e => updField('language', e.target.value)} className={inputCls} />
                    </Field>
                    <Field label="Duration (hours)">
                      <input type="number" min="0" value={editingCourse.estimatedDurationHours ?? 0} onChange={e => updField('estimatedDurationHours', Number(e.target.value))} className={inputCls} />
                    </Field>
                  </div>
                  <Field label="Thumbnail URL" required>
                    <input type="url" value={editingCourse.thumbnail ?? ''} onChange={e => updField('thumbnail', e.target.value)} className={inputCls} placeholder="https://" />
                  </Field>
                  <Field label="Preview Video URL">
                    <input type="url" value={editingCourse.previewVideo ?? ''} onChange={e => updField('previewVideo', e.target.value)} className={inputCls} placeholder="https://youtube.com/..." />
                  </Field>
                </div>
              </div>

              {/* Section: Description */}
              <div>
                <p className="text-xs font-extrabold text-faint  mb-4">Marketing & Description</p>
                <div className="space-y-4">
                  <Field label="Short Description (tagline)" required>
                    <input maxLength={200} value={editingCourse.shortDescription ?? ''} onChange={e => updField('shortDescription', e.target.value)} className={inputCls} placeholder="One compelling sentence about the course" />
                  </Field>
                  <Field label="Full Description" required>
                    <textarea rows={5} value={editingCourse.description ?? ''} onChange={e => updField('description', e.target.value)} className={textareaCls} placeholder="Detailed course description…" />
                  </Field>
                </div>
              </div>

              {/* Section: Curriculum */}
              <div>
                <p className="text-xs font-extrabold text-faint  mb-4">Curriculum Details</p>
                <div className="grid md:grid-cols-2 gap-6">
                  <ArrayEditor label="Prerequisites" field="prerequisites" placeholder="e.g., Basic biology knowledge" />
                  <ArrayEditor label="Learning Outcomes" field="learningOutcomes" placeholder="e.g., Master neuro-anatomy" />
                  <ArrayEditor label="Course Includes" field="courseIncludes" placeholder="e.g., 10 video lectures" />
                  <ArrayEditor label="Tags" field="tags" placeholder="e.g., MBBS, pathology" />
                </div>
              </div>

              {/* Section: Pricing */}
              <div>
                <p className="text-xs font-extrabold text-faint  mb-4">Pricing</p>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Base Price (₹)" required>
                    <input type="number" min="0" value={editingCourse.price ?? 0} onChange={e => updField('price', Number(e.target.value))} className={`${inputCls} font-mono`} />
                  </Field>
                  <Field label="Discounted Price (₹)">
                    <input type="number" min="0" value={editingCourse.discountedPrice ?? ''} onChange={e => updField('discountedPrice', e.target.value ? Number(e.target.value) : undefined)} placeholder="Leave blank for none" className={`${inputCls} font-mono`} />
                  </Field>
                </div>
              </div>

              {/* Publish toggle */}
              <div className="flex items-center justify-between bg-paper rounded-lg px-5 py-4 border border-rule">
                <div>
                  <p className="text-sm font-semibold text-ink">Publish Course</p>
                  <p className="text-xs text-faint">Visible on the student marketplace</p>
                </div>
                <button
                  type="button"
                  onClick={() => updField('isPublished', !editingCourse.isPublished)}
                  className={`relative w-12 h-6 rounded-full transition-colors shrink-0 ${editingCourse.isPublished ? 'bg-green-500' : 'bg-slate-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 h-5 w-5 bg-white rounded-full shadow transition-transform ${editingCourse.isPublished ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>

            {/* Footer actions */}
            <div className="flex gap-3 px-7 pb-7">
              <button onClick={closeEdit} className="flex-1 h-11 border border-rule text-body rounded-lg font-semibold text-sm hover:bg-paper transition-colors">
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="flex-1 h-11 bg-ink hover:bg-ink text-white rounded-lg font-bold text-sm transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : 'Save All Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

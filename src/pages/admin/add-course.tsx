import React, { useState } from 'react';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import ImageUpload from '../../components/ui/image-upload';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Loader2, ArrowLeft, Plus, Trash2 } from 'lucide-react';
import { api } from '../../services/api';
import { useNavigate } from 'react-router-dom';

export default function AdminAddCourse() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    shortDescription: '',
    description: '',
    category: '',
    thumbnail: '',
    price: '',
    discountedPrice: '',
    isPublished: true,
    difficulty: 'beginner',
    language: 'English',
    instructorName: '',
    estimatedDurationHours: ''
  });

  const [prerequisites, setPrerequisites] = useState<string[]>(['']);
  const [learningOutcomes, setLearningOutcomes] = useState<string[]>(['']);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value 
    }));
  };

  const handleArrayChange = (index: number, value: string, type: 'prereq' | 'outcome') => {
    if (type === 'prereq') {
       const newArr = [...prerequisites];
       newArr[index] = value;
       setPrerequisites(newArr);
    } else {
       const newArr = [...learningOutcomes];
       newArr[index] = value;
       setLearningOutcomes(newArr);
    }
  };

  const addArrayItem = (type: 'prereq' | 'outcome') => {
    if (type === 'prereq') setPrerequisites([...prerequisites, '']);
    else setLearningOutcomes([...learningOutcomes, '']);
  };

  const removeArrayItem = (index: number, type: 'prereq' | 'outcome') => {
    if (type === 'prereq') setPrerequisites(prerequisites.filter((_, i) => i !== index));
    else setLearningOutcomes(learningOutcomes.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        price: Number(formData.price),
        discountedPrice: formData.discountedPrice ? Number(formData.discountedPrice) : undefined,
        estimatedDurationHours: Number(formData.estimatedDurationHours || 0),
        prerequisites: prerequisites.filter(p => p.trim() !== ''),
        learningOutcomes: learningOutcomes.filter(l => l.trim() !== ''),
        content: [] 
      };

      const token = localStorage.getItem('adminToken');
      const res: any = await api.post('/admin/courses', payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (res.success) {
        alert("Course minted successfully!");
        navigate('/admin/courses');
      } else {
        alert(res.message);
      }
    } catch (err: any) {
      alert(err.message || 'Error creating course');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center gap-4">
         <button onClick={() => navigate(-1)} className="p-2 hover:bg-white rounded-full transition-colors">
            <ArrowLeft className="h-6 w-6 text-gray-500" />
         </button>
         <div>
           <h2 className="text-3xl font-bold tracking-tight">Create New Course</h2>
           <p className="text-gray-500">Comprehensive curriculum setup mapping to standard MOOC guidelines.</p>
         </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card className="border-0 shadow-lg">
          <div className="border-b border-rule-soft px-6 py-4">
            <h2 className="font-display text-[16px] font-600 text-ink">Core Details</h2>
          </div>
          <CardContent className="p-8 space-y-6 py-6">
             <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <Label>Course Title <span className="text-declined">*</span></Label>
                  <Input name="title" required value={formData.title} onChange={handleChange} className="h-12 text-lg font-medium" placeholder="e.g. Complete Clinical Physiology" />
                </div>
                <div className="space-y-2">
                  <Label>Category Tag <span className="text-declined">*</span></Label>
                  <Input name="category" required value={formData.category} onChange={handleChange} className="h-12" placeholder="e.g. Anatomy" />
                </div>
                <ImageUpload
                  value={formData.thumbnail}
                  onChange={(url) => setFormData((prev: any) => ({ ...prev, thumbnail: url }))}
                  purpose="course-thumbnail"
                  asAdmin
                  required
                  label="Thumbnail image"
                  hint="The card image students see in the catalogue."
                />
             </div>
             
             <div className="grid md:grid-cols-4 gap-6 pt-4">
                <div className="space-y-2">
                  <Label>Difficulty Level</Label>
                  <select name="difficulty" value={formData.difficulty} onChange={handleChange} className="w-full h-12 border rounded-md px-3">
                     <option value="beginner">Beginner</option>
                     <option value="intermediate">Intermediate</option>
                     <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Input name="language" value={formData.language} onChange={handleChange} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Instructor Name <span className="text-declined">*</span></Label>
                  <Input name="instructorName" required value={formData.instructorName} onChange={handleChange} className="h-12" />
                </div>
                <div className="space-y-2">
                  <Label>Duration (Hours)</Label>
                  <Input name="estimatedDurationHours" type="number" min="0" value={formData.estimatedDurationHours} onChange={handleChange} className="h-12" />
                </div>
             </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <div className="border-b border-rule-soft px-6 py-4">
            <h2 className="font-display text-[16px] font-600 text-ink">Marketing & Syllabus Strings</h2>
          </div>
          <CardContent className="p-8 space-y-8 py-6">
            <div className="space-y-2">
              <Label>Short Description (Tagline) <span className="text-declined">*</span></Label>
              <Input name="shortDescription" required maxLength={200} value={formData.shortDescription} onChange={handleChange} className="h-12" />
            </div>
            <div className="space-y-2">
              <Label>Comprehensive Description <span className="text-declined">*</span></Label>
              <textarea 
                name="description" 
                required 
                rows={6}
                value={formData.description} 
                onChange={handleChange} 
                className="flex w-full rounded-md border border-gray-300 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ink" 
              />
            </div>

            <div className="grid md:grid-cols-2 gap-8 pt-4">
               {/* Prerequisites */}
               <div className="space-y-4">
                 <Label className="text-base">Prerequisites</Label>
                 {prerequisites.map((p, idx) => (
                   <div key={idx} className="flex items-center gap-2">
                      <Input value={p} onChange={e => handleArrayChange(idx, e.target.value, 'prereq')} placeholder="e.g. Basic biology knowledge" />
                      <button type="button" onClick={() => removeArrayItem(idx, 'prereq')} className="p-2 text-declined hover:bg-declined-wash rounded"><Trash2 className="h-4 w-4"/></button>
                   </div>
                 ))}
                 <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('prereq')}><Plus className="h-4 w-4 mr-2"/> Add Prerequisite</Button>
               </div>

               {/* Learning Outcomes */}
               <div className="space-y-4">
                 <Label className="text-base">Learning Outcomes</Label>
                 {learningOutcomes.map((l, idx) => (
                   <div key={idx} className="flex items-center gap-2">
                      <Input value={l} onChange={e => handleArrayChange(idx, e.target.value, 'outcome')} placeholder="e.g. Master neuro-anatomy pathways" />
                      <button type="button" onClick={() => removeArrayItem(idx, 'outcome')} className="p-2 text-declined hover:bg-declined-wash rounded"><Trash2 className="h-4 w-4"/></button>
                   </div>
                 ))}
                 <Button type="button" variant="outline" size="sm" onClick={() => addArrayItem('outcome')}><Plus className="h-4 w-4 mr-2"/> Add Outcome</Button>
               </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg">
          <div className="border-b border-rule-soft px-6 py-4">
            <h2 className="font-display text-[16px] font-600 text-ink">Pricing Strategy</h2>
          </div>
          <CardContent className="p-8 py-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Base Price (₹) <span className="text-declined">*</span></Label>
                <Input name="price" type="number" required min="0" value={formData.price} onChange={handleChange} className="h-12 font-mono" placeholder="4999" />
              </div>
              <div className="space-y-2">
                <Label>Discounted Price (₹) (Optional)</Label>
                <Input name="discountedPrice" type="number" min="0" value={formData.discountedPrice} onChange={handleChange} className="h-12 font-mono" placeholder="3999" />
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-8">
               <input 
                 type="checkbox" 
                 id="isPublished"
                 name="isPublished"
                 className="h-5 w-5 rounded border-gray-300 text-ink focus:ring-ink"
                 checked={formData.isPublished}
                 onChange={handleChange}
               />
               <Label htmlFor="isPublished" className="cursor-pointer text-base">Make Course Live Immediately</Label>
            </div>
          </CardContent>
        </Card>

        <Button 
          type="submit" 
          disabled={isLoading}
          className="w-full bg-ink hover:bg-ink text-white h-16 rounded-lg text-xl font-bold shadow-md"
        >
          {isLoading ? <Loader2 className="animate-spin h-6 w-6" /> : 'Mint Course Asset'}
        </Button>
      </form>
    </div>
  );
}

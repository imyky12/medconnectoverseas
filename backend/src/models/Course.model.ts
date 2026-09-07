import mongoose, { Document, Schema } from 'mongoose';

export interface ICourse extends Document {
  courseCode: string;
  title: string;
  description: string;
  shortDescription: string;
  price: number;
  discountedPrice?: number;
  currency: string;
  thumbnail: string;
  previewVideo?: string;
  content: {
    title: string;
    type: 'video' | 'image' | 'document';
    url: string;
    duration?: number; // in seconds for videos
    order: number;
  }[];
  courseIncludes: string[];
  prerequisites: string[];
  learningOutcomes: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  language: string;
  estimatedDurationHours: number;
  instructorName: string;
  category: string;
  tags: string[];
  isPublished: boolean;
  totalEnrollments: number;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    courseCode: { type: String, required: true, unique: true, uppercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    shortDescription: { type: String, required: true, maxlength: 200 },
    price: { type: Number, required: true, min: 0 },
    discountedPrice: { type: Number, min: 0 },
    currency: { type: String, default: 'INR' },
    thumbnail: { type: String, required: true },
    previewVideo: { type: String },
    content: [
      {
        title: { type: String, required: true },
        type: { type: String, enum: ['video', 'image', 'document'], required: true },
        url: { type: String, required: true },
        duration: { type: Number },
        order: { type: Number, required: true },
      },
    ],
    category: { type: String, required: true },
    tags: [{ type: String }],
    courseIncludes: [{ type: String }],
    prerequisites: [{ type: String }],
    learningOutcomes: [{ type: String }],
    difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
    language: { type: String, default: 'English' },
    estimatedDurationHours: { type: Number, default: 0 },
    instructorName: { type: String, required: true },
    isPublished: { type: Boolean, default: false },
    totalEnrollments: { type: Number, default: 0 },
  },
  {
    timestamps: true,
  }
);

courseSchema.index({ category: 1 });
courseSchema.index({ isPublished: 1 });

export const Course = mongoose.model<ICourse>('Course', courseSchema);

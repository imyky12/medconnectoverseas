import { Request, Response } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { ApiResponse } from '../../utils/ApiResponse';
import { Course } from '../../models/Course.model';
import { ApiError } from '../../utils/ApiError';

export const getAllCourses = asyncHandler(async (req: Request, res: Response) => {
  const courses = await Course.find().sort({ createdAt: -1 });
  res.status(200).json(new ApiResponse(200, courses, 'Courses fetched'));
});

export const createCourse = asyncHandler(async (req: Request, res: Response) => {
  const courseData = req.body;
  
  // Generate unique 6-char courseCode natively
  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();
  let courseCode = generateCode();
  while (await Course.exists({ courseCode })) {
    courseCode = generateCode();
  }
  courseData.courseCode = courseCode;

  const course = await Course.create(courseData);
  res.status(201).json(new ApiResponse(201, course, 'Course created successfully'));
});

export const updateCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const course = await Course.findByIdAndUpdate(id, req.body, { new: true, runValidators: true });
  if (!course) throw new ApiError(404, 'Course not found');
  res.status(200).json(new ApiResponse(200, course, 'Course updated successfully'));
});

export const deleteCourse = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const course = await Course.findByIdAndDelete(id);
  if (!course) throw new ApiError(404, 'Course not found');
  res.status(200).json(new ApiResponse(200, null, 'Course deleted successfully'));
});

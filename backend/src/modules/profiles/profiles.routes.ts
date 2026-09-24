import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../database/prisma.js';
import { authenticate, authorize } from '../../common/auth.middleware.js';
import { asyncHandler } from '../../common/async.js';
import { AppError } from '../../common/errors.js';
import type { Prisma } from '@prisma/client';

export const profilesRouter=Router();
const profileInput=z.object({firstName:z.string().max(80),lastName:z.string().max(80),headline:z.string().max(180).optional(),bio:z.string().max(5000).optional(),phone:z.string().max(30).optional(),location:z.string().max(120).optional(),yearsOfExperience:z.number().int().min(0).max(80).optional(),skills:z.array(z.string().max(80)).max(50).optional(),experience:z.array(z.unknown()).max(50).optional(),education:z.array(z.unknown()).max(50).optional()});
const jsonInput=(value:unknown[]|undefined):Prisma.InputJsonValue|undefined=>value===undefined?undefined:value as Prisma.InputJsonValue;
profilesRouter.get('/profile/applicant/:userId',authenticate,authorize('COMPANY','ADMIN'),asyncHandler(async(req,res)=>{const userId=String(req.params.userId);if(req.user!.role!=='ADMIN'){const company=await prisma.company.findFirst({where:{OR:[{ownerId:req.user!.id},{members:{some:{userId:req.user!.id}}}]}});if(!company)throw new AppError(403,'Company profile required');const application=await prisma.application.findFirst({where:{userId,job:{companyId:company.id}},select:{id:true}});if(!application)throw new AppError(403,'Candidate profile is available only to employers they have applied to');}const data=await prisma.jobSeekerProfile.findUnique({where:{userId},include:{user:{select:{email:true}}}});if(!data)throw new AppError(404,'Candidate profile not found');res.json({data});}));
profilesRouter.get('/profile',authenticate,authorize('JOB_SEEKER'),asyncHandler(async(req,res)=>{const data=await prisma.jobSeekerProfile.findUnique({where:{userId:req.user!.id}});res.json({data});}));
profilesRouter.patch('/profile',authenticate,authorize('JOB_SEEKER'),asyncHandler(async(req,res)=>{
  const input = profileInput.partial().parse(req.body);

  const data = await prisma.jobSeekerProfile.upsert({
    where:{userId:req.user!.id},
    create:{
      userId:req.user!.id,
      ...input,
      experience: jsonInput(input.experience),
      education: jsonInput(input.education)
    },
    update:{
      ...input,
      experience: jsonInput(input.experience),
      education: jsonInput(input.education)
    }
  });

  res.json({data});
}));
// Resume CRUD lives in modules/profiles/resumes.routes.ts (real upload/download with validation).

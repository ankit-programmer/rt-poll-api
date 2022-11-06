import express from 'express';
import { ApiError } from '../errors/api-error';
import logger from '../logger';
import { authenticate } from '../middlewares/auth';
import { createUser, getUser, updateUser, User } from '../models/user';
const router = express.Router();

router.route('/')
    .get(authenticate,async(req,res)=>{
        res.send({message:"Work in progress"})
    })
    .patch(authenticate,async(req,res)=>{
        
        res.send({message:"Work in progress"})
    })
    .post(authenticate,async(req,res)=>{
        res.send({message:"Work in progress"})
        
    })


export default router;
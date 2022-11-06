import express from 'express';
import { ApiError } from '../errors/api-error';
import logger from '../logger';
import { authenticate } from '../middlewares/auth';
import { createUser, getUser, updateUser, User } from '../models/user';
const router = express.Router();

router.route('/')
    .post(authenticate, async (req, res) => {
        try {
            let data: User = req.body;
            let firebaseUser = res.locals.user;
            data.email = firebaseUser.email;
            data.emailVerified = firebaseUser.email_verified;
            await createUser(firebaseUser.uid, data);
            return res.status(201).send({
                "status": "ok",
                "message": "User created successfylly!"
            })
        } catch (error: any) {
            switch (error?.code) {
                case 6:
                    return res.status(409).send({
                        "status": "error",
                        "message": "User already exists!"
                    })
                    break;

                default:
                    throw error;
                    break;
            }
        }
    })
    .patch(authenticate, async (req, res) => {
        try {
            let data: User = req.body;
            let firebaseUser = res.locals.user;
            data.email = firebaseUser.email;
            data.emailVerified = firebaseUser.email_verified;
            await updateUser(firebaseUser.uid, data);
            return res.status(200).send({
                "status": "ok",
                "message": "User updated successfylly!"
            })
        } catch (error:any) {
            switch (error?.code) {
                case 5:
                    return res.status(409).send({
                        "status": "error",
                        "message": "User doesn't exist!"
                    })
                    break;

                default:
                    throw error;
                    break;
            }
        }
    })
    .get(authenticate, async (req, res) => {
        try {
            let firebaseUser = res.locals.user;
            let user = await getUser(firebaseUser.uid);
            return res.status(200).send(user);
        } catch (error) {
            logger.error(error);
            throw error;
        }
    })

export default router;
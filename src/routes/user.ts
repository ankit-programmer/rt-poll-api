import express from 'express';
import producer from '../configs/rabbit-producer';
import { ApiError } from '../errors/api-error';
import logger from '../logger';
import { authenticate, isAnonymous, validateToken } from '../middlewares/auth';
import { createUser, getUser, updateUser, User } from '../models/user';
const router = express.Router();
type UserMerge = {
    anonymousUid: string,
    upgradeUid: string
}
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
        } catch (error: any) {
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

router.route("/merge")
    .post(authenticate, async (req, res, next) => {
        const QUEUE_NAME = `user-merge`;
        try {
            let data: any = req.body;
            let firebaseUser = res.locals.user;
            data.email = firebaseUser.email;
            // What I need to process
            if (isAnonymous(firebaseUser)) return res.status(400).send("You need a non-anonymous account to upgrade");
            const upgradeUid = firebaseUser?.uid;
            const token = data?.anonymousToken;
            // How will I  process
            const anonymousUser = await validateToken(token);
            if (!isAnonymous(anonymousUser)) return res.status(400).send("Only anonymous user can be upgraded");
            // What will I return
            await producer.publishToQueue(QUEUE_NAME, {
                anonymousUid: anonymousUser.uid,
                upgradeUid: upgradeUid
            }).then(() => {

                res.status(200).send({
                    'status': 'ok',
                    'message': "Processing user upgrade"
                });
            })
        } catch (error: any) {
            logger.error(error);
            next(new ApiError(error?.message, 400));
        }

    })
export default router;
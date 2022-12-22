import express from 'express';
import admin, { db } from '../configs/firebase';
import { ApiError } from '../errors/api-error';
import { authenticate } from '../middlewares/auth';
import poll from '../models/poll';
import { Poll } from '../models/poll';
import { getRandomNumber, getTimestamp } from '../utility';
import { DateTime } from 'luxon';
const router = express.Router();

router.route('/')
    .get(authenticate, async (req, res) => {
        const id = req.query.id;
        let firebaseUser = res.locals.user;
        // If id is available return spacific poll otherwise return all poll of the user
        if (id) {
            res.send(await poll.getPoll(id as string))
        } else {
            res.send(await poll.getUserPoll(firebaseUser.uid));
        }
    })
    .patch(authenticate, async (req, res, next) => {
        const id = req.query.id;
        let firebaseUser = res.locals.user;
        let body = req.body;
        if (!id) return next(new ApiError("id is required", 400));
        console.log(body);
        let result = await poll.updatePoll(id as string, body);
        res.send(result);
    })
    .post(authenticate, async (req, res, next) => {
        // res.send({ message: "Work in progress" })
        let body: any = req.body;
        let pollOptions = (body.options || []).map((option: any) => {
            return { ...option, id: getRandomNumber(4) }
        });
        if (!body.title) {
            return next(new ApiError("Give your poll a title", 500));
        }
        let firebaseUser = res.locals.user;
        let data: Poll = {
            title: body.title,
            owner: firebaseUser.uid,
            options: pollOptions || [],
            setting: {
                privacy: body?.setting?.privacy || 'public',
                startTime: getTimestamp() as any,
                endTime: DateTime.fromISO(body?.setting?.endTime).toSeconds() || undefined,
                radio: (body?.setting?.radio == false) ? false : true
            }
        }
        await poll.createPoll(data);
        return res.status(201).send({
            "status": "ok",
            "message": "Poll Created Successfully!"
        })

    });


export default router;
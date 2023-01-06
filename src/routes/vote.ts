import express from 'express';
import admin, { db } from '../configs/firebase';
import { ApiError } from '../errors/api-error';
import { authenticate } from '../middlewares/auth';
import poll from '../models/poll';
import { Poll } from '../models/poll';
import { getRandomNumber, getTimestamp } from '../utility';
import { DateTime } from 'luxon';
import producer from '../configs/rabbit-producer'
import voteModel from '../models/vote';
const router = express.Router();
const USER_VOTE_QUEUE = process.env.VOTE_QUEUE || "user-vote";

router.route('/:pollId')
    .get(authenticate, async (req, res, next) => {
        const pollId = req.params.pollId;
        let firebaseUser = res.locals.user;
        // const votes = await voteModel.getVote(pollId);
        const votes = await voteModel.getUserVote(firebaseUser.uid, pollId);
        return res.send(votes);
    })
    .patch(authenticate, async (req, res, next) => {
        // Change my vote from one option to another
        res.send("Work in progress!")
    })
    .post(authenticate, async (req, res, next) => {
        // Add my vote to given poll
        const optionId = req.query?.optionId as string;
        const pollId = req.params.pollId;
        let firebaseUser = res.locals.user;

        await voteModel.addVote(firebaseUser.uid, pollId, optionId).then(value => {
            producer.publishToQueue(USER_VOTE_QUEUE, {
                event: 'add',
                uid: firebaseUser.uid,
                pollId,
                optionId
            })
            return res.status(201).send({
                "status": "ok"
            });

        }).catch(error => {
            next(new ApiError(error?.message, 400));
        })

    })
    .delete(authenticate, async (req, res, next) => {
        // Might not be allowed for some polls
        let firebaseUser = res.locals.user;
        const pollId = req.params.pollId;
        await voteModel.removeVote(firebaseUser?.uid, pollId).then(value => {
            producer.publishToQueue(USER_VOTE_QUEUE, {
                event: 'add',
                uid: firebaseUser.uid,
                pollId
            })
            return res.status(200).send({
                "status": "ok"
            })
        }).catch(error => {
            next(new ApiError(error.message, 500));
        })
    });


export default router;
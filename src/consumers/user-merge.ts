import rabbitmqService, { Connection, Channel } from '../configs/rabbitmq';
import logger from "../logger";
import { UserVote } from '../models/user';
import { IConsumer } from './index';
import poll from '../models/poll';
import admin from '../configs/firebase';
import { deleteAnonymousUser } from '../middlewares/auth';
import vote from '../models/vote';

const QUEUE_NAME = process.env.USER_MERGE_QUEUE || 'user-merge';

async function processMsg(message: any, channel: Channel) {
    try {
        let event = message?.content;
        logger.info(event.toString());
        event = JSON.parse(event.toString());
        const anonymousUid = event?.anonymousUid;
        const upgradeUid = event?.upgradeUid;
        // Merge anonymous user with new user.

        // Get all the polls created by anonymous user
        // Move them to new user
        const movedPollId = await poll.movePoll(anonymousUid, upgradeUid);
        logger.info(movedPollId);
        const anonymousVotes = await new UserVote(anonymousUid).all();
        // const movedVotePollId = await new UserVote(anonymousUid).move(upgradeUid);
        // logger.info(movedVotePollId);
        for (const pollId of Object.keys(anonymousVotes)) {
            try {
                await vote.moveVote(pollId, anonymousUid, upgradeUid);
            } catch (error) {
                logger.error(error);
            }
        }
        await deleteAnonymousUser(anonymousUid);
        // Get all the votes casted by anonymous user
        // Acknowledge message
        channel.ack(message);
        // Delete user
    } catch (error) {
        logger.error(error);
    }
}

export default {
    queue: QUEUE_NAME,
    processor: processMsg
}
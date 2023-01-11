import rabbitmqService, { Connection, Channel } from '../configs/rabbitmq';
import logger from "../logger";
import { UserVote } from '../models/user';
import { IConsumer } from './index';

const BUFFER_SIZE = parseInt(process.env.RABBIT_WA_REP_BUFFER_SIZE || '50');

const QUEUE_NAME = process.env.VOTE_QUEUE || "user-vote";

async function processMsg(message: any, channel: Channel) {
    try {
        let event = message?.content;
        logger.info(event.toString());
        event = JSON.parse(event.toString());
        const operation = event?.event;
        const uid = event?.uid;
        const pollId = event?.pollId;
        switch (operation) {
            case 'add':
                {
                    const optionId = event?.optionId;
                    await new UserVote(uid).vote(pollId, optionId).then(value => channel.ack(message)).catch(error => logger.error(error));
                    break;
                }
            case 'remove':
                {
                    await new UserVote(uid).delete(pollId).then(value => channel.ack(message)).catch(error => logger.error(error));
                    break;
                }
            case 'change':
                {
                    const optionId = event.something.optionId;
                    await new UserVote(uid).change(pollId, optionId).then(value => channel.ack(message)).catch(error => logger.error(error));
                    break;
                }
            default:
                logger.error("Operation not supported");
                break;
        }

    } catch (error: any) {
        channel.nack(message);
    }
}


export default {
    queue: QUEUE_NAME,
    processor: processMsg
}





import redis from '../configs/redis';
import { ApiError } from '../errors/api-error';
import { UserVote } from './user';
import pollModel from './poll';
import logger from '../logger';
type Vote = {
    pollId: string,
    total: number,
    options: {
        [key: string]: {
            count: number,
            users?: string[]
        }
    },
    selected?: string
}
class VoteModel {
    /**
     * 
     * @param uid User who is voting
     * @param pollId Poll to vote for
     * @param optionId Option you want to vote for
     * @returns 
     */
    async addVote(uid: string, pollId: string, optionId: string) {
        // Trim inputs
        uid = uid.trim();
        pollId = pollId.trim();
        optionId = optionId.trim();

        // Create redis keys
        const hashKey = `vote:${pollId}:${optionId}`;
        const setKey = `vote:${pollId}`;

        // Get the poll data
        const poll = await pollModel.getPoll(pollId);

        // Check if option user want to vote for is a valid option
        const optionIds = poll?.options.map(option => option.id || "") || [];
        const isValidOption = optionIds.includes(optionId);
        if (!isValidOption) throw new Error("The option you want to vote for does not exist");

        // Make sure that poll is live to vote
        let isLive = true;
        const endTime = poll.setting?.endTime;
        const currentTime = Date.now();
        if (endTime && endTime < currentTime) {
            isLive = false;
        }
        if (!isLive) throw new ApiError("The poll you are trying to vote for is not live", 400);

        // Make sure that user don't vote twice
        const alreadyVoted = await redis.SISMEMBER(setKey, uid);
        if (alreadyVoted) throw new ApiError("You have already voted on this poll", 400);
        return await redis.multi().SADD(setKey, uid).HSET(hashKey, uid, 1).exec();
    }


    async getVote(pollId: string): Promise<Vote> {
        const result: Vote = { 'pollId': pollId, total: 0, options: {} };
        const poll = await pollModel.getPoll(pollId);
        const optionIds = poll?.options.map(option => option.id || "") || [];
        const countTask = [];
        for (const id of optionIds) {
            const key = `vote:${pollId}:${id}`;
            countTask.push(redis.HLEN(key));
        }
        const voteCounts = await Promise.all(countTask);
        voteCounts.forEach((count, index) => {
            const id = optionIds[index];
            result.options[id] = {
                count: count
            }
            result.total += count;
        })
        return result;
    }
    async getUserVote(uid: string, pollId: string) {
        const userVote = new UserVote(uid, pollId).get();
        const pollVote = this.getVote(pollId);
        let result;
        await Promise.all([userVote, pollVote]).then(([userVote, pollVote]) => {
            pollVote.selected = userVote?.selected;
            result = pollVote;
        });
        return result;
    }

    /**
     * 
     * @param uid User who is removing the vote
     * @param pollId Poll from which you want to remove your vote
     * @returns 
     */
    async removeVote(uid: string, pollId: string) {
        const poll = await pollModel.getPoll(pollId);
        const optionIds = poll?.options.map(option => option.id || "") || [];
        const setKey = `vote:${pollId}`;
        const removeTask = [];
        removeTask.push(redis.SREM(setKey, uid));
        for (const id of optionIds) {
            const key = `vote:${pollId}:${id}`;
            removeTask.push(redis.HDEL(key, uid));
        }
        const result = await Promise.all(removeTask).catch((reason) => {
            logger.error(reason);
            return [];
        });
        let removedOption = null;
        result.forEach((removed: number, index: number) => {
            if (removed && index >= 1) {
                removedOption = optionIds[index - 1];
            }
        });
        return removedOption;
    }
    /**
     * 
     * @param uid User who wants to change their vote
     * @param pollId Poll on which user want to change vote
     * @param optionId New option on which user want to vote
     */
    async changeVote(uid: string, pollId: string, optionId: string) {
        // Get the poll data
        // Check if changing vote is allowed
        // Remove previous vote of the user
        // Add new vote to the poll
    }
}


export default new VoteModel();
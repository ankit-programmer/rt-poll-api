import { DateTime } from 'luxon';
import { db } from '../configs/firebase';
import redis from '../configs/redis';

export type Poll = {
    id?: string,
    title: string,
    owner: string,
    options: Option[],
    setting: Setting
}
export type Option = {
    id?: string,
    text?: string,
    icon?: string,
    position?: number,
    value?: string
}
export type Setting = {
    startTime: number,
    endTime?: any,
    radio: boolean,
    privacy: 'private' | 'public' | 'anonymous'
}

const collection = db.collection('polls');
export class PollModel {

    async updatePoll(id: string, poll: Poll) {
        const pollRef = collection.doc(id);
        return await pollRef.update({
            title: poll?.title,
            "setting.endTime": DateTime.fromISO(poll?.setting?.endTime).toSeconds() || undefined,
            "setting.privacy": poll?.setting?.privacy
        })
    }

    async createPoll(poll: Poll) {
        const pollRef = collection.doc();
        if (!this.isOptionUnique(poll.options)) {
            throw new Error("Options are not unique");
        }
        return await pollRef.create(poll);

    }
    isOptionUnique(options: Option[]): boolean {
        let ids = options.map(option => option.id);
        return new Set(ids).size === ids.length;

    }



    async getPoll(id: string): Promise<Poll> {
        const pollRef = collection.doc(id);
        const poll = await pollRef.get();

        const data = poll.data();
        return data as Poll;
    }

    async getUserPoll(uid: string): Promise<Poll[]> {
        const pollsRef = collection.where('owner', '==', uid);
        const snapshot = await pollsRef.get();
        let polls: Poll[] = [];
        if (snapshot.empty) {
            return polls;
        }
        snapshot.forEach(poll => {
            polls.push({ id: poll.id, ...poll.data() as Poll });
        });
        return polls;
    }
}

export class CachedPoll {
    get(target: any, prop: any, receiver: any) {
        switch (prop) {
            case "getPoll":
                return async function (id: string) {
                    // TODO:PRODUCTION Increase expiry from 10M to 1 Day
                    const cacheKey = `poll:${id}`;
                    const cachedPoll = await redis.get(cacheKey);
                    if (cachedPoll) return JSON.parse(cachedPoll);
                    const data = await target[prop](...arguments);
                    if (!data) return undefined;
                    await redis.set(cacheKey, JSON.stringify(data), { EX: 360 });
                    return data;
                }
                break;
            case "getUserPoll":
                return async function (uid: string) {
                    const cacheKey = `poll:user:${uid}`;
                    const cachedPoll = await redis.get(cacheKey);
                    if (cachedPoll) return JSON.parse(cachedPoll as string);
                    const data = await target[prop](...arguments);
                    await redis.set(cacheKey, JSON.stringify(data), { EX: 360 });
                    return data;
                }
                break;
            case "updatePoll":
                return async function (id: string) {
                    const cacheKey = `poll:${id}`
                    redis.del(cacheKey);
                    return target[prop](arguments);
                }
            default:
                return Reflect.get(target, prop, receiver);
                break;
        }
    }
}


export default new Proxy(new PollModel(), new CachedPoll()) as PollModel;
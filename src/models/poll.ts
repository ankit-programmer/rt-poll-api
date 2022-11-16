import { DateTime } from 'luxon';
import { db } from '../configs/firebase';

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
export async function updatePoll(id: string, poll: Poll) {
    const pollRef = collection.doc(id);
    return await pollRef.update({
        title: poll?.title,
        "setting.endTime": DateTime.fromISO(poll?.setting?.endTime).toSeconds() || undefined,
        "setting.privacy": poll?.setting?.privacy
    })
}

export async function createPoll(poll: Poll) {
    const pollRef = collection.doc();
    if (!isOptionUnique(poll.options)) {
        throw new Error("Options are not unique");
    }
    return await pollRef.create(poll);

}
function isOptionUnique(options: Option[]): boolean {
    let ids = options.map(option => option.id);
    return new Set(ids).size === ids.length;

}



export async function getPoll(id: string): Promise<Poll> {
    const pollRef = collection.doc(id);
    const poll = await pollRef.get();
    return poll.data() as Poll;
}

export async function getUserPoll(uid: string): Promise<Poll[]> {
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
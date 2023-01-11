import { db } from '../configs/firebase';
export type User = {
    id?: string,
    firstName?: string,
    middleName?: string,
    lastName?: string,
    email?: string,
    gender?: 'male' | 'female',
    emailVerified?: boolean,
    avatar?: string
}

const userCollection = db.collection('users');
export async function updateUser(id: string, { firstName, middleName, lastName, gender, email, emailVerified, avatar }: User) {
    const userRef = userCollection.doc(id);
    return await userRef.update({
        firstName,
        middleName,
        lastName,
        gender,
        email,
        emailVerified,
        avatar
    });
}

export async function createUser(id: string, user: User) {
    const userRef = userCollection.doc(id);
    const { firstName, middleName, lastName, gender, email, emailVerified, avatar } = user;
    return await userRef.create({
        firstName,
        middleName,
        lastName,
        gender,
        email,
        emailVerified,
        avatar
    });
}
export class UserVote {
    private voteCollection;
    constructor(uid: string) {
        this.voteCollection = userCollection.doc(uid).collection("vote");
    }
    async vote(pollId: string, optionId: string) {
        return await this.voteCollection.doc(pollId).set({
            'selected': optionId
        })
    }
    async delete(pollId: string) {
        return await this.voteCollection.doc(pollId).delete();
    }
    async change(pollId: string, optionId: string) {
        return await this.voteCollection.doc(pollId).update({
            'selected': optionId
        })
    }
    async get(pollId: string) {
        return (await this.voteCollection.doc(pollId).get()).data();
    }

    async all() {
        const myVotes = await this.voteCollection.get();
        if (myVotes.empty) return [];
        const votes = new Map<string, any>();
        myVotes.forEach((vote) => {
            votes.set(vote.id, vote.data());
        })
        return votes;
    }
}

export async function getUser(id: string): Promise<User> {
    const userRef = userCollection.doc(id);
    const user = await userRef.get();
    return user.data() as User;
}
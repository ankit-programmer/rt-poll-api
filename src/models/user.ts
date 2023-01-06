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
    private voteRef;
    constructor(uid: string, pollId: string) {
        this.voteCollection = userCollection.doc(uid).collection("vote");
        this.voteRef = this.voteCollection.doc(pollId);
    }
    async vote(optionId: string) {
        return await this.voteRef.set({
            'selected': optionId
        })
    }
    async delete() {
        return await this.voteRef.delete();
    }
    async change(optionId: string) {
        return await this.voteRef.update({
            'selected': optionId
        })
    }
    async get() {
        return (await this.voteRef.get()).data();
    }
}

export async function getUser(id: string): Promise<User> {
    const userRef = userCollection.doc(id);
    const user = await userRef.get();
    return user.data() as User;
}
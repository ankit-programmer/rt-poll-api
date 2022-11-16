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

const collection = db.collection('users');
export async function updateUser(id: string, { firstName, middleName, lastName, gender, email, emailVerified, avatar }: User) {
    const userRef = collection.doc(id);
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
    const userRef = collection.doc(id);
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

export async function getUser(id: string): Promise<User> {
    const userRef = collection.doc(id);
    const user = await userRef.get();
    return user.data() as User;
}
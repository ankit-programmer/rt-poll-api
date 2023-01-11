import "../startup/setupenv";
import logger from "../logger";
import rabbitmqService, { Connection, Channel } from '../configs/rabbitmq';
import { has } from 'lodash';
import userVoteConsumer from './user-vote';
import userMerge from "./user-merge";

// Register Consumers
const consumers: { [key: string]: IConsumer } = {
    userVote: userVoteConsumer,
    userMerge: userMerge
}

export interface IConsumer {
    queue: string,
    processor: Function
}

const args = require('minimist')(process.argv.slice(2));

function invalidConsumerName(consumerName: string): Boolean {
    return !has(consumers, consumerName)
}

function getAvailableConsumers() {
    const consumerNames = Object.keys(consumers);
    const numberedConsumerNames = consumerNames.map((consumer, idx) => `${idx + 1}. ${consumer}`);
    return numberedConsumerNames.join('\n');
}

class Consumer {
    private connection?: Connection;
    private channel?: Channel;
    private queue: string;
    private processor: Function;
    private rabbitService;
    constructor(obj: IConsumer) {
        this.queue = obj.queue;
        this.processor = obj.processor;
        this.rabbitService = rabbitmqService();
        this.setup();
    }
    private setup() {
        this.rabbitService.on("connect", async (connection) => {
            this.connection = connection;
            this.channel = await this.connection?.createChannel();
            this.channel?.prefetch(1);
            this.channel?.assertQueue(this.queue, { durable: true });
            this.start();
        }).on("error", (error) => {
            logger.error(error);
        })
    }
    private start() {
        this.channel?.consume(this.queue, async (message: any) => {
            try {
                // this.rabbitService.closeConnection();
                await this.processor(message, this.channel);
                // this.channel?.ack(message);
            } catch (error) {
                logger.error(error);
                throw error;
                // this.channel?.nack(message);
            }
        }, { noAck: false })
    }
}

function main() {
    const consumerName: string = args['name'] || args['n'];
    if (!consumerName) {
        const names = Object.keys(consumers);
        for (const name of names) {
            new Consumer((consumers as any)[name]);
        }
    } else {

        if (invalidConsumerName(consumerName))
            return logger.error(`Valid consumer name is required\n\nAvailable consumers: \n${getAvailableConsumers()}`);
        new Consumer((consumers as any)[consumerName]);
    }
}

main();




import redis, { RedisClient } from 'redis';
const redisearch = require('redis-redisearch');
redisearch(redis);
import { crc32 } from 'crc';
import { brotliCompress, brotliDecompress, gzip, gunzip } from 'zlib';
import snappy from 'snappy';
export enum compressor {
    'SNAPPY', 'GZIP', 'BROTLI'
}
const REDIS_HOST = process.env.REDIS_HOST;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;
if (!REDIS_HOST || !REDIS_PASSWORD) throw new Error("REDIS_HOST AND REDIS_PASSWORD is required");



const redisOptions = {
    detect_buffers: true, host: REDIS_HOST, port: 6379, password: REDIS_PASSWORD, retry_strategy: function (options: any) {
        if (options.error && options.error.code === "ECONNREFUSED") {
            // End reconnecting on a specific error and flush all commands with
            // a individual error
            return new Error("The server refused the connection");
        }
        if (options.total_retry_time > 1000 * 60 * 60) {
            // End reconnecting after a specific timeout and flush all commands
            // with a individual error
            return new Error("Retry time exhausted");
        }
        if (options.attempt > 10) {
            // End reconnecting with built in error
            return undefined;
        }
        // reconnect after
        return Math.min(options.attempt * 100, 3000);
    }
}
class Redis extends RedisClient {

    constructor(options: any) {
        super(options);
    }



    // get(key: string, callback?: Function): boolean {
    //     return this.get(key, callback);

    // }

    cget(key: string, lib: compressor = compressor.SNAPPY): Promise<string> {
        return new Promise((resolve, reject) => {
            this.get(Buffer.from(key) as any, (error, value: any) => {
                if (error) {
                    return reject(error);
                }
                if (!value) {
                    return reject(new Error('Key Does Not Exist'));
                }
                // Compressed data received from redis.
                this.decompress(value, lib).then(text => {
                    return resolve(text);
                }).catch(reason => {
                    return reject(reason);
                })

            })
        })

    }

    cset(key: string, value: string, lib: compressor = compressor.SNAPPY): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.compress(value, lib).then(buffer => {
                this.set(key, buffer as any, (error, reply) => {
                    if (error) {
                        return reject(error);
                    }

                    return resolve(true);
                });
            }).catch(reason => {
                return reject(reason);
            })
        })
    }

    compress(text: string, lib: compressor): Promise<Buffer> {
        return new Promise(async (resolve, reject) => {
            if (typeof text !== 'string') {
                return reject(new Error('Provide a valid string to compress.'));
            }
            switch (lib) {
                case compressor.SNAPPY:
                    try {
                        let ctext = await snappy.compress(text);
                        return resolve(ctext);

                    } catch (error) {
                        return reject(error);
                    }
                    break;
                case compressor.BROTLI:
                    brotliCompress(text, {}, (error, ctext) => {
                        if (!error) {
                            return resolve(ctext);
                        }

                        return reject(error);
                    });
                    break;
                case compressor.GZIP:
                    gzip(text, (error, ctext) => {
                        if (!error) {
                            return resolve(ctext);
                        }

                        return reject(error);
                    })
                    break;
                default:
                    return reject(new Error('Provide a valid compressor.'));
                    break;
            }



        })
    }

    decompress(value: Buffer, lib: compressor): Promise<string> {
        return new Promise(async (resolve, reject) => {
            if (!(value instanceof Buffer)) {
                return reject(new Error('Provide a valid Buffer to decompress.'));
            }
            switch (lib) {
                case compressor.SNAPPY:
                    try {
                        let string = await snappy.uncompress(value, { asBuffer: false });
                        return resolve(string as any);
                    } catch (error) {
                        return reject(error);
                    }
                    break;
                case compressor.BROTLI:
                    brotliDecompress(value, {}, (error, string) => {
                        if (!error) {
                            return resolve(string.toString());
                        }
                        return reject(error);

                    })
                    break;
                case compressor.GZIP:
                    gunzip(value, (error, string) => {
                        if (!error) {
                            return resolve(string.toString());
                        }
                        return reject(error);

                    })
                    break;
                default:
                    return reject(new Error('Provide a valid compressor.'));
                    break;
            }
        })

    }

    /**
     * 
     * @param base Base Key Name
     * @param key Key you want to shard
     * @param totalElements Expected number of records to shard or store
     * @param shardSize Number of elements you want in a single shard
     * @returns 
     */
    shardKey(base: string, key: string, totalElements: number, shardSize: number) {
        // Got help from : https://redislabs.com/ebook/part-2-core-concepts/01chapter-9-reducing-memory-use/9-2-sharded-structures/9-2-1-hashes/#:~:text=To%20shard%20a%20HASH%20table,method%20of%20partitioning%20our%20data.&text=the%20shard%20ID%20that%20the%20data%20will%20be%20stored%20in.&text=a%20new%20key%20for%20a,and%20the%20HASH%20key%20HASH%20.
        let shardId;

        if (Number(key) && totalElements <= 0) {
            // Key is a number.
            shardId = Math.floor(parseInt(key, 10) / shardSize);


        } else {
            // Key is a string
            // let shards = Math.floor(2 * totalElements / shardSize);
            let shards = Math.ceil(totalElements / shardSize);

            shardId = crc32(key.toString()) % shards;

        }
        return `${base}:${shardId}`;
    }

    doesExist(key: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            this.sendCommand(`EXISTS`, [key], (error, result) => {
                if (!error) {
                    return resolve(result ? true : false);
                }
                return reject(error);
            })
        });
    }

    addSuggestion(dictionary: string, text: string, score: number = 1): Promise<any> {
        return new Promise((resolve, reject) => {
            this.sendCommand(`FT.SUGADD`, [dictionary, text, score], (error, result) => {
                if (!error) {
                    return resolve(result);
                }

                return reject(error);
            })
        })
    }

    getSuggestion(dictionary: string, text: string, fuzzy: boolean = true, limit: number = 5): Promise<Array<any>> {
        return new Promise((resolve, reject) => {
            const arg: Array<any> = [dictionary, text, 'MAX', limit];
            if (fuzzy) {
                arg.push('FUZZY');
            }
            this.sendCommand(`FT.SUGGET`, arg, (error, result) => {
                if (!error) {
                    return resolve(result);
                }
                return reject(error);
            })
        })
    }

}

export default new Redis(redisOptions);
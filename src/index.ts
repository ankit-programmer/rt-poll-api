import express, { Request, Response } from 'express';
require('dotenv').config();
import cors from 'cors';
import helmet from 'helmet';
import logger from "./logger";
import errorHandler from "./middlewares/error-handler";
import responseTime from 'response-time';
import user from './routes/user';
import poll from './routes/poll';
const PORT = process.env.PORT || 4000;
const app = express();


app.use(responseTime(function (req: Request, res: Response, time: any) {
    var statId = (req.method + req.originalUrl).toLowerCase()
        .replace(/[:.]/g, '')
        .replace(/\//g, '_')
    logger.info(`${statId} - ${time}`)
}));
app.use(express.json());
app.use(helmet.crossOriginResourcePolicy({ policy: "cross-origin" }));
app.use(express.urlencoded({ extended: true }));
app.use(cors({ origin: '*' }));
app.use('/user', user);
app.use('/poll',poll);

app.get("/", function (req, res) {
    return res.send(new Date());
});

app.get("/ping", (req, res) => {
    return res.status(200).send("pong");
})

app.use(errorHandler);
app.listen(PORT, () => {
    logger.info(`Listening on PORT : ${PORT}`);
});



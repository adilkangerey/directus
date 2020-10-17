
import * as http from 'http';
import * as https from 'https';
import qs from 'qs';
import { URL } from 'url';
import { createTerminus, TerminusOptions } from '@godaddy/terminus';
import { Request } from 'express';
import logger from './logger';
import emitter from './emitter';
import database from './database';
import app from './app';

const server = http.createServer(app);

server.on('request', function(req: http.IncomingMessage & Request, res: http.ServerResponse) {

	const startTime = process.hrtime();

	const complete = once(function(finished: boolean) {
		const elapsedTime = process.hrtime(startTime);
		const elapsedNanoseconds = (elapsedTime[0] * 1e9) + elapsedTime[1];
		const elapsedMilliseconds = elapsedNanoseconds / 1e6;

		const previousIn = req.connection._metrics?.in || 0;
		const previousOut = req.connection._metrics?.out || 0;

		const metrics = {
			in: req.connection.bytesRead - previousIn,
			out: req.connection.bytesWritten - previousOut,
		};

		req.connection._metrics = {
			in: req.connection.bytesRead,
			out: req.connection.bytesWritten,
		};

		// Compatibility when supporting serving with certificates
		let protocol = 'http';
		if (server instanceof https.Server) {
			protocol = 'https';
		}

		const url = new URL((req.originalUrl || req.url) as string, `${protocol}://${req.headers.host}`);
		const query = url.search.startsWith('?') ? url.search.substr(1) : url.search;

		const info = {
			finished,
			request: {
				aborted: req.aborted,
				completed: req.complete,
				method: req.method,
				uri: url.pathname,
				url: url.href,
				size: metrics.in,
				query: qs.parse(query),
				headers: req.headers,
			},
			response: {
				status: res.statusCode,
				size: metrics.out,
				headers: res.getHeaders(),
			},
			ip: req.headers['x-forwarded-for'] || req.connection?.remoteAddress || req.socket?.remoteAddress,
			duration: elapsedMilliseconds.toFixed(),
		};

		emitter.emitAsync('response', info).catch((err) => logger.warn(err));
	});

	res.once('finish', complete.bind(null, true));
	res.once('close', complete.bind(null, false));
});

const terminusOptions: TerminusOptions = {
	timeout: 1000,
	signals: ['SIGINT', 'SIGTERM', 'SIGHUP'],
	beforeShutdown,
	onSignal,
	onShutdown,
};

createTerminus(server, terminusOptions);

export default server;

function once(callback: Function): Function {
	let triggered = false;
	return function() {
		if (triggered) {
			return;
		}
		triggered = true;
		callback(...arguments);
	};
}

async function beforeShutdown() {
	await emitter.emitAsync('server.stop.before', { server });

	if (process.env.NODE_ENV === 'development') {
		logger.info('Restarting...');
	} else {
		logger.info('Shutting down...');
	}
}

async function onSignal() {
	await database.destroy();
	logger.info('Database connections destroyed');
}

async function onShutdown() {
	emitter.emitAsync('server.stop').catch((err) => logger.warn(err));

	if (process.env.NODE_ENV !== 'development') {
		logger.info('Directus shut down OK. Bye bye!');
	}
}

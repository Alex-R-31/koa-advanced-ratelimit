interface ratelimitOptions {
	total?: number;
	time?: number;
	increasingLimit?: boolean;
	responseFormat?: any;
	banUsers?: boolean;
	banResponseFormat?: any;
	getIP?: Function;
}

interface ratelimitValue {
	reset: number,
	remaining: number,
	fails: number,
}

export class Ratelimiter {
	total: number;
	time: number;
	increasingLimit: boolean;
	ratelimitResponse: any;
	banUsers: boolean;
	banResponseFormat: any;
	keyFn: Function;

	private cache: Map<string, ratelimitValue>;

	constructor(options: ratelimitOptions = {}) {
		this.total = options && options.total ? options.total : 10;
		this.time = options && options.time ? options.time : 60;
		this.increasingLimit = options && options.increasingLimit ? !!options.increasingLimit : true;
		this.ratelimitResponse = options && options.responseFormat ? options.responseFormat : { status: 429, message: 'You have been ratelimited.' };
		this.banUsers = options && options.banUsers ? !!options.banUsers : true;
		this.banResponseFormat = options && options.banResponseFormat ? options.banResponseFormat : { status: 403, message: 'You have been banned.' };
		this.keyFn = options && options.getIP && typeof options.getIP == 'function' ? options.getIP : (ctx) => ctx.get('cf-connecting-ip') || ctx.get('x-forwarded-for') || ctx.request.ip;

		this.cache = new Map();
	}
	middleware() {
		return (ctx, next) => {
			const ip = this.keyFn(ctx);
			if (!ip) return next();

			let item: ratelimitValue = this.cache.get(ip);
			if (item && item.reset <= Date.now()) {
				this.cache.delete(ip);
				item = null;
			};

			if (!item) {
				const i: ratelimitValue = {
					reset: Date.now() + (this.time * 1000),
					remaining: this.total,
					fails: 0
				}
				this.cache.set(ip, i);
				item = this.cache.get(ip);

				ctx.set('x-ratelimit-limit', this.total);
				ctx.set('x-ratelimit-remaining', item.remaining - 1 >= 0 ? item.remaining - 1 : 0);
				ctx.set('x-ratelimit-reset', item.reset);
				item.remaining--;
				return next();
			} else {
				ctx.set('x-ratelimit-limit', this.total);
				ctx.set('x-ratelimit-remaining', item.remaining - 1 >= 0 ? item.remaining - 1 : 0);
				ctx.set('x-ratelimit-reset', item.reset);

				if (item.remaining == 0) {
					if (item.fails > 10 && this.banUsers) {
						ctx.status = 403;
						return ctx.body = this.banResponseFormat;
					}
					if (item.fails > 3 && this.increasingLimit) {
						item.reset += this.time * 1000;
						ctx.set('x-ratelimit-reset', item.reset);
					}
					item.fails++;
					ctx.set('retry-after', -Math.round(Date.now() / 1000 - item.reset / 1000));
					ctx.status = 429;
					return ctx.body = this.ratelimitResponse;
				}
				item.remaining--;
				return next();
			}
		};
	}
}
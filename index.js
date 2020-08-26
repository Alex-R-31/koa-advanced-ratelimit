"use strict";
exports.__esModule = true;
exports.Ratelimiter = void 0;
var Ratelimiter = /** @class */ (function () {
    function Ratelimiter(options) {
        if (options === void 0) { options = {}; }
        this.total = options && options.total ? options.total : 10;
        this.time = options && options.time ? options.time : 60;
        this.increasingLimit = options && options.increasingLimit ? !!options.increasingLimit : true;
        this.ratelimitResponse = options && options.responseFormat ? options.responseFormat : { status: 429, message: 'You have been ratelimited.' };
        this.banUsers = options && options.banUsers ? !!options.banUsers : true;
        this.banResponseFormat = options && options.banResponseFormat ? options.banResponseFormat : { status: 403, message: 'You have been banned.' };
        this.keyFn = options && options.getIP && typeof options.getIP == 'function' ? options.getIP : function (ctx) { return ctx.get('cf-connecting-ip') || ctx.get('x-forwarded-for') || ctx.request.ip; };
        this.cache = new Map();
    }
    Ratelimiter.prototype.middleware = function () {
        var _this = this;
        return function (ctx, next) {
            var ip = _this.keyFn(ctx);
            if (!ip)
                return next();
            var item = _this.cache.get(ip);
            if (item && item.reset <= Date.now()) {
                _this.cache["delete"](ip);
                item = null;
            }
            ;
            if (!item) {
                var i = {
                    reset: Date.now() + (_this.time * 1000),
                    remaining: _this.total,
                    fails: 0
                };
                _this.cache.set(ip, i);
                item = _this.cache.get(ip);
                ctx.set('x-ratelimit-limit', _this.total);
                ctx.set('x-ratelimit-remaining', item.remaining - 1 >= 0 ? item.remaining - 1 : 0);
                ctx.set('x-ratelimit-reset', item.reset);
                item.remaining--;
                return next();
            }
            else {
                ctx.set('x-ratelimit-limit', _this.total);
                ctx.set('x-ratelimit-remaining', item.remaining - 1 >= 0 ? item.remaining - 1 : 0);
                ctx.set('x-ratelimit-reset', item.reset);
                if (item.remaining == 0) {
                    if (item.fails > 10 && _this.banUsers) {
                        ctx.status = 403;
                        return ctx.body = _this.banResponseFormat;
                    }
                    if (item.fails > 3 && _this.increasingLimit) {
                        item.reset += _this.time * 1000;
                        ctx.set('x-ratelimit-reset', item.reset);
                    }
                    item.fails++;
                    ctx.set('retry-after', -Math.round(Date.now() / 1000 - item.reset / 1000));
                    ctx.status = 429;
                    return ctx.body = _this.ratelimitResponse;
                }
                item.remaining--;
                return next();
            }
        };
    };
    return Ratelimiter;
}());
exports.Ratelimiter = Ratelimiter;

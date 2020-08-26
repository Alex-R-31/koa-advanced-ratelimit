# koa-advanced-ratelimit
An advanced ratelimiter for [koa.js](https://koajs.com) 2.0.

**Features**:
- Customisable time limit
- Customisable amount of requests/time
- Automatically increase ratelimit on repeated fails
- Custom response format
- Automatically ban users (403) on several repeated fails
- Custom ban response format
- Custom IP functions

## Installation

```npm install koa-advanced-ratelimit```

## Usage

```js
const Koa = require('koa');
const app = new Koa();

const { Ratelimiter } = require('koa-advanced-ratelimiter');

const ratelimit = new Ratelimiter(options);

app.use(ratelimit.middleware());

app.use(ctx => {
	ctx.body = 'Hello World';
});

app.listen(3000);
```

## Options

|Property|Type|Example|Default Value|
|---|---|---|---|
|total|Integer|`10 // 10 requests allowed in time`|10|
|time|Integer|`60 // 60 seconds`|60|
|increasingLimit|Boolean|`false`|false|
|responseFormat|Any|`"You have been banned"`|`{ status: 429, message: 'You have been ratelimited.' }`|
|banUsers|Boolean|`false`|false|
|banResponseFormat|Any|`"You have been banned"`|`{ status: 403, message: 'You have been banned.' }`|
|getIP|Function|(ctx) => ctx.request.ip|`(ctx) => ctx.get('cf-connecting-ip') || ctx.get('x-forwarded-for') || ctx.request.ip`|
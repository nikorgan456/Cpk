import { DurableObject } from "cloudflare:workers";
export class Hub extends DurableObject {}
export class Room extends DurableObject {}
export default { async fetch(req, env){ return env.ASSETS.fetch(req); } };

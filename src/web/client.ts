import * as language from 'vscode-languageclient/node';
import {handleClient, languageclient} from "../client";
import { LanguageClient, StreamInfo } from 'vscode-languageclient/lib/node/main';
import * as wsstream from "websocket-stream";
import { STeXContext } from '../shared/context';
/*
class WSWorker extends Worker {
	ws : WebSocketStream.WebSocketDuplex;
	constructor(ws : WebSocketStream.WebSocketDuplex) {
		this.ws = ws;
	}
}*/

export function launchWebRemote(context: STeXContext) {
	//let worker = new WSWorker(ws("ws://localhost:5008"));
	/*let worker : Worker = {
		onmessage: null,
		onmessageerror: null,
		postMessage: (msg,transfer) => {},
		terminate: () => {},
		addEventListener: (type: K, listener: (this: Worker, ev: WorkerEventMap[K]) => {
			webs.addListener()
		},
		removeEventListener: () => {},
		dispatchEvent: (e) => {return true;},
		onerror: (e) => {}
	};
	context.client = new LanguageClient("stex","sTeX",{
		documentSelector: [{scheme:"file", language:"tex"},{scheme:"file", language:"latex"}],
		synchronize: {}
	},worker);
	*/
	let ws = wsstream("ws://localhost:5008");
	context.client = languageclient(() => Promise.resolve<StreamInfo>({
		reader: ws,
		writer: ws
	}));
	handleClient(context);
}
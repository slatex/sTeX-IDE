export async function viewer(mode?: string) {
	console.log('Viewer: ' + mode);
}


export function updateHTML(msg:HTMLUpdateMessage) {
	console.log("HTML Return: " + msg.html);
}


export class HTMLUpdateMessage {
    html : string;

	constructor(html : string) {
		this.html = html;
	}
}
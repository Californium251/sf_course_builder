import { promises as fs } from 'fs';
import process from 'node:process';
import * as path from 'path';
import xml2js from 'xml2js';
import { NodeHtmlMarkdown } from 'node-html-markdown';
import { google } from 'googleapis'
import { authenticate } from '@google-cloud/local-auth';

// // If modifying these scopes, delete token.json.
// const SCOPES = ['https://www.googleapis.com/auth/script.projects', 'https://www.googleapis.com/auth/drive'];
// // The file token.json stores the user's access and refresh tokens, and is
// // created automatically when the authorization flow completes for the first
// // time.
// const TOKEN_PATH = path.join(process.cwd(), 'token.json');
// const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

// /**
//  * Reads previously authorized credentials from the save file.
//  *
//  * @return {Promise<OAuth2Client|null>}
//  */
// async function loadSavedCredentialsIfExist() {
//     try {
//         const content = await fs.readFile(TOKEN_PATH);
//         const credentials = JSON.parse(content);
//         return google.auth.fromJSON(credentials);
//     } catch (err) {
//         return null;
//     }
// }

// /**
//  * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
//  *
//  * @param {OAuth2Client} client
//  * @return {Promise<void>}
//  */
// async function saveCredentials(client) {
//     const content = await fs.readFile(CREDENTIALS_PATH);
//     const keys = JSON.parse(content);
//     const key = keys.installed || keys.web;
//     const payload = JSON.stringify({
//         type: 'authorized_user',
//         client_id: key.client_id,
//         client_secret: key.client_secret,
//         refresh_token: client.credentials.refresh_token,
//     });
//     await fs.writeFile(TOKEN_PATH, payload);
// }

// /**
//  * Load or request or authorization to call APIs.
//  *
//  */
// async function authorize() {
//     let client = await loadSavedCredentialsIfExist();
//     if (client) {
//         return client;
//     }
//     client = await authenticate({
//         scopes: SCOPES,
//         keyfilePath: CREDENTIALS_PATH,
//     });
//     if (client.credentials) {
//         await saveCredentials(client);
//     }
//     return client;
// }

// /**
//  * Creates a new script project, upload a file, and log the script's URL.
//  * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
//  */
// async function callAppsScript(auth) {
//     const script = google.script({ version: 'v1', auth });
//     let res = await script.projects.create({
//         resource: {
//             title: 'My Script',
//         },
//     });
//     res = await script.projects.updateContent({
//         scriptId: res.data.scriptId,
//         auth,
//         resource: {
//             files: [
//                 {
//                     name: 'hello',
//                     type: 'SERVER_JS',
//                     source: 'function helloWorld() {\n  console.log("Hello, world!");\n}',
//                 },
//                 {
//                     name: 'appsscript',
//                     type: 'JSON',
//                     source:
//                         '{"timeZone":"America/New_York","exceptionLogging":' + '"CLOUD"}',
//                 },
//             ],
//         },
//     });
//     console.log(`https://script.google.com/d/${res.data.scriptId}/edit`);
//     await script.scripts.run({
//         scriptId: res.data.scriptId,
//         resource: {
//             function: 'helloWorld',
//         },
//     });
// }

// authorize().then(callAppsScript).catch((error) => { console.log(error.message) });

// App actual code starts here

const seq = ['course', 'chapter', 'sequential', 'vertical', 'html'];

const xmlParser = new xml2js.Parser({ explicitChildren: true, preserveChildrenOrder: true });

const promisify = (asyncFunc) => (...args) => {
    return new Promise((resolve, reject) => {
        asyncFunc(...args, (err, result) => {
            if (err) reject(err);
            resolve(result);
        });
    });
}

const xmlParserPromise = promisify(xmlParser.parseString);

const getHTMLContent = async (fileName, dir) => {
    const filePath = path.resolve(process.cwd(), 'data/course', dir, `${fileName}.html`);
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
}

const problem2HtmlParser = (problemContent) => {
    console.log(problemContent);
}

const resultPath = path.resolve(process.cwd(), 'result', 'result.md');

const getter = async (fileName, tagIndex, format) => {
    try {
        const filePath = path.resolve(process.cwd(), 'data/course', seq[tagIndex], `${fileName}.${format}`,);
        const content = await fs.readFile(filePath, 'utf-8');
        if (format === 'xml') {
            const parsedXml = await xmlParserPromise(content);
            const displayName = parsedXml[seq[tagIndex]].$.display_name;
            const children = parsedXml[seq[tagIndex]].$$;
            if (children) {
                await fs.appendFile(resultPath, NodeHtmlMarkdown.translate(`<h${tagIndex + 1}>${displayName}</h${tagIndex + 1}><br/>`));
                for (let child of children) {
                    const urlName = child.$.url_name;
                    await getter(urlName, tagIndex + 1, 'xml');
                }
            } else {
                const regex = /"\#name":"(.+?)"/
                const match = regex.exec(JSON.stringify(parsedXml[seq[tagIndex]]))[1];
                if (match === 'html') {
                    const htmlContent = await getHTMLContent(parsedXml[seq[tagIndex]].$.filename, match);
                    const res = NodeHtmlMarkdown.translate(htmlContent);
                    fs.appendFile(resultPath, res);
                    await fs.appendFile(resultPath, fileName + '\n');
                }
            }
        }
    } catch (e) {
        // console.log(`
        // fileName: ${fileName}, format: ${format}, contentLevel: ${seq[tagIndex - 1]}`)
    }

}

getter('2022', 0, 'xml');

import {createDatabase,createApp} from '../server/local.js';
if(!process.env.TEST_DATABASE)throw new Error('Tests require a temporary database.');
const {db}=createDatabase(process.env.TEST_DATABASE);
Bun.serve({hostname:'127.0.0.1',port:8771,fetch:createApp({db}).fetch});

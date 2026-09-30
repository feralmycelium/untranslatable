import {mkdir,cp,copyFile,writeFile,readFile,rm} from 'node:fs/promises';
import {resolve} from 'node:path';
const root=resolve(import.meta.dir,'..');
for(const name of ['DESIGN-CONTRACT.md','LICENSE','ART-LICENSE.md'])await copyFile(root+'/'+name,root+'/public/'+name);
await rm(root+'/public/source.zip',{force:true});
const source=['public','server','db','drizzle','scripts','tests','.github','package.json','package-lock.json','drizzle.config.ts','README.md','DESIGN-CONTRACT.md','CONTRIBUTING.md','AGENTS.md','LICENSE','ART-LICENSE.md','.gitignore'];
const zip=Bun.spawnSync(['zip','-q','-r',root+'/public/source.zip',...source,'-x','public/source.zip'],{cwd:root});
if(zip.exitCode!==0)throw new Error('Could not package the open source download.');
await mkdir(root+'/dist/server',{recursive:true});
await mkdir(root+'/dist/.openai',{recursive:true});
const result=await Bun.build({entrypoints:[root+'/server/worker.js'],outdir:root+'/dist/server',naming:'index.js',target:'browser',format:'esm',minify:true});
if(!result.success)throw new Error(result.logs.join('\n'));
await cp(root+'/public',root+'/dist/client',{recursive:true});
await cp(root+'/drizzle',root+'/dist/.openai/drizzle',{recursive:true});
let hosting={d1:'DB',r2:null};
try{hosting=JSON.parse(await readFile(root+'/.openai/hosting.json','utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
await writeFile(root+'/dist/.openai/hosting.json',JSON.stringify(hosting));
for(const name of ['DESIGN-CONTRACT.md','LICENSE','ART-LICENSE.md'])await copyFile(root+'/'+name,root+'/dist/client/'+name);
console.log('Built Worker, client assets and schema migrations.');

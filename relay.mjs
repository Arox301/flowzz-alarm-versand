// Runs only on an explicitly dispatched standard public GitHub-hosted runner.
// Never log notification bodies, topics, keys or raw upstream errors.
import {pathToFileURL} from "node:url";
import {resolve} from "node:path";
export async function deliver({url,key,topic,fetcher=fetch,max=20}){
  if(!/^https:\/\/flowzz-alarm\.[a-z0-9-]+\.workers\.dev$/.test(url)||! /^[a-f0-9]{64}$/.test(key)||!/^pa-[a-f0-9]{48}$/.test(topic))throw new Error("Relay configuration missing or invalid");
  const api=async(path,body)=>{
    const response=await fetcher(url+path,{method:"POST",headers:{Authorization:"Bearer "+key,"Content-Type":"application/json"},body:JSON.stringify(body || {}),redirect:"manual",signal:AbortSignal.timeout(20000)});
    if(response.status!==200)throw new Error("Private relay API unavailable");return response.json();
  };
  let sent=0;
  for(let i=0;i<max;i++){
    const {Item:item}=await api("/relay/claim");if(!item)break;
    if(!/^[a-f0-9-]{36}$/.test(item.Id)||typeof item.Title!=="string"||typeof item.Message!=="string"||item.Message.length>4096)throw new Error("Relay message invalid");
    if(!(await api("/relay/validate",{Id:item.Id})).Allowed){await api("/relay/finish",{Id:item.Id,Delivery:"cancelled"});continue;}
    let outcome={Id:item.Id,Delivery:"uncertain"};
    try{
      const response=await fetcher("https://ntfy.sh/",{method:"POST",headers:{"Content-Type":"application/json; charset=utf-8","User-Agent":"Local-Price-Alert/1.13"},body:JSON.stringify({topic,title:item.Title,message:item.Message,priority:3,tags:["bell"]}),redirect:"manual",signal:AbortSignal.timeout(15000)});
      const body=await response.json();
      if(response.status===200 && body.topic===topic && body.event==="message" && typeof body.id==="string" && body.id)outcome.Delivery="sent";
      else if(response.status===429 && body.http===429 && Number.isSafeInteger(body.code)&&body.code>=42900&&body.code<43000){const wait=response.headers.get("retry-after");outcome={...outcome,Delivery:"rejected",ServiceCode:body.code,RetryAfter:wait&&/^\d+$/.test(wait)?Number(wait):3600};}
    }catch{}
    await api("/relay/finish",outcome);
    if(outcome.Delivery==="sent")sent++;
    else break;
  }
  return {sent};
}
if(process.argv[1] && import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  deliver({url:process.env.FLOWZZ_URL,key:process.env.RELAY_KEY,topic:process.env.NTFY_TOPIC}).then(result=>console.log("ntfy confirmations: "+result.sent)).catch(()=>{console.error("Relay could not finish; uncertain sends will not be repeated.");process.exitCode=1;});
}

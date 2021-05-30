import TimelineApi from '@/lib/api/timeline'
import { getAccessToken } from '@auth0/nextjs-auth0';


export default async function handleTimeline(req, res){
    if(req.method === 'GET'){
        const json = await new TimelineApi().getById(req.query.id);
        return res.json(json.data);

    }

    if(req.method =='PATCH'){
        const { accessToken } = await getAccessToken(req, res);
        const json  = await new TimelineApi(accessToken).update(req.query.id, req.body);
        return res.json(json.data);
    }
}
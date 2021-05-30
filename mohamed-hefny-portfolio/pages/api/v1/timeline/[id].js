import TimelineApi from '@/lib/api/timeline'


export default async function handleTimeline(req, res){
    const json = await new TimelineApi().getById(req.query.id);
    return res.json(json.data);
}
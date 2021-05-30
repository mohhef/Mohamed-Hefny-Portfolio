
import TimelineApi from '@/lib/api/timeline'
import { getAccessToken } from '@auth0/nextjs-auth0';

export default async function createTimeline(req, res) {

    try {
        const { accessToken } = await getAccessToken(req, res);
        const json = await new TimelineApi(accessToken).createTimeline(req.body)
        return res.json(json.data)
    } catch (e) {
        return res.status(e.status || 422).json(e.response.data)
    }

}
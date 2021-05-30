import axios from 'axios';

class TimelineApi {

    constructor(accessToken){
        this.config = {}
        if (accessToken){
            this.config.headers = {
                authorization: `Bearer ${accessToken}`
            }
        }
        this.apiUrl = process.env.TIMELINE_API_URL + '/timeline'
    }
    
    getAll() {
        return axios.get(this.apiUrl);
    }

    getById(id){
        return axios.get(`${this.apiUrl}/${id}`);
    }
    createTimeline(data) {
        return axios.post(this.apiUrl, data, this.config)
    }


}

export default TimelineApi;
import axios from 'axios';

class TimelineApi {

    constructor(){
        this.apiUrl = process.env.TIMELINE_API_URL + '/timeline'
    }
    getAll() {
        return axios.get(this.apiUrl);
    }

    createTimeline(data) {
        return axios.post(this.apiUrl, data)
    }
}

export default TimelineApi;
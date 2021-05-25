import axios from 'axios';

class TimelineApi{
    getAll(){
        return axios.get('http://localhost:3001/api/v1/timeline');
    }
}

export default TimelineApi;
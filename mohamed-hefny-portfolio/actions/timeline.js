import axios from 'axios'

export function createTimeline(data){
    return axios.post('/api/v1/portfolio',data)
}
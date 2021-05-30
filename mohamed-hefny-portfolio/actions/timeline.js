import axios from 'axios'
import { useApiHandler } from '@/actions'
import useSWR from 'swr'
import {fetcher} from '@/actions'

const createTimeline = (data) => axios.post('/api/v1/timeline',data)
const updateTimeline = (id, data) => axios.patch(`/api/v1/timeline/${id}`,data)

export const useCreateTimeline = () => useApiHandler(createTimeline)
export const useUpdateTimeline = () => useApiHandler(updateTimeline)


export const useGetTimeline = (id) =>{
    const {data, error, ...rest} = useSWR(id?`/api/v1/timeline/${id}`:null, fetcher)
    return {data, error, loading: !data && !error, ...rest}
}

//equivalent to export function useCreateTimeline(){
// return useApiHandler(createPortfolio)    
//}
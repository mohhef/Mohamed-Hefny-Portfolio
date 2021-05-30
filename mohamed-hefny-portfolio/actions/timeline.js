import axios from 'axios'
import { useApiHandler } from '@/actions'

const createTimeline = (data) => axios.post('/api/v1/timeline',data)

export const useCreateTimeline = () => useApiHandler(createTimeline)

//equivalent to export function useCreateTimeline(){
// return useApiHandler(createPortfolio)    
//}
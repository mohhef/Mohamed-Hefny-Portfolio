import useSWR from 'swr'
import { useState } from 'react'

const fetcher = (url) =>
    fetch(url).then(async res => {
        const result = await res.json();
        if (res.status !== 200) {
            return Promise.reject(result)
        } else {
            return result;
        }
    });

export const useGetPortfolio = () => {
    const { data, error, ...rest } = useSWR('/api/v1/portfolio', fetcher)
    return { data, error, loading: !data && !error, ...rest }
}

export const useGetPortfolioById = (id) => {
    const { data, error, ...rest } = useSWR(id ? `/api/v1/portfolio/${id}` : null, fetcher)
    return { data, error, loading: !data && !error, ...rest }
}


export function useApiHandler(apiCall) {
    const [reqState, setReqState] = useState({
        error: null,
        data: null,
        loading: false
    });

    const handler = async (...data) => {
        setReqState({ error: null, data: null, loading: true });
        try {
            const json = await apiCall(...data);
            setReqState({ error: null, data: json.data, loading: false });
        } catch (e) {
            console.log(e.response)
            debugger
            const message = (e.response && e.response.data) || 'Ooops, something went wrong...';
            setReqState({ error: message, data: null, loading: false });
        }
    }

    return [handler, { ...reqState }]
}

//when this function is called, it will returned an empty starredRepos initially, because useEffect is not called becauase the component is not mounted yet,
//after the component is mounted, the useEffect will be called and the  component will be updated
    // export const useGetData = (url) => {
    //     const [data, setData] = useState();
    //     const [error, setError] = useState();
    //     const [loading, setLoading] = useState(true);
    //     useEffect(() => {
    //         async function fetchData() {
    //             const res = await fetch(url);
    //             const result = await res.json();

    //             if (res.status !== 200) {
    //                 setError(result)
    //             } else {
    //                 setData(result);
    //             }
    //             setLoading(false);
    //         }
    //         url && fetchData();
    //     }, [url])
    //     //returns as an object {}
    //     return { data, error, loading }
    // }

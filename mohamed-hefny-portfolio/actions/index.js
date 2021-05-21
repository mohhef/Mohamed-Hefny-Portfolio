import { useEffect, useState } from 'react';


//when this function is called, it will returned an empty starredRepos initially, because useEffect is not called becauase the component is not mounted yet,
//after the component is mounted, the useEffect will be called and the  component will be updated
export const useGetStarredRepos = () => {
    const [starredRepos, setStarredRepos] = useState([]);
    const [error, setError] = useState();
    useEffect(() => {
        async function getStarredRepos() {
            const res = await fetch('/api/v1/starredRepo');
            const result = await res.json();

            if (res.status !== 200) {
                setError(result)
            } else {
                setStarredRepos(result);
            }
        }
        getStarredRepos();
    }, [])
    //returns as an object {}
    return { starredRepos, error }
}

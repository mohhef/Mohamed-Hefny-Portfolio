import {useEffect} from 'react';
import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import axios from "axios"
import Link from "next/link"
import { render } from "react-dom"


useEffect(()=>{
    async function getPosts(){
        const res = await fetch('/api/v1/posts');
        const data = await res.json;
        debugger
    }
    getPosts();
}, [])
const Portfolios = ({ starredRepos }) => {

    const renderStarrredRepos = () => {
        return starredRepos.map(starredRepos =>
            <li key={starredRepos.repo.id}>
                <Link href={`/portfolios/${starredRepos.repo.id}`}>
                    {starredRepos.repo.name}
                </Link>
            </li>)
    }
    return (
        <BaseLayout>
            <BasePage>
                <h1>I am portfolios page</h1>
                <ul>
                    {renderStarrredRepos()}
                </ul>
            </BasePage>
        </BaseLayout>
    )
}

Portfolios.getInitialProps = async () => {
    let starredRepos = [];
    try {
        const githubUrl = "https://api.github.com/users/mohhef/starred"
        const res = await axios.get(githubUrl,
            {
                headers: {
                    Accept: "application/vnd.github.v3.star+json"
                }
            });
        starredRepos = res.data;
    } catch (e) {
        console.error(e)
    }
    return { starredRepos: starredRepos };
}

export default Portfolios;

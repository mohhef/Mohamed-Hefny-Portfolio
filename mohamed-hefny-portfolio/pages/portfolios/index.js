import BaseLayout from "../../components/layouts/BaseLayout"
import axios from "axios"
import Link from "next/link"
import { render } from "react-dom"

const Portfolios = ({ starredRepos }) => {

    const renderStarrredRepos = () => {
        return starredRepos.map(starredRepos => 
        <li key={starredRepos.repo.id}>
            <Link href = {`/portfolios/${starredRepos.repo.id}`}>
            {starredRepos.repo.name}
            </Link>
        </li>)
    }
    console.log(starredRepos);
    return (
        <BaseLayout>
            <h1>I am portfolios page</h1>
            <ul>
                {renderStarrredRepos()}
            </ul>
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

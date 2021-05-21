import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import Link from "next/link"
import { useGetStarredRepos } from "@/actions";

const Portfolios = () => {

    const { starredRepos, error, loading } = useGetStarredRepos();

    const renderStarrredRepos = () => {
        return starredRepos.map(starredRepo =>
            <li key={starredRepo.id}>
                <Link href={`/portfolios/${starredRepo.id}`}>
                    {starredRepo.name}
                </Link>
            </li>)
    }
    return (
        <BaseLayout>
            <BasePage>
                <h1>I am portfolios page</h1>
                {
                    loading &&
                    <p>Loading data...</p>
                }
                {
                    starredRepos &&
                    <ul>
                        {renderStarrredRepos()}
                    </ul>
                }
                {
                    error &&
                    <div className="alert alert-danger">{error.message}</div>
                }

            </BasePage>
        </BaseLayout>
    )
}

export default Portfolios;

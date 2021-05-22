import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import Link from "next/link"
import { useGetPosts } from "@/actions";
import { useUser } from '@auth0/nextjs-auth0';


const Portfolios = () => {
    const { data, error, loading } = useGetPosts();
    const { user, isLoading } = useUser();

    const renderStarrredRepos = () => {
        return data.map(starredRepo =>
            <li key={starredRepo.id}>
                <Link href={`/portfolios/${starredRepo.id}`}>
                    {starredRepo.name}
                </Link>
            </li>)
    }
    return (
        <BaseLayout  user = {user} isLoading = {isLoading}>
            <BasePage>
                <h1>I am portfolios page</h1>
                {
                    loading &&
                    <p>Loading data...</p>
                }
                {
                    data &&
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

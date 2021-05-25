import BaseLayout from "@/components/layouts/BaseLayout";
import BasePage from "@/components/BasePage"
import { useGetPostsById } from "@/actions";
import { useRouter } from "next/router"
import { useUser } from '@auth0/nextjs-auth0';


const Portfolio = () => {
    const router = useRouter();
    const { data: repo, error, loading } = useGetPortfolioById(router.query.id);
    const { user, isLoading } = useUser();
    return (
        <BaseLayout  user = {user} isLoading = {isLoading}>
            <BasePage>
                {
                    loading && <p>Loading Data</p>
                }
                {error &&   
                    <div className="alert alert-danger">{error.message}</div>
                }
                {repo &&
                    <>
                        <h1>{repo.name}</h1>
                        <h2>{repo.description}</h2>
                    </>
                }
            </BasePage>

        </BaseLayout>
    )
}
export default Portfolio;
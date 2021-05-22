import BaseLayout from "@/components/layouts/BaseLayout";
import BasePage from "@/components/BasePage"
import { useGetPostsById } from "@/actions";
import { useRouter } from "next/router"


const Portfolio = () => {
    const router = useRouter();
    const { data: repo, error, loading } = useGetPostsById(router.query.id);
    debugger
    return (
        <BaseLayout>
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
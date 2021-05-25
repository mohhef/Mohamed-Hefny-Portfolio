import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import Link from "next/link"
import { useGetPortfolio } from "@/actions";
import { useUser } from '@auth0/nextjs-auth0';


const Portfolio = () => {
    const { data, error, loading } = useGetPortfolio();
    const { user, isLoading } = useUser();

    const renderPortfolio = () => {
        return data.map(portfolio =>
            <li key={portfolio.id}>
                <Link href={`/portfolio/${portfolio.id}`}>
                    {portfolio.name}
                </Link>
            </li>)
    }
    return (
        <BaseLayout  user = {user} isLoading = {isLoading}>
            <BasePage>
                <h1>Portfolio</h1>
                {
                    loading &&
                    <p>Loading data...</p>
                }
                {
                    data &&
                    <ul>
                        {renderPortfolio()}
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

export default Portfolio;

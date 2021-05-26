import BaseLayout from "@/components/layouts/BaseLayout"
import BasePage from "@/components/BasePage"
import { useGetPortfolio } from "@/actions";
import { useUser } from '@auth0/nextjs-auth0';
import { Row, Col } from 'reactstrap';
import PortfolioCard from '@/components/PortfolioCard'

const Portfolio = () => {
    const { data, error, loading } = useGetPortfolio();
    const { user, isLoading } = useUser();

    return (
        <BaseLayout user={user} isLoading={isLoading}>
            <BasePage header ="Portfolios" className="portfolio-page">
                {
                    loading && <p>Loading data...</p>
                }
                <Row>
                    {data &&
                        data.map(portfolio =>
                            <Col key={portfolio.id} md="4">
                                <PortfolioCard portfolio={portfolio} />
                            </Col>

                        )
                    }
                </Row>
            </BasePage>
        </BaseLayout >
    )
}

export default Portfolio;

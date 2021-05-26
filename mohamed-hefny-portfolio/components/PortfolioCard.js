import { Card, CardHeader, CardBody, CardText, CardTitle } from 'reactstrap';

const PortfolioCard = ({ portfolio }) => {
    return (
        <a href={portfolio.html_url}>
            <Card className="portfolio-card" >
                <CardHeader className="portfolio-card-header">{portfolio.name}</CardHeader>
                <CardBody>
                    <CardTitle className="portfolio-card-title">{portfolio.name}</CardTitle>
                    <CardText className="portfolio-card-text">{portfolio.description}</CardText>
                </CardBody>
            </Card>
        </a>
    )
}

export default PortfolioCard;
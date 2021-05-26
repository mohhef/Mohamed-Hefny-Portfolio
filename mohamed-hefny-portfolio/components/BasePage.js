import { Container } from "reactstrap"
import {
    VerticalTimeline,
    VerticalTimelineElement
} from "react-vertical-timeline-component"
import 'react-vertical-timeline-component/style.min.css';

const BasePage = props => {
    const { className = "", header, children } = props;
    return (
        <div className={`base-page ${className}`}>
            <Container>
                {
                    header &&
                    <div className="page-header">
                        <h1 className="page-header-title">{header}</h1>
                    </div>
                }
                {children}
            </Container>
        </div>
    )

}
export default BasePage;
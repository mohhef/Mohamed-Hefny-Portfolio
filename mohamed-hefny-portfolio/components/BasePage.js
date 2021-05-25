import {Container} from "reactstrap"
import {
    VerticalTimeline,
    VerticalTimelineElement
} from "react-vertical-timeline-component"
import 'react-vertical-timeline-component/style.min.css';

const BasePage = props =>{
    const {className="", children} = props;
    return(
        <div className = {`base-page ${props.className}`}>
            <Container>
                {props.children}
            </Container>
        </div>
    )

}
export default BasePage;
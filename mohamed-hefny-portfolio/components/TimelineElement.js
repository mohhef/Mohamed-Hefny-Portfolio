import icon from "./icon"
import { Row, Col } from 'reactstrap'
import {
    VerticalTimeline, VerticalTimelineElement
} from "react-vertical-timeline-component"
import {timelineElementClick} from "@/utils/timeline"

const TimelineElement = ({ timeline, user, children }) => {
    const icons = icon;
    return (
        <div>
            <VerticalTimeline >
                {timeline.map((element, key) => {
                    const IconComp = icons[element?.type]?.iconName
                    const endDate = element.endDate ? element.endDate : "current"
                    const date = element.startDate + "-" + endDate
                    return (
                        <VerticalTimelineElement
                            onTimelineElementClick={user && timelineElementClick(user, element._id, element.website)}
                            key={element._id}
                            dateClassName="date"
                            date={date}
                            icon={IconComp ? <IconComp /> : null}
                            iconStyle={icons[element?.type]?.style}
                        >
                            <Row>
                                <Col xs="8" className="vertical-timeline-element-title">
                                    {element.title}
                                </Col>
                                <Col xs="4" className="vertical-timeline-element-company">
                                    {element.company}
                                </Col>
                            </Row>
                            <h6 xs="6" className="vertical-timeline-element-location">
                                {element.location}
                            </h6>
                            <p id="description">{element.description}</p>
                            {children}
                        </VerticalTimelineElement>
                    )
                })
                }
            </VerticalTimeline>
        </div >
    )
}

export default TimelineElement;
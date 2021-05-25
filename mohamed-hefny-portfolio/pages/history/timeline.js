import { data } from "@/data.js"
import { icon } from "./icon"
import {
    VerticalTimeline, VerticalTimelineElement
} from "react-vertical-timeline-component"
import 'react-vertical-timeline-component/style.min.css';

const Timeline = () => {
    const icons = icon;
    return (
        <VerticalTimeline>
            {data.map((element, key) => {
                const IconComp = icons[element.type].iconName
                return (
                    <VerticalTimelineElement
                        key={key}
                        dateClassName="date"
                        icon={<IconComp />}
                        iconStyle={icons[element.type].style}
                    >
                        <h3 className="vertical-timeline-element-title">
                            {element.title}
                        </h3>
                        <h5 className="vertical-timeline-element-subtitle">
                            {element.location}
                        </h5>
                        <p id="description">{element.description}</p>
                        <a className={'timeline-button'}
                            href = "/"
                        />
                    </VerticalTimelineElement>
                )
            })
            }
        </VerticalTimeline>
    )
}

export default Timeline;
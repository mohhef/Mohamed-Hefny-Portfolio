import { data } from "@/data.js"
import { icon } from "./icon"
import {
    VerticalTimeline, VerticalTimelineElement
} from "react-vertical-timeline-component"
import 'react-vertical-timeline-component/style.min.css';
import styles from '@/styles/pages/history/timelineelement.module.scss'

const Timeline = ({ timeline }) => {
    const icons = icon;
    return (
        <div className={styles.localclass}>
            <VerticalTimeline>
                {timeline.map((element, key) => {
                    const IconComp = icons[element.type].iconName
                    return (
                        <VerticalTimelineElement
                            key={key}
                            dateClassName={styles.date}
                            date={element.date}
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
                            <a className={`button ${styles.timelinebutton}`}
                                href={element.website}
                            >
                                {element.buttonText}
                            </a>
                        </VerticalTimelineElement>
                    )
                })
                }
            </VerticalTimeline>
        </div>
    )
}

export default Timeline;
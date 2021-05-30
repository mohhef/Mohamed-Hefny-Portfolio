import BaseLayout from "@/components/layouts/BaseLayout"
import { useUser } from '@auth0/nextjs-auth0';
import { Button } from 'reactstrap'
import TimelineApi from '@/lib/api/timeline'
import { isAuthorized } from '@/utils/auth0'
import BasePage from "@/components/BasePage"
import TimelineElement from "../../components/TimelineElement"
import { VerticalTimeline } from "react-vertical-timeline-component"
import { useRouter } from "next/router"


const Timeline = ({ timeline }) => {
    const { user, isLoading } = useUser();
    const router = useRouter();
    debugger
    return (
        <BaseLayout user={user} isLoading={isLoading}>
            <BasePage header="Timeline" className="timeline-page">
                <VerticalTimeline >
                    {timeline.map(element => {
                        return (
                            <TimelineElement element={element} user={user} >
                                {
                                    user && isAuthorized(user, "admin") &&
                                    <>
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push('/timeline/[id]/edit', `/timeline/${element._id}/edit`)
                                            }}
                                            className="mr-2" color="warning">Edit</Button>
                                        <Button color="danger">Delete</Button>
                                    </>
                                }
                            </TimelineElement>
                        )
                    })}
                </VerticalTimeline >
            </BasePage>
        </BaseLayout >
    )

}

export async function getStaticProps() {
    const json = await new TimelineApi().getAll();
    const timeline = json.data;
    return {
        props: { timeline }
    }
}

export default Timeline;
import BaseLayout from "@/components/layouts/BaseLayout"
import { useUser } from '@auth0/nextjs-auth0';
import { Button } from 'reactstrap'
import TimelineApi from '@/lib/api/timeline'
import { isAuthorized } from '@/utils/auth0'
import BasePage from "@/components/BasePage"
import TimelineElement from "../../components/TimelineElement"
import { VerticalTimeline } from "react-vertical-timeline-component"
import { useDeleteTimeline } from '@/actions/timeline';
import { useRouter } from "next/router"
import { useState } from "react"

const Timeline = ({ timeline: initialTimeline }) => {
    const { user, isLoading } = useUser();
    const [deleteTimeline, { data, error }] = useDeleteTimeline();
    const router = useRouter();
    const [timeline, setTimeline] = useState(initialTimeline);
    const _deleteTimeline = async (e, timelineId) => {
        e.stopPropagation();
        const isConfirm = confirm("Are you sure you want to delete this timeline");
        if (isConfirm) {
            await deleteTimeline(timelineId)
            setTimeline(timeline.filter((t) => t._id != timelineId));
        }
    }

    return (
        <BaseLayout user={user} isLoading={isLoading}>
            <BasePage title = "My Timeline" header="Timeline" className="timeline-page">
                <VerticalTimeline >
                    {timeline.map(element => {
                        return (
                            <TimelineElement element={element} user={user} key={element._id}>
                                {
                                    user && isAuthorized(user, "admin") &&
                                    <>
                                        <Button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push('/timeline/[id]/edit', `/timeline/${element._id}/edit`)
                                            }}
                                            className="mr-2" color="warning">Edit</Button>
                                        <Button
                                            onClick={(e) => _deleteTimeline(e, element._id)}
                                            color="danger">Delete</Button>
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
        props: { timeline },
        revalidate: 10, // In seconds
    }
}

export default Timeline;